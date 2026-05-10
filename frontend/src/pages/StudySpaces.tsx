import { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import StudentHeader from "../components/StudentHeader";
import Footer from "../components/Footer";
import FloorMap from "../components/FloorMap";
import { Modal, Form } from "react-bootstrap";
import { api } from "../api";
import { useLocation} from 'react-router-dom'; // added to read the navigation state and auto open the room from dashboard


/**
 * Types for the backend payload.
 * Keeping variable names literal (activeRooms, reservations, statuses)
 * to avoid mapping issues.
 */
type ActiveRoom = {
  id: number;
  room_name: string; // backend sends room_name that matches the strings used in FloorMap (e.g. "Room 2.111")
  capacity?: number;
  accessible?: boolean;
  has_whiteboard?: boolean;
  has_monitor?: boolean;
  has_power?: boolean;
  location_text?: string;
};


type StatusesResponse = {
  activeRooms: ActiveRoom[];
  reservations: Array<{
    id: number;
    room: number;
    start_time: string;
    end_time: string;
    status: string;
  }>;
  statuses: Record<string, string>; // { "Room 2.111": "occupied" | "available" }
};

// ===== UTRGV Library slot rules (Spring 2026) =====
const UTRGV_TIME_ZONE = "America/Chicago"; // Central Time
const SLOT_MINUTES = 30; // slots every 30 minutes

type LibraryHours = { open: string; close: string }; // HH:MM (24h)

// JS Date.getDay(): 0=Sun ... 6=Sat
const HOURS_BY_DOW: Record<number, LibraryHours> = {
  0: { open: "13:00", close: "22:00" }, // Sun 1:00 PM–10:00 PM
  1: { open: "07:30", close: "23:30" }, // Mon 7:30 AM–11:30 PM
  2: { open: "07:30", close: "23:30" }, // Tue
  3: { open: "07:30", close: "23:30" }, // Wed
  4: { open: "07:30", close: "23:30" }, // Thu
  5: { open: "07:30", close: "18:00" }, // Fri 7:30 AM–6:00 PM
  6: { open: "10:00", close: "19:00" }, // Sat 10:00 AM–7:00 PM
};

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function format12Hour(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Returns YYYY-MM-DD for "today" in a specific IANA timezone.
 */
function todayInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Build start & end time options for a given date string (YYYY-MM-DD),
 * respecting UTRGV hours for that day-of-week.
 *
 * Values returned are HH:MM (24h). You display them using format12Hour().
 */
// function buildTimeOptionsForDate(dateYYYYMMDD: string): { startTimes: string[]; endTimes: string[] } {
//   if (!dateYYYYMMDD) return { startTimes: [], endTimes: [] };

//   const dow = new Date(`${dateYYYYMMDD}T00:00:00`).getDay();
//   const hours = HOURS_BY_DOW[dow];
//   const openM = hhmmToMinutes(hours.open);
//   const closeM = hhmmToMinutes(hours.close);

//   const startTimes: string[] = [];
//   const endTimes: string[] = [];

//   // Start times: from open up to close - slot
//   for (let t = openM; t <= closeM - SLOT_MINUTES; t += SLOT_MINUTES) {
//     startTimes.push(minutesToHHMM(t));
//   }

//   // End times: from open + slot to close
//   for (let t = openM + SLOT_MINUTES; t <= closeM; t += SLOT_MINUTES) {
//     endTimes.push(minutesToHHMM(t));
//   }

//   return { startTimes, endTimes };
// }

function buildTimeOptionsForDate(
  dateYYYYMMDD: string,
  nowCentral?: Date  // optional: pass in current time for today-filtering
): { startTimes: string[]; endTimes: string[] } {
  if (!dateYYYYMMDD) return { startTimes: [], endTimes: [] };

  // new: if the selected date is fully in the past, return no times at all
  // -> compare calendar dates only (strip time) so yesertday retuns emprt regardless of what time it currently is
  const todayStr = todayInTimeZone(UTRGV_TIME_ZONE);
  if (dateYYYYMMDD < todayStr) {
    return { startTimes: [], endTimes: [] };
  }

  const dow = new Date(`${dateYYYYMMDD}T00:00:00`).getDay();
  const hours = HOURS_BY_DOW[dow];
  const openM = hhmmToMinutes(hours.open);
  const closeM = hhmmToMinutes(hours.close);

  // check if selected date is today in Central Time
  const isToday = dateYYYYMMDD === todayStr; 

  // if today, calculate the minimum start time (now + 30 mins) in Central Time minutes
  let minStartM = openM;
  if (isToday && nowCentral) {
    const currentMinutes = nowCentral.getHours() * 60 + nowCentral.getMinutes();
    const bufferMinutes = currentMinutes + SLOT_MINUTES; // now + 30 mins

    // round UP to the next 30-min slot
    // e.g. 3:10 PM + 30 min = 3:40 PM → rounds up to 4:00 PM
    const nextSlot = Math.ceil(bufferMinutes / SLOT_MINUTES) * SLOT_MINUTES;
    minStartM = Math.max(openM, nextSlot);
  }

  const startTimes: string[] = [];
  const endTimes: string[] = [];

  // start times: filtered by minStartM when today
  for (let t = openM; t <= closeM - SLOT_MINUTES; t += SLOT_MINUTES) {
    if (t >= minStartM) {
      startTimes.push(minutesToHHMM(t));
    }
  }

  // end times: always from open + slot (endTimeOptions useMemo filters by startTime anyway)
  for (let t = openM + SLOT_MINUTES; t <= closeM; t += SLOT_MINUTES) {
    endTimes.push(minutesToHHMM(t));
  }

  return { startTimes, endTimes };
}


// updated function after testing out website
// function creates a 'bridge' between the time a student sees and what the server needs (UTC)
function zonedDateTimeToDate(dateYYYYMMDD: string, timeHHMM: string, timeZone: string): Date {
  // 1. create a "wall time" string: "2026-03-10T07:30:00"
  // combine the date and time into a ISO string (doesn't have a timezone attachted yet)
  const dateTimeString = `${dateYYYYMMDD}T${timeHHMM}:00`;

  // 2. use Intl.DateTimeFormat to figure out the UTC string for that local time in Chicago
  // create a temporary date object from the above string
  // browser will initally assume this is in the student's local time
  const tempDate = new Date(dateTimeString);
  
  // need to return a Date object that, when .toISOString() is called, represents the correct UTC moment.
  // use the "hack" of locales to force the browser to treat our input as Chicago time.
  // tempDate.toLocaleString => asks the browser what would the time be in chicago
  // calculate the diff (offset) btween the user's local clock and chicago clock
  const locativeString = tempDate.toLocaleString("en-US", { timeZone });
  const diff = tempDate.getTime() - new Date(locativeString).getTime();
  
  // apply that difference to the original timestamp
  // when .toISOString()' is called on this returned date, it will perfectly match the utc time for utrgv campus, regardless of where the user is
  return new Date(tempDate.getTime() + diff);
}

// function split dates into parts (year, month, day) and rebuild them using date.utc -> can cause faultiness
/**
 * Convert "date + time interpreted in America/Chicago" into a real Date.
 * This avoids using the user's local timezone (important!).
 */
// function zonedDateTimeToDate(dateMMDDYYYY: string, timeHHMM: string, timeZone: string): Date {  // Build a naive ISO string
//   const [mo, d, y] = dateMMDDYYYY.split("-").map(Number);  const [hh, mm] = timeHHMM.split(":").map(Number);
//   // Create a Date as if it's UTC first
//   const utcGuess = new Date(Date.UTC(mo - 1, d, y, hh, mm, 0));

//   // Find the timezone offset at that moment in the target timezone:
//   const parts = new Intl.DateTimeFormat("en-US", {
//     timeZone,
//     hour12: false,
//     month: "2-digit",
//     day: "2-digit",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//   }).formatToParts(utcGuess);

//   const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

//   // The "wall time" in target TZ corresponding to utcGuess:
//   const tzY = get("year");
//   const tzMo = get("month");
//   const tzD = get("day");
//   const tzH = get("hour");
//   const tzMi = get("minute");
//   const tzS = get("second");

//   // If utcGuess renders as tzY/tzMo/tzD tzH:tzMi in that TZ, compute what UTC would be
//   // for the intended wall time (y/mo/d hh:mm), then shift.
//   const wallAsUTC = Date.UTC( mo - 1, d, y, hh, mm, 0);
//   const renderedAsUTC = Date.UTC(tzMo - 1, tzD, tzY, tzH, tzMi, tzS);

//   const offsetMs = renderedAsUTC - utcGuess.getTime();
//   return new Date(wallAsUTC - offsetMs);
// }

function formatDateMMDDYYYY(dateYYYYMMDD: string): string {
  // ensures this matches the YYYY-MM-DD format coming from the state
  const [y, m, d] = dateYYYYMMDD.split("-").map(Number);
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
}


/*
 added: build 7 date options starting from the most recent or upcoming Sunday

 function: generates an array of 7 consective dates starting from recent sunday => used to show the weekly reservation window for students
*/
function buildDateOptionsWeekly(timeZone: string): string[] {
  const today = new Date(`${todayInTimeZone(timeZone)}T00:00:00`); //get today's date in target timezone
  const dayOfWeek = today.getDay(); // determine day of the week for today (JS: 0=sunday, 1=monday...6=saturday)

  // // find upcoming Sunday (or today if it's Sunday)
  // const daysUntilSunday = (7 - dayOfWeek) % 7; // calculate how many days until next sunday
  // const start = new Date(today); // compute the date of the upcoming sunday (or current)
  // start.setDate(today.getDate() + daysUntilSunday);

  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek);
  
  const out: string[] = []; // initialize array to hold the 7 date options
  for (let i = 0; i < 7; i++) { // loops 7 times to generation 7consective dates starting from sunday
    const d = new Date(start); // add i days to the sunday date to get the current option
    d.setDate(start.getDate() + i);
    const y = d.getFullYear(); // start extracting year then month then day
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`); // push formatted string into array
  }

  return out; // return the array of 7 date strings
}


const StudySpaces = () => {
  const [selectedFloor, setSelectedFloor] = useState(2);

  // live backend data
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  // Booking modal
  const [showModal, setShowModal] = useState(false);

  // CCTB: add resourceType to bookingData state
  const [bookingData, setBookingData] = useState({
    resource: "", // room name string, e.g. "Room 2.111"
    date: "",
    startTime: "",
    endTime: "",
    resourceType: "room" as "room" | "computer", // tracks whether a room or computer was clied
  });

  // CCTB: added a separate modal visibility flag for computers
  // this controls the computer booking modal separetely from the room modal
  // rooms use showModal , computers use showComputerModal
  const [showComputerModal, setShowComputerModal] = useState(false);

  // added a state variable for success message when booking
  const [showBookingSuccess, setShowBookingSuccess] = useState<string | null>(null);

  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // new state declarations for the improved ui
  const [showRoomDetail, setShowRoomDetail] = useState(false); // room detail panel
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<any>(null);

  const [activePolicyTab, setActivePolicyTab] = useState("bookings"); // policy tabs


  // added for the notifications
  const [showWaitlistFromError, setShowWaitlistFromError] = useState(false);

  // added to track when the conflict is a waitlist hold 
  // different from above state (which fires on any overlap)
  // this state fires only when the be returns code: "waitlist_hold", meaning a priority user already has a hold on this window
  const [showWaitlistHoldConflict, setShowWaitlistHoldConflict] = useState(false);
  const [waitlistHoldMessage, setWaitlistHoldMessage] = useState<string>("");

  // added the state to track the waitlist actions 
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);

  // state for waitlist rules modal
  const [showWaitlistRules, setShowWaitlistRules] = useState(false);

  // added state for room modal
  const [locationStateConsumed, setLocationStateConsumed] = useState(false);

  // added state for booked windows to color the dropdown
  const [bookedWindows, setBookedWindows] = useState<{ start: string; end: string }[]>([]);
  const [heldWindows, setHeldWindows] = useState<{ start: string; end: string; reserved_for_me: boolean }[]>([]);
  const [waitlistedWindows, setWaitlistedWindows] = useState<{ 
    start: string; 
    end: string; 
    reserved_for_me: boolean 
  }[]>([]);

  /* added this function to join waitlist
   entry point 1) room is currently occupied 
   when a student clicks a red room on the floor map, the modal opens and checks statuses[bookingData.resource] === "occupied"
   if true, the "Notify Me When Available" button appears at the bottom of the moda
   clicking it calls joinWaitlist(), which POSTs to /waitlist/join/ with the room's ID
   the room ID is looked up using roomNameToId, which is a useMemo map built from the activeRooms array returned by the backend 
   — it maps room names like "Room 2.111" to their numeric database ids */
  // const joinWaitlist = async () => {
  //   setWaitlistMessage(null);
  //   setWaitlistLoading(true);

  //   const roomId = roomNameToId.get(bookingData.resource);
  //   if (!roomId) {
  //     setWaitlistMessage("Room not recognized by backend.");
  //     setWaitlistLoading(false);
  //     return;
  //   }

  //   try {
  //     await api.post("/waitlist/join/", { room_id: roomId, room_start_time: bookingData.startTime, room_date: bookingData.date, }); // added the room_start_time
  //     setWaitlistMessage(`You’ve been added to the waitlist for ${bookingData.resource}.`);
  //   } catch (err: any) {
  //     console.log("Waitlist error full:", err?.response); 
  //     // entry point 2) time slot conflict -> when a student tries to book a room for a time that overlaps an existing reservation, the backend's ReservationSerializer.validate() catches it and returns a 400 error with the message "This room is already reserved for that time range
  //     // the fe's confirmBooking function catches this error, checks if the message includes "already reserved", and if so sets showWaitlistFromError to true
  //     // this causes the "Notify Me When This Time Becomes Available" button to appear inside the red error alert, giving the student a direct path to the waitlist from the failure message
  //     const msg =
  //       err?.response?.data?.detail ||
  //       err?.response?.data?.non_field_errors?.[0] ||
  //       err?.response?.data?.error ||   
  //       err?.response?.data?.message || 
  //       "Failed to join waitlist.";
  //     setWaitlistMessage(msg); // tracks the result 
  //   } finally {
  //     setWaitlistLoading(false);
  //   }
  // };

  const joinWaitlist = async () => {
    setWaitlistMessage(null);
    setWaitlistLoading(true);

    const roomId = roomNameToId.get(bookingData.resource);
    if (!roomId) {
      setWaitlistMessage("Room not recognized by backend.");
      setWaitlistLoading(false);
      return;
    }

    // Convert HH:MM + date into a full ISO datetime string in Central Time
    // same conversion used in confirmBooking so the backend gets a parseable datetime
    const startISO = bookingData.date && bookingData.startTime
      ? zonedDateTimeToDate(bookingData.date, bookingData.startTime, UTRGV_TIME_ZONE).toISOString()
      : null;

    const endISO = bookingData.date && bookingData.endTime
      ? zonedDateTimeToDate(bookingData.date, bookingData.endTime, UTRGV_TIME_ZONE).toISOString()
      : null;
    
    try {
      await api.post("/waitlist/join/", { 
        room_id: roomId, 
        room_start_time: startISO,  // full ISO string instead of bare "HH:MM"
        room_end_time: endISO, // added
      });
      setWaitlistMessage(`You've been added to the waitlist for ${bookingData.resource}.`);
    } catch (err: any) {
      console.log("Waitlist error full:", err?.response); 
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.error ||   
        err?.response?.data?.message || 
        "Failed to join waitlist.";
      setWaitlistMessage(msg);
    } finally {
      setWaitlistLoading(false);
    }
  };

  /**
   * Build a quick lookup map so we can convert room name -> room id
   * when POSTing to /reservations/.
   */
  const roomNameToId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of activeRooms) map.set(r.room_name, r.id);
    return map;
  }, [activeRooms]);

  const dateOptions = useMemo(() => buildDateOptionsWeekly(UTRGV_TIME_ZONE), []);
  const timeOptions = useMemo(() => {
    // get current moment converted to Central Time hours/minutes
      const nowUTC = new Date();
      const centralString = nowUTC.toLocaleString("en-US", { timeZone: UTRGV_TIME_ZONE });
      const nowCentral = new Date(centralString); // local Date object with CT hours/minutes

      return buildTimeOptionsForDate(bookingData.date, nowCentral);
  }, [bookingData.date]);

  const endTimeOptions = useMemo(() => {
    if (!bookingData.startTime) return timeOptions.endTimes;
    const startM = hhmmToMinutes(bookingData.startTime);

    // added: cap end time at 3 hours after start (modify to another number if needed)
    const MAX_BOOKING_MINUTES = 180; // 3hours
    const latestEndM = startM + MAX_BOOKING_MINUTES;

    return timeOptions.endTimes.filter((t) => hhmmToMinutes(t) > startM && hhmmToMinutes(t) <= latestEndM);
  }, [bookingData.startTime, timeOptions.endTimes]);


  const fetchRoomSchedule = async (roomId: number, date: string) => {
    try {
      const resp = await api.get(`/studyspaces/${roomId}/schedule/`, {
        params: { date },
      });
      setBookedWindows(resp.data.booked ?? []);
      setHeldWindows(resp.data.held ?? []);
      setWaitlistedWindows(resp.data.waitlisted ?? []);
    } catch {
      setBookedWindows([]);
      setHeldWindows([]);
      setWaitlistedWindows([]);
    }
  };

  /**
   * Fetch live statuses from backend:
   * GET /studyspaces/statuses/
   *
   * Note:
   * - This endpoint requires Authorization header.
   * - api.ts interceptor automatically attaches Bearer token.
   */
  const fetchStatuses = async () => {
    setLoadingStatuses(true);
    try {
      const resp = await api.get<StatusesResponse>("/studyspaces/statuses/");
      setActiveRooms(resp.data.activeRooms);
      setStatuses(resp.data.statuses);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Failed to load study space statuses", err);

      // If token is missing/expired, backend returns 401
      if (err?.response?.status === 401) {
        setStatuses({});
        setActiveRooms([]);
        // You could navigate("/login") here if you want forced login.
      }
    } finally {
      setLoadingStatuses(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // added so that it fires whenenever the selected room or date changes to fetch that room's scheldue
  useEffect(() => {
    if (!bookingData.resource || !bookingData.date) return;
    const roomId = roomNameToId.get(bookingData.resource);
    if (!roomId) return;
    fetchRoomSchedule(roomId, bookingData.date);
  }, [bookingData.resource, bookingData.date, roomNameToId]);

  // helper function: checks if it is given HH:MM slot overlaps any booked window
  const isTimeBooked = (hhmm: string, type: "start" | "end"): boolean => {
    if (!bookingData.date) return false;
    const slotDate = zonedDateTimeToDate(bookingData.date, hhmm, UTRGV_TIME_ZONE);

    const blockedHolds = heldWindows.filter((w) => !w.reserved_for_me);
    const blockedWaitlisted = waitlistedWindows.filter((w) => !w.reserved_for_me);

    const allBlockedWindows = [...bookedWindows, ...blockedHolds, ...blockedWaitlisted];

    return allBlockedWindows.some((w) => {
      const wStart = new Date(w.start);
      const wEnd = new Date(w.end);
      if (type === "start") {
        return slotDate >= wStart && slotDate < wEnd;
      } else {
        if (!bookingData.startTime) return false;
        const selectedStart = zonedDateTimeToDate(
          bookingData.date,
          bookingData.startTime,
          UTRGV_TIME_ZONE
        );
        // end time is red only if a blocked window starts AFTER the selected start
        // and BEFORE the selected end, meaning it cuts into the booking window
        return wStart >= selectedStart && wStart < slotDate;
      }
    });
  };

  const location = useLocation(); 
  
  useEffect(() => {
    if (locationStateConsumed) return; // already handled, don't re-open
    
    const state = location.state as { openRoomId?: number; openRoomName?: string } | null;
    if (!state?.openRoomId || !state?.openRoomName) return;

    // wait for activeRooms to load before trying to open the modal
    if (activeRooms.length === 0) return;

    const found = activeRooms.find(r => r.id === state.openRoomId);
    setSelectedRoomDetail(found ?? { id: state.openRoomId, room_name: state.openRoomName });
    setBookingData(prev => ({
      ...prev,
      resource: state.openRoomName!,
      date: todayInTimeZone(UTRGV_TIME_ZONE),
      startTime: '',
      endTime: '',
      resourceType: 'room',
    }));
    setShowRoomDetail(true);
    setLocationStateConsumed(true); // mark as consumed so it never fires again

    window.history.replaceState({}, '');
  }, [location.state, activeRooms, locationStateConsumed]);

  /**
   * When a room hotspot is clicked:
   * - open booking modal
   * - prefill resource with room name
   */
  // CCTB: updated to accept resourceType and branch accordingly 
  // and also so that rooms open the detail panel instead of going straight to the booking modal
  const handleRoomClick = (roomName: string, resourceType: "room" | "computer") => {
    setBookingError(null);
    setBookedWindows([]); //added
    setHeldWindows([]);       // added
    setWaitlistedWindows([]); // added

    const today = todayInTimeZone(UTRGV_TIME_ZONE);

    setBookingData((prev) => ({
      ...prev,
      resource: roomName,
      date: today,       // default to today automatically
      startTime: "",
      endTime: "",
      resourceType, // store what type was clicked so modals and confirmBooking can use it
    }));

    // CCTB: open a different modal depending on what was clicked
    if (resourceType === "computer") {
        setShowComputerModal(true); // open the simpler computer modal
    } else {
        // new: show detail panel first — user clicks "Continue to Booking" to open the modal
        const found = activeRooms.find(r => r.room_name === roomName) as any;
        setSelectedRoomDetail(found ?? { id: 0, room_name: roomName });
        setShowRoomDetail(true);  // ← detail modal first
      }
  };
  
  
  /**
   * Creates a reservation in the backend:
   * POST /reservations/
   * Body (matches Reservation model):
   *   { room: <roomId>, start_time: <ISO>, end_time: <ISO> }
   *
   * Then refresh statuses so map updates live.
   */
  const confirmBooking = async () => {
    setBookingError(null);
    setShowWaitlistFromError(false);  // resets on each attempt

    const roomId = roomNameToId.get(bookingData.resource);
    if (!roomId) {
      setBookingError("This room is not recognized by the backend. Check seed data / room names.");
      return;
    }

    if (!bookingData.date || !bookingData.startTime || !bookingData.endTime) {
      setBookingError("Please select date, start time, and end time.");
      return;
    }

    // Build ISO timestamps in Central Time (America/Chicago
    const startISO = zonedDateTimeToDate(bookingData.date, bookingData.startTime, UTRGV_TIME_ZONE).toISOString();
    const endISO = zonedDateTimeToDate(bookingData.date, bookingData.endTime, UTRGV_TIME_ZONE).toISOString();

    setBookingLoading(true);

    try {
      await api.post("/reservations/", {
        room: roomId,
        start_time: startISO,
        end_time: endISO,
      });

      setShowModal(false);
      setShowRoomDetail(false);
      setShowWaitlistFromError(false);
      // Refresh live statuses so the map changes color
      await fetchStatuses();

      setShowBookingSuccess(bookingData.resource);
    } catch (err: any) {
        console.error("Booking failed", err);
        console.error("Full error response:", JSON.stringify(err?.response?.data, null, 2));


      // check for waitlist_hold code before the generic overlap
      // be send non field errors as either string or an object
      // with {code,message} when it's a hold conflict
      const nonFieldErrors = err?.response?.data?.non_field_errors;
      const firstError = Array.isArray(nonFieldErrors) ? nonFieldErrors[0] : null;
  
      /* 
        detect waitlist_hold by pipe-prefix in the error string
        be raises validationerror so DFR wriaps it as non field errors
      */
      if (typeof firstError === "string" && firstError.startsWith("WAITLIST_HOLD|")) {
        const message = firstError.split("|")[1]; // extract everything after the pipe

        setWaitlistHoldMessage(message);
        setShowWaitlistHoldConflict(true); 
        setShowWaitlistFromError(true); // triggers the notify me button visibility

        setBookingError(null);
        setBookingLoading(false);
        return;
      }

      // Backend overlap validation returns a 400 with message string
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        JSON.stringify(err?.response?.data || {}) ||
        "Booking failed.";

      const errorStr = String(msg);
      console.log("errorStr:", errorStr);
      setBookingError(errorStr);

      // detect overlap error specifically → offer waitlist button
      if (errorStr.toLowerCase().includes("already reserved")) {
        setShowWaitlistFromError(true);
      } 
    } finally {
      setBookingLoading(false);
    }
  };

  // CCTB: adding a confirm computerbooking function (Simper version of confirmbooking)
  // handles booking for computers - same backend POST /reservations/ endpoint
  // but no waitlist logic, no hold conflicts, just a clean time slot reservation
  // computers can use room records with has_monitor = True in the backend
  const confirmComputerBooking = async () => {
    setBookingError(null);

    const roomId = roomNameToId.get(bookingData.resource);
    if (!roomId) {
        setBookingError("This computer is not recognized by the backend. Check seed data.");
        return;
    }

    if (!bookingData.date || !bookingData.startTime || !bookingData.endTime) {
        setBookingError("Please select date, start time, and end time.");
        return;
    }

    // new: same timezone conversion as rooms — backend always receives UTC ISO strings
    const startISO = zonedDateTimeToDate(bookingData.date, bookingData.startTime, UTRGV_TIME_ZONE).toISOString();
    const endISO = zonedDateTimeToDate(bookingData.date, bookingData.endTime, UTRGV_TIME_ZONE).toISOString();

    setBookingLoading(true);

    try {
        // new: same /reservations/ endpoint — backend differentiates by room.has_monitor=True
        await api.post("/reservations/", {
            room: roomId,
            start_time: startISO,
            end_time: endISO,
        });

        setShowComputerModal(false); // new: close computer modal on success
        await fetchStatuses();       // refresh map so hotspot turns red

        setShowBookingSuccess(bookingData.resource);
    } catch (err: any) {
        // new: surface any backend error (overlap, advance time rule, etc.)
        const msg =
            err?.response?.data?.detail ||
            err?.response?.data?.non_field_errors?.[0] ||
            "Booking failed. This computer may already be reserved for that time.";
        setBookingError(String(msg));
    } finally {
        setBookingLoading(false);
    }
};

  /**
   * The map itself still expects a statuses object keyed by room name.
   * pass backend statuses instead of local state.
   */
  
  // OLD UI 
//   return (
//     <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: "56px" }}>
//       <StudentHeader />

//       <main className="flex-grow-1">
//         <Container className="py-5">
//           <header className="mb-4 d-flex justify-content-between align-items-center">
//             <div>
//               <h1 className="fw-bold">Study Spaces</h1>
//               <p className="text-muted">
//                 Select a floor to view available rooms and computers.
//                 {loadingStatuses ? " (Loading live data…)" : ""}
//               </p>
//             </div>

//             <ButtonGroup>
//               <Button
//                 variant={selectedFloor === 2 ? "primary" : "outline-primary"}
//                 onClick={() => setSelectedFloor(2)}
//               >
//                 2nd Floor
//               </Button>
//               <Button
//                 variant={selectedFloor === 3 ? "primary" : "outline-primary"}
//                 onClick={() => setSelectedFloor(3)}
//               >
//                 3rd Floor
//               </Button>
//             </ButtonGroup>
//           </header>

//           <Row>
//             <Col lg={9}>
//               <FloorMap floor={selectedFloor} onRoomSelect={handleRoomClick} statuses={statuses} />
//             </Col>

//             <Col lg={3}>
//               <Card className="shadow-sm border-0">
//                 <Card.Header className="bg-white fw-bold">Map Legend</Card.Header>
            
//                 <Card.Body>
//                   <div className="mb-3 d-flex align-items-center">
//                     <span className="badge bg-success me-2">&nbsp;</span>
//                     <small>Available</small>
//                   </div>
//                   <div className="mb-3 d-flex align-items-center">
//                     <span className="badge bg-danger me-2">&nbsp;</span>
//                     <small>Occupied/Reserved</small>
//                   </div>
//                   <hr />
//                   <h6>Resources on Floor {selectedFloor}</h6>
//                   <ul className="list-unstyled small">
//                     <li>
//                       <i className="bi bi-door-closed me-2"></i> Study Rooms
//                     </li>
//                     {selectedFloor === 2 ? (
//                       <li className="mt-2 text-primary">
//                         <i className="bi bi-pc-display me-2"></i> Computers Available
//                       </li>
//                     ) : (
//                       <li className="mt-2 text-muted italic">
//                         <i className="bi bi-pc-display me-2"></i> No Computers on this floor
//                       </li>
//                     )}
//                   </ul>
//                 </Card.Body>
//               </Card>
//             </Col>
//           </Row>


//           {/* a new modal with the waitlist rules */}
//           <Modal
//             show={showWaitlistRules}
//             onHide={() => {
//               setShowWaitlistRules(false);
//               setWaitlistMessage(null);
//               // do NOT close showModal here — user should return to the booking form
//             }}
//             centered 
//           >
//             <Modal.Header
//               closeButton
//               className="border-0 pb-0"
//               style={{ backgroundColor: "#fffbf0" }}
//             >
//               <Modal.Title className="d-flex align-items-center gap-2">
//                 <i className="bi bi-bell-fill text-warning" />
//                 <span className="fw-bold" style={{ fontSize: "1.1rem" }}>
//                   Join the Waitlist for {bookingData.resource}
//                 </span>
//               </Modal.Title>
//             </Modal.Header>

//             <Modal.Body style={{ backgroundColor: "#fffbf0" }} className="px-4 pt-2 pb-3">
//               {/* status banner */}
//               <div
//                 className="d-flex align-items-center gap-2 rounded-3 px-3 py-2 mb-4"
//                 style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}
//               >
//                 <i className="bi bi-calendar-x text-danger fs-5" />
//                 <div>
//                   <strong className="small d-block" style={{ color: "#842029" }}>
//                     This room is currently reserved
//                   </strong>
//                   <span className="small" style={{ color: "#6c2b30" }}>
//                     The selected time window is unavailable right now.
//                   </span>
//                 </div>
//               </div>

//               {/* how it works */}
//               <p className="fw-semibold mb-2" style={{ color: "#5a4a00", fontSize: "0.9rem" }}>
//                 Here's how the waitlist works:
//               </p>

//               <div className="d-flex flex-column gap-2 mb-4">
//                 {[
//                   {
//                     icon: "bi-person-check",
//                     color: "#0d6efd",
//                     text: "You'll be added to the queue for this room.",
//                   },
//                   {
//                     icon: "bi-bell",
//                     color: "#e6a817",
//                     text: "If the room opens up, you'll get a notification in your dashboard.",
//                   },
//                   {
//                     icon: "bi-calendar2-check",
//                     color: "#198754",
//                     text: "You can then choose to book the room or decline — no pressure.",
//                   },
//                   {
//                     icon: "bi-clock-history",
//                     color: "#6c757d",
//                     text: "Notifications expire after a limited window, so act quickly when you receive one.",
//                   },
//                   {
//                     icon: "bi-x-circle",
//                     color: "#dc3545",
//                     text: "You can only be on the waitlist for one window per room at a time.",
//                   },
//                 ].map((item, idx) => (
//                   <div key={idx} className="d-flex align-items-start gap-3">
//                     <div
//                       className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
//                       style={{
//                         width: 32,
//                         height: 32,
//                         backgroundColor: `${item.color}18`,
//                       }}
//                     >
//                       <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: "0.85rem" }} />
//                     </div>
//                     <span className="small pt-1" style={{ color: "#444" }}>
//                       {item.text}
//                     </span>
//                   </div>
//                 ))}
//               </div>

//               {/* waitlist feedback */}
//               {waitlistMessage && (
//                 <div
//                   className={`small rounded-2 px-3 py-2 mb-3 ${
//                     waitlistMessage.startsWith("You've been")
//                       ? "text-success"
//                       : "text-danger"
//                   }`}
//                   style={{
//                     backgroundColor: waitlistMessage.startsWith("You've been")
//                       ? "#d1e7dd"
//                       : "#f8d7da",
//                   }}
//                 >
//                   <i
//                     className={`bi me-1 ${
//                       waitlistMessage.startsWith("You've been")
//                         ? "bi-check-circle"
//                         : "bi-exclamation-circle"
//                     }`}
//                   />
//                   {waitlistMessage}
//                 </div>
//               )}
//             </Modal.Body>

//             <Modal.Footer
//               className="border-0 pt-0 px-4 pb-4"
//               style={{ backgroundColor: "#fffbf0" }}
//             >
//               <Button
//                 variant="outline-secondary"
//                 className="rounded-pill px-4"
//                 onClick={() => {
//                   setShowWaitlistRules(false);
//                   setWaitlistMessage(null);
//                   // booking modal stays open — user can pick a different time
//                 }}
//               >
//                 Maybe Later
//               </Button>
//               <Button
//                 className="rounded-pill px-4 fw-semibold"
//                 style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
//                 onClick={async () => {
//                   await joinWaitlist();
//                   setTimeout(() => {
//                     setShowWaitlistRules(false);
//                     setWaitlistMessage(null);
//                     // also close the booking modal since they've joined — nothing left to do here
//                     setShowModal(false);
//                     setBookingData({ resource: bookingData.resource, date: "", startTime: "", endTime: "", resourceType: bookingData.resourceType });
//                   }, 1500);
//                 }}
//                 disabled={waitlistLoading || waitlistMessage?.startsWith("You've been")}
//               >
//                 {waitlistLoading ? (
//                   <>
//                     <i className="bi bi-hourglass-split me-2" />
//                     Adding to waitlist…
//                   </>
//                 ) : waitlistMessage?.startsWith("You've been") ? (
//                   <>
//                     <i className="bi bi-check-circle me-2" />
//                     You're on the waitlist!
//                   </>
//                 ) : (
//                   <>
//                     <i className="bi bi-bell-fill me-2" />
//                     Notify Me When Available
//                   </>
//                 )}
//               </Button>
//             </Modal.Footer>
//           </Modal>


//           {/* computer modal
//               simpler modal for computers (no waitlist, no hold conflitcs, just date + time selection and a cofirm button
//             ) */}
//           <Modal
//               show={showComputerModal}
//               onHide={() => {
//                   setShowComputerModal(false);
//                   setBookingError(null); // new: clear any error when dismissed
//               }}
//               centered
//           >
//               <Modal.Header closeButton>
//                   {/* new: title shows which computer was selected */}
//                   <Modal.Title>
//                       <i className="bi bi-pc-display me-2 text-primary" />
//                       Reserve {bookingData.resource}
//                   </Modal.Title>
//               </Modal.Header>

//               <Modal.Body>
//                   {/* new: show any booking error (overlap, advance time, etc.) */}
//                   {bookingError && (
//                       <div
//                           className="rounded-3 p-3 mb-3 d-flex align-items-start gap-2"
//                           style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}
//                       >
//                           <i className="bi bi-exclamation-circle-fill text-danger mt-1" />
//                           <div>
//                               <strong className="d-block small" style={{ color: "#842029" }}>
//                                   Time Unavailable
//                               </strong>
//                               <span className="small" style={{ color: "#6c2b30" }}>{bookingError}</span>
//                           </div>
//                       </div>
//                   )}

//                   <Form>
//                       {/* new: same date picker as rooms — weekly view starting from Sunday */}
//                       <Form.Group className="mb-3">
//                           <Form.Label>Reservation Date</Form.Label>
//                           <Form.Select
//                               value={bookingData.date}
//                               onChange={(e) =>
//                                   setBookingData({ ...bookingData, date: e.target.value, startTime: "", endTime: "" })
//                               }
//                           >
//                               {dateOptions.map((d, i) => (
//                                   <option key={d} value={d}>
//                                       {i === 0 ? `Starting Sunday: ${formatDateMMDDYYYY(d)}` : formatDateMMDDYYYY(d)}
//                                   </option>
//                               ))}
//                           </Form.Select>
//                           <div className="form-text">Times shown in Central Time (America/Chicago).</div>
//                       </Form.Group>

//                       <Row>
//                           <Col>
//                               {/* new: start time — reuses same timeOptions logic as rooms */}
//                               <Form.Group className="mb-3">
//                                   <Form.Label>Start Time</Form.Label>
//                                   <Form.Select
//                                       value={bookingData.startTime}
//                                       onChange={(e) =>
//                                           setBookingData({ ...bookingData, startTime: e.target.value, endTime: "" })
//                                       }
//                                       disabled={!bookingData.date}
//                                   >
//                                       <option value="">Select start…</option>
//                                       {timeOptions.startTimes.map((t) => (
//                                           <option key={t} value={t}>
//                                               {format12Hour(t)}
//                                           </option>
//                                       ))}
//                                   </Form.Select>
//                               </Form.Group>
//                           </Col>
//                           <Col>
//                               {/* new: end time — reuses endTimeOptions (capped at 3 hours after start) */}
//                               <Form.Group className="mb-3">
//                                   <Form.Label>End Time</Form.Label>
//                                   <Form.Select
//                                       value={bookingData.endTime}
//                                       onChange={(e) =>
//                                           setBookingData({ ...bookingData, endTime: e.target.value })
//                                       }
//                                       disabled={!bookingData.startTime}
//                                   >
//                                       <option value="">Select end…</option>
//                                       {endTimeOptions.map((t) => (
//                                           <option key={t} value={t}>
//                                               {format12Hour(t)}
//                                           </option>
//                                       ))}
//                                   </Form.Select>
//                               </Form.Group>
//                           </Col>
//                       </Row>
//                   </Form>
//               </Modal.Body>

//               <Modal.Footer>
//                   <Button
//                       variant="secondary"
//                       onClick={() => { setShowComputerModal(false); setBookingError(null); }}
//                       disabled={bookingLoading}
//                   >
//                       Cancel
//                   </Button>
//                   {/* new: calls confirmComputerBooking instead of confirmBooking */}
//                   <Button variant="primary" onClick={confirmComputerBooking} disabled={bookingLoading}>
//                       {bookingLoading ? "Booking…" : "Confirm Booking"}
//                   </Button>
//               </Modal.Footer>
//           </Modal>

//           {/* Booking modal */}
//           <Modal show={showModal} onHide={() => {setShowModal(false); setBookingError(null); setWaitlistMessage(null); setShowWaitlistFromError(false); setShowWaitlistHoldConflict(false); setWaitlistHoldMessage(""); setShowWaitlistRules(false);}} centered> {/* resets the conflict states on close */}
//             <Modal.Header closeButton>
//               <Modal.Title>Book {bookingData.resource}</Modal.Title>
//             </Modal.Header>

//             <Modal.Body style={{ overflowY: "auto", maxHeight: "70vh" }}>
//               {bookingError && (
//                 <div
//                   className="rounded-3 p-3 mb-3 d-flex align-items-start gap-3"
//                   style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}
//                 >
//                   <i className="bi bi-exclamation-circle-fill text-danger mt-1 fs-5 flex-shrink-0" />
//                   <div className="flex-grow-1">
//                     <strong className="d-block small" style={{ color: "#842029" }}>
//                       Time Unavailable
//                     </strong>
//                     <span className="small" style={{ color: "#6c2b30" }}>
//                       {bookingError}
//                     </span>

//                     {showWaitlistFromError && (
//                       <Button
//                         className="mt-2 w-100 rounded-pill fw-semibold"
//                         size="sm"
//                         style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
//                         onClick={() => {
//                           // reset modal error states
//                           setBookingError(null);
//                           setShowWaitlistFromError(false);
//                           setShowWaitlistHoldConflict(false);
//                           setWaitlistHoldMessage("");

//                           // open the full waitlist modal
//                           setShowWaitlistRules(true);

//                           // ensure bookingData.date/startTime are current for the waitlist
//                           // (so joinWaitlist knows which slot)
//                         }}
//                       >
//                         <i className="bi bi-bell-fill me-2" />
//                         Notify Me When This Time Becomes Available
//                       </Button>
//                     )}
  
//                   </div>
//                 </div>
// )}
              
//               {/* 
//                       waitlist hold conflict panel
//                       : shows when someone tries to book a window that is held for a waitlisted 
//                       user, offers the two choices of joining the waitlist or picking another time 
//               */}
//               {showWaitlistHoldConflict && (
//                 <div
//                   className="rounded p-3 mb-3"
//                   style={{ backgroundColor: "#fff8e1", border: "1px solid #ffe082" }}
//                 >
//                   <div className="d-flex align-items-start gap-2 mb-2">
//                     <i className="bi bi-clock-history text-warning mt-1" />
//                     <div>
//                       <strong className="d-block small">Time Pending for Waitlisted User</strong>
//                       <span className="small text-muted">{waitlistHoldMessage}</span>
//                     </div>
//                   </div>

            
//                   <div className="d-flex gap-2 mt-2">
//                     {/* only show generic join button for non-cancellers */}
//                     {!waitlistHoldMessage.includes("You cancelled") && (
//                       <Button
//                         variant="warning"
//                         size="sm"
//                         className="flex-grow-1"
//                         onClick={() => {
//                           // join the waitlist then close the conflict panel
//                           joinWaitlist();
//                           setShowWaitlistHoldConflict(false);
//                         }}
//                         disabled={waitlistLoading}
//                       >
//                         {waitlistLoading ? "Adding…" : "Join Waitlist — Notify Me If Available"}
//                       </Button>
//                     )}
//                     <Button
//                       variant="outline-secondary"
//                       size="sm"
//                       className="flex-grow-1"
//                       onClick={() => {
//                         setShowWaitlistHoldConflict(false);
//                         setWaitlistHoldMessage("");
//                       }}
//                     >
//                       Choose Another Time
//                     </Button>
//                   </div>
                  

//                   {/* canceller gets the same waitlist rules modal as everyone else */}
//                   {waitlistHoldMessage.includes("You cancelled") && (
//                     <Button
//                       className="mt-2 w-100 rounded-pill fw-semibold"
//                       size="sm"
//                       style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
//                       onClick={() => {
//                         setShowWaitlistHoldConflict(false);
//                         setWaitlistHoldMessage("");
//                         setBookingError(null);
//                         setShowWaitlistFromError(false);
//                         setShowWaitlistRules(true);
//                       }}
//                     >
//                       <i className="bi bi-bell-fill me-2" />
//                       Notify Me When This Time Becomes Available
//                     </Button>
//                   )}
//                 </div>
//               )}






//               <Form>
//                 <Form.Group className="mb-3">
//                   <Form.Label>Reservation Date</Form.Label>
//                   <Form.Select
//                     value={bookingData.date}
//                     onChange={(e) =>
//                       setBookingData({ ...bookingData, date: e.target.value, startTime: "", endTime: "" })
//                     }
//                   >
//                     {dateOptions.map((d, i) => (
//                       <option key={d} value={d}>
//                         {i === 0 ? `Starting Sunday: ${formatDateMMDDYYYY(d)}` : formatDateMMDDYYYY(d)}
//                       </option>
//                     ))}
//                   </Form.Select>
//                   <div className="form-text">Times shown in Central Time (America/Chicago).</div>
//                 </Form.Group>

//                 <Row>
//                   <Col>
//                     <Form.Group className="mb-3">
//                       <Form.Label>Start Time</Form.Label>
//                       <Form.Select
//                         value={bookingData.startTime}
//                         onChange={(e) => {
//                           const selected = e.target.value;
//                           setBookingData({ ...bookingData, startTime: e.target.value, endTime: "" })
                          
//                           // if the selected start time is booked, immediately prompt the waitlist rules
//                           // the booking modal stays open underneath so they can still pick another time
//                           if (selected && isTimeBooked(selected, "start")) {
//                             setShowWaitlistRules(true);
//                           }
//                         }}
//                         disabled={!bookingData.date}
//                       >
//                         <option value="">Select start…</option> {/* optino styling has limited support - may not work on safari / mobile */}
//                         {timeOptions.startTimes.map((t) => {
//                           const booked = isTimeBooked(t, "start");
//                           return (
//                             <option
//                               key={t}
//                               value={t}
//                               style={{ color: booked ? "#dc3545" : "#198754", fontWeight: 500 }}
//                             >
//                               {format12Hour(t)} {booked}
//                             </option>
//                           );
//                         })}
//                       </Form.Select>
//                     </Form.Group>
//                   </Col>

//                   <Col>
//                     <Form.Group className="mb-3">
//                       <Form.Label>End Time</Form.Label>
//                       <Form.Select
//                         value={bookingData.endTime}
//                         onChange={(e) =>
//                           setBookingData({ ...bookingData, endTime: e.target.value })
//                         }
//                         disabled={!bookingData.startTime}
//                       >
//                         <option value="">Select end…</option>
//                         {endTimeOptions.map((t) => {
//                           const booked = isTimeBooked(t, "end");
//                           return (
//                             <option
//                               key={t}
//                               value={t}
//                               style={{ color: booked ? "#dc3545" : "#198754", fontWeight: 500 }}
//                             >
//                               {format12Hour(t)} {booked}
//                             </option>
//                           );
//                         })}
//                       </Form.Select>
//                     </Form.Group>
//                   </Col>
//                 </Row>
//               </Form>

//               {/* added: a distinct card with an icon, short explanation line, and a button seaprated from the booking form so it reads as a secondary action not a form submit */}
//               {statuses[bookingData.resource] === "occupied" && !showWaitlistFromError && (
//                 <div
//                   className="mt-3 rounded-3 p-3 d-flex align-items-center justify-content-between gap-3"
//                   style={{ backgroundColor: "#fff3cd", border: "1px solid #ffc107" }}
//                 >
//                   <div className="d-flex align-items-center gap-2">
//                     <i className="bi bi-bell text-warning fs-4" />
//                     <div>
//                       <strong className="d-block small" style={{ color: "#856404" }}>
//                         Room Currently Occupied
//                       </strong>
//                       <span className="small text-muted">
//                         Get notified the moment it opens up.
//                       </span>
//                     </div>
//                   </div>

//                   <Button
//                     onClick={() => setShowWaitlistRules(true)}
//                     disabled={waitlistLoading}
//                     size="sm"
//                     className="text-nowrap rounded-pill px-3 fw-semibold"
//                     style={{
//                       backgroundColor: "#e6a817",
//                       border: "none",
//                       color: "#fff",
//                       whiteSpace: "nowrap",
//                     }}
//                   >
//                     {waitlistLoading
//                       ? <><i className="bi bi-hourglass-split me-1" /> Adding…</>
//                       : "Notify Me When Available"}
//                   </Button>

//                   {waitlistMessage && (
//                     <small
//                       className={`d-block mt-2 ${
//                         waitlistMessage.startsWith("You've been") ? "text-success" : "text-danger"
//                       }`}
//                     >
//                       {waitlistMessage}
//                     </small>
//                   )}
//                 </div>
//               )}


              
//               {/* waitlist hint — shown once a date is selected so the user knows red = joinable */}
//               {bookingData.date && (
//                 <div
//                   className="mt-3 rounded-3 px-3 py-2 d-flex align-items-start gap-2"
//                   style={{
//                     backgroundColor: "#f8f9fa",
//                     border: "1px solid #dee2e6",
//                     fontSize: "0.8rem",
//                     color: "#6c757d",
//                   }}
//                 >
//                   <i className="bi bi-info-circle mt-1 flex-shrink-0" style={{ color: "#0d6efd" }} />
//                   <span>
//                     <strong style={{ color: "#495057" }}>Seeing red times?</strong>{" "}
//                     Those slots are already reserved — but you can still select them to join the
//                     waitlist and get notified if they open up.
//                   </span>
//                 </div>
//               )}
//               </Modal.Body>

//             <Modal.Footer>
//               <Button variant="secondary" onClick={() => {setShowModal(false); setBookingError(null); }} disabled={bookingLoading}>
//                 Cancel
//               </Button>
//               <Button variant="primary" onClick={confirmBooking} disabled={bookingLoading}>
//                 {bookingLoading ? "Booking…" : "Confirm Booking"}
//               </Button>
//             </Modal.Footer>
//           </Modal>
//         </Container>
//       </main>

//       <Footer />
//     </div>
//   );
// };


// NEW UI 
return (
    <>
      {/* ── Scoped page styles ────────────────────────────────────────────
          All class names are prefixed ss- to avoid collisions with Bootstrap.
          Colors use CSS custom properties so we can change the theme in one
          place if needed. Sand (#fdf6ee) is the page background — the map
          image renders directly on it with no white card, making the hotspots
          feel like they're floating on the page rather than inside a box. */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* ── Theme tokens ── */
        .ss-page {
          --terra:       #C0421A;
          --terra-dk:    #8d3213;
          --terra-mid:   #dc3f20;
          --terra-lt:    #f8d3c8;
          --sand:        #f4f5f7;
          --sand-dk:     #e9ecef;
          --cream:       #ffffff;
          --on-terra:    rgba(255,255,255,.95);
          --on-terra-dim:rgba(255,255,255,.7);
          --border-warm: rgba(192,66,26,.16);
          font-family: 'DM Sans', sans-serif;
          background: #f4f5f7;
          color: #1a1a1a;
        }
        .ss-serif { font-family: 'Playfair Display', Georgia, serif; }

        /* ── Hero strip ── */
        .ss-hero {
          background: var(--terra);
          padding: 32px 0 28px;
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,.15);
          color: var(--on-terra);
        }
        .ss-hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image: repeating-linear-gradient(
            -48deg, transparent, transparent 22px,
            rgba(255,255,255,.08) 22px, rgba(255,255,255,.08) 24px
          );
          pointer-events: none;
        }
        .ss-hero-inner {
          position: relative; z-index: 1;
          display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 16px;
        }
        .ss-eyebrow {
          font-size: 0.68rem; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(255,255,255,.85); margin-bottom: 5px;
        }
        .ss-hero-title {
          font-size: clamp(1.9rem, 4vw, 2.8rem);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-weight: 700; color: #fff; line-height: 1.05; margin: 0;
        }
        .ss-hero-sub {
          font-size: 0.95rem; color: rgba(255,255,255,.9);
          margin-top: 6px; margin-bottom: 0;
        }

        .ss-avail-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: #fff;
          border: 1px solid rgba(255,255,255,.45);
          border-radius: 999px; padding: 7px 18px;
          font-size: 0.82rem; color: var(--terra);
          margin-top: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,.08);
        }

        /* ── Floor toggle ── */
        .ss-floor-toggle {
          display: inline-flex;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.26);
          border-radius: 999px;
          padding: 6px;
          gap: 6px;
          flex-shrink: 0;
          box-shadow: 0 10px 24px rgba(0,0,0,.10);
        }
        .ss-floor-btn {
          background: transparent; border: none;
          color: rgba(255,255,255,.82);
          padding: 10px 16px; border-radius: 999px;
          font-size: 0.82rem; font-weight: 600;
          letter-spacing: 0.03em; cursor: pointer;
          transition: all .18s ease;
        }
        .ss-floor-btn.active {
          background: rgba(255,255,255,.92);
          color: var(--terra);
        }
        .ss-floor-btn:hover:not(.active) {
          background: rgba(255,255,255,.18);
          color: #fff;
        }

        /* ── Map section — card-style white surface like dashboard panels ── */
        .ss-map-section {
          background: #fff;
          padding: 24px;
          border-radius: 18px;
          border: 1px solid rgba(145, 81, 30, .12);
          box-shadow: 0 20px 60px rgba(0,0,0,.06);
        }
        .ss-map-label {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 18px;
          font-size: 0.75rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #6c757d;
        }
        .ss-map-label span:last-child {
          font-weight: 400; color: #adb5bd; letter-spacing: 0.03em;
        }
        .ss-map-wrap {
          border: 1px solid rgba(145, 81, 30, .12);
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
        }

        /* ── 4-col info cards row ── */
        .ss-info-row {
          background: transparent;
          padding: 18px 0 36px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .ss-info-card {
          background: #fff;
          border: 1px solid rgba(145, 81, 30, .10);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 55px rgba(0,0,0,.05);
        }
        .ss-info-card-head {
          background: #f8f9fa;
          padding: 12px 16px;
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #495057;
        }
        .ss-info-card-body { padding: 16px 16px; }

        /* Legend dots */
        .ss-dot {
          width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
        }
        .ss-legend-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.8rem; color: #374151; padding: 3px 0;
        }
        .ss-legend-divider {
          border: none; border-top: 0.5px solid var(--border-warm); margin: 8px 0;
        }

        /* Live count */
        .ss-count {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem; font-weight: 700; line-height: 1;
        }
        .ss-count-lbl {
          font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase;
          margin-top: 2px;
        }
        .ss-count-divider {
          width: 0.5px; background: var(--border-warm); align-self: stretch;
        }

        /* Tip rows */
        .ss-tip-row {
          display: flex; align-items: flex-start; gap: 9px;
          font-size: 0.78rem; color: #475569; padding: 3px 0;
        }
        .ss-tip-icon {
          color: var(--terra-mid); font-size: 0.8rem;
          flex-shrink: 0; width: 14px; text-align: center; padding-top: 1px;
        }

        /* ── Room detail modal header (inside Modal.Body) ── */
        .ss-detail-head {
          background: var(--terra);
          padding: 22px 28px 18px;
          /* -1px bleeds the header to the modal edge */
          margin: -1px -1px 0;
        }
        /* Detail modal title — was being overridden to light gray by Bootstrap */
          .ss-detail-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.55rem;
            color: #fff8ee !important;   /* ADD !important */
            margin: 4px 0 10px;
          }
          /* Status pill text */
          .ss-status-pill {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(255,255,255,.12);
            border: 0.5px solid rgba(255,237,200,.2);
            border-radius: 999px; padding: 4px 13px;
            font-size: 0.73rem; font-weight: 600;
            color: #fff8ee !important;   /* ADD !important */
          }

        /* Feature chips */
        .ss-chip {
          display: inline-flex; align-items: center; gap: 6px;
          border-radius: 7px; padding: 5px 11px;
          font-size: 0.76rem; font-weight: 500;
          border: 0.5px solid transparent; white-space: nowrap;
        }
        .ss-chip-yes  { background:#f0fdf4; border-color:#bbf7d0; color:#166534; }
        .ss-chip-no   { background:#f8fafc; border-color:#e2e8f0; color:#94a3b8; }
        .ss-chip-info { background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8; }

        /* Callout box in detail modal */
        .ss-callout {
          border-left: 3px solid var(--terra-mid);
          background: #fffbeb;
          padding: 10px 14px;
          font-size: 0.8rem; color: var(--terra);
          line-height: 1.6;
          border-radius: 0;   /* single-sided border → no radius */
        }

        /* Primary button — dashboard-friendly accent */
        .ss-btn-terra {
          background: var(--terra);
          color: #fff !important;
          border: none;
          border-radius: 10px; padding: 12px 26px;
          font-size: 0.9rem; font-weight: 700; cursor: pointer;
          transition: background .18s, transform .18s;
        }
        .ss-btn-terra:hover { background: var(--terra-dk); transform: translateY(-1px); }

        /* Ghost button */
        .ss-btn-ghost {
          background: #fff;
          border: 1px solid #ced4da;
          color: #495057; border-radius: 10px;
          padding: 10px 18px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          transition: all .15s;
        }
        .ss-btn-ghost:hover { border-color: #adb5bd; color: #212529; }

        /* ── Policies section ── */
        .ss-policy {
          background: #fff;
          border-radius: 20px;
          border: 1px solid rgba(145, 81, 30, .12);
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,.05);
        }
        .ss-policy-head {
          background: var(--terra);
          padding: 28px 34px 24px;
          position: relative; overflow: hidden;
        }
        .ss-policy-head::after {
          content: '§';
          position: absolute; right: 32px; top: 52%; transform: translateY(-50%);
          font-family: 'Playfair Display', serif;
          font-size: 5.2rem; color: rgba(255,255,255,.08);
          line-height: 1; pointer-events: none;
        }
        .ss-policy-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem; color: #fff; margin: 0 0 6px;
        }
        .ss-policy-sub { font-size: 0.9rem; color: rgba(255,255,255,.8); margin: 0; }

        .ss-tab-bar {
          display: flex; gap: 4px; flex-wrap: wrap;
          padding: 10px 14px 0;
          border-bottom: 1px solid #e9ecef;
          background: #fff;
        }
        .ss-tab {
          background: transparent; border: none;
          color: #6c757d; padding: 11px 18px;
          font-size: 0.88rem; font-weight: 700;
          letter-spacing: 0.02em; cursor: pointer;
          border-radius: 8px 8px 0 0;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all .15s;
        }
        .ss-tab.active { color: var(--terra); border-bottom-color: var(--terra); background: #fff; }
        .ss-tab:hover:not(.active) { color: #343a40; background: #f8f9fa; }

        .ss-policy-body {
          padding: 28px 34px 32px;
          font-size: 0.94rem; line-height: 1.78; color: #495057;
        }
        .ss-policy-body h6 {
          font-family: 'Playfair Display', serif;
          font-size: 0.9rem; font-weight: 700;
          color: var(--terra-dk); margin: 18px 0 7px;
        }
        .ss-policy-body h6:first-child { margin-top: 0; }
        .ss-policy-body ol, .ss-policy-body ul { padding-left: 1.5rem; margin-bottom: 10px; }
        .ss-policy-body li { margin-bottom: 4px; }
        .ss-policy-body a { color: var(--terra-mid); text-decoration: none; font-weight: 500; border-bottom: 1px solid rgba(180,83,9,.3); }
        .ss-policy-body a:hover { border-bottom-color: var(--terra-mid); }
        .ss-policy-body strong { color: var(--terra-dk); font-weight: 600; }

        /* Fade-in */
        .ss-fade { animation: ssFade .3s ease both; }
        @keyframes ssFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        @media (max-width: 991px) {
          .ss-map-section { padding: 18px; border-radius: 16px; }
          .ss-info-row { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 575px) {
          .ss-hero { padding: 26px 0 22px; }
          .ss-floor-btn { padding: 10px 14px; }
          .ss-map-label { font-size: 0.7rem; }
          .ss-info-row { grid-template-columns: 1fr; padding-bottom: 26px; }
          .ss-policy-head { padding: 22px 18px 18px; }
          .ss-policy-head::after { right: 16px; font-size: 4.2rem; }
          .ss-policy-body { padding: 20px 18px 22px; }
        }
      `}</style>

    <div style={{ paddingTop: "56px", minHeight: "100vh" }}>
      <StudentHeader />
        <div className="ss-page"> {/* moved he position of ss-page so that now it wraps everything except the studentheader and footer , making the header equal to the other pages */}

        {/* ═══════════════════════════════════════════════════════════════
            HERO — Terracotta strip with title + live pill + floor toggle
        ════════════════════════════════════════════════════════════════ */}
        <div className="ss-hero">
          <Container style={{ maxWidth: 1200 }}>
            <div className="ss-hero-inner">

              {/* Title block */}
              <div>
                {/* added the style thing from the dashboard to make it have the same text font */}
                <h1 className="ss-hero-title">Study Spaces</h1> {/* same class as dashboard header text */}
                <p className="ss-hero-sub">
                  Click any hotspot on the map to view room details and reserve your space.
                </p>

                {/* <div className="ss-avail-pill">
                  UTRGV Library · Study Spaces
                </div> */}

              
                
              </div>

              {/* Floor toggle pill — right side of hero */}
              <div className="ss-floor-toggle">
                <button
                  className={`ss-floor-btn ${selectedFloor === 2 ? "active" : ""}`}
                  onClick={() => setSelectedFloor(2)}
                >
                  2nd Floor
                </button>
                <button
                  className={`ss-floor-btn ${selectedFloor === 3 ? "active" : ""}`}
                  onClick={() => setSelectedFloor(3)}
                >
                  3rd Floor
                </button>
              </div>
            </div>
          </Container>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════════════════════════════════════ */}
        <main>
          <Container style={{ maxWidth: 1200, paddingTop: 24, paddingBottom: 52 }}>

            {/* ── MAP (full width, no card wrapper) ────────────────────── */}
            {/* The map image sits directly on the sand background so there
                are no competing white edges. A thin warm border frames it. */}
            <div className="ss-map-section ss-fade">
              <div className="ss-map-label">
                <span>
                  Floor {selectedFloor} · Interactive Map
                  {loadingStatuses && (
                    <span style={{ marginLeft: 8, fontSize: "0.75rem", color: "#94a3b8" }}>
                      ↻ Refreshing…
                    </span>
                  )}
                </span>
                <span>Click a hotspot to book</span>
              </div>
              <div className="ss-map-wrap">
                <FloorMap
                  floor={selectedFloor}
                  onRoomSelect={handleRoomClick}
                  statuses={statuses}
                />
              </div>
            </div>

            {/* ── 4-COL INFO CARDS (below the map) ─────────────────────── */}
            {/* Cards sit in a row immediately below the map on the same
                sand background, keeping the visual zone cohesive.        */}
            <div className="ss-info-row ss-fade" style={{ animationDelay: ".06s" }}>

              {/* Card 1 — Map Legend */}
              <div className="ss-info-card">
                <div className="ss-info-card-head">Map Legend</div>
                <div className="ss-info-card-body">
                  <div className="ss-legend-row">
                    <div className="ss-dot" style={{ background: "#22c55e" }} />
                    <span>Available</span>
                  </div>
                  <div className="ss-legend-row">
                    <div className="ss-dot" style={{ background: "#ef4444" }} />
                    <span>Occupied / Reserved</span>
                  </div>
                  <hr className="ss-legend-divider" />
                  <p style={{ fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#b45309", marginBottom: 7 }}>
                    Floor {selectedFloor}
                  </p>
                  <div className="ss-legend-row">
                    <i className="bi bi-door-closed" style={{ color: "#b45309", fontSize: "0.82rem", width: 12, textAlign: "center" }} />
                    <span>Study Rooms</span>
                  </div>
                  {selectedFloor === 2 ? (
                    <div className="ss-legend-row">
                      <i className="bi bi-pc-display" style={{ color: "#b45309", fontSize: "0.82rem", width: 12, textAlign: "center" }} />
                      <span>Computer Stations</span>
                    </div>
                  ) : (
                    <div className="ss-legend-row" style={{ opacity: 0.4 }}>
                      <i className="bi bi-pc-display" style={{ fontSize: "0.82rem", width: 12, textAlign: "center" }} />
                      <span>No Computers</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2 — Live Availability counts */}
              <div className="ss-info-card">
                <div className="ss-info-card-head">Live Availability</div>
                <div className="ss-info-card-body">
                  {(() => {
                    const entries = Object.entries(statuses).filter(([name]) =>
                      selectedFloor === 2 ? true : !name.startsWith("Computer")
                    );
                    const avail   = entries.filter(([, s]) => s === "available").length;
                    const occupied = entries.filter(([, s]) => s === "occupied").length;
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", marginBottom: 10 }}>
                          <div>
                            {/* Serif numeral for visual weight */}
                            <div className="ss-count" style={{ color: "#059669" }}>{avail}</div>
                            <div className="ss-count-lbl" style={{ color: "#059669" }}>Available</div>
                          </div>
                          <div className="ss-count-divider" />
                          <div>
                            <div className="ss-count" style={{ color: "#dc2626" }}>{occupied}</div>
                            <div className="ss-count-lbl" style={{ color: "#dc2626" }}>Occupied</div>
                          </div>
                        </div>
                        {/* Occupancy bar — red when > 70% full */}
                        <div style={{ background: "#f1f5f9", borderRadius: 99, height: 4, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 99,
                            width: `${entries.length ? (occupied / entries.length) * 100 : 0}%`,
                            background: occupied / (entries.length || 1) > 0.7 ? "#dc2626" : "#059669",
                            transition: "width .4s ease",
                          }} />
                        </div>
                        <p style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 6, marginBottom: 0, textAlign: "center" }}>
                          {entries.length} total on Floor {selectedFloor}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Card 3 — Booking Tips */}
              <div className="ss-info-card">
                <div className="ss-info-card-head">Booking Tips</div>
                <div className="ss-info-card-body">
                  {[
                    { icon: "bi-clock",          tip: "Book 30+ min in advance" },
                    { icon: "bi-calendar3",       tip: "Reserve up to 3 days ahead" },
                    { icon: "bi-hourglass-split", tip: "Max 3-hour sessions" },
                    { icon: "bi-bell-slash",      tip: "Missed check-in cancels booking" },
                  ].map(({ icon, tip }) => (
                    <div key={tip} className="ss-tip-row">
                      <i className={`bi ${icon} ss-tip-icon`} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4 — Library Hours */}
              <div className="ss-info-card">
                <div className="ss-info-card-head">Library Hours</div>
                <div className="ss-info-card-body">
                  {[
                    { days: "Mon–Thu", hrs: "7:30 AM – 11:30 PM" },
                    { days: "Friday",  hrs: "7:30 AM – 6:00 PM" },
                    { days: "Saturday",hrs: "10:00 AM – 7:00 PM" },
                    { days: "Sunday",  hrs: "1:00 PM – 10:00 PM" },
                  ].map(({ days, hrs }) => (
                    <div key={days} style={{ marginBottom: 7 }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#b45309", letterSpacing: "0.04em", textTransform: "uppercase" }}>{days}</div>
                      <div style={{ fontSize: "0.78rem", color: "#475569" }}>{hrs}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── POLICIES SECTION ──────────────────────────────────────── */}
            <div className="ss-policy ss-fade mb-2" style={{ animationDelay: ".12s" }}>

              {/* Dark header strip with decorative § */}
              <div className="ss-policy-head">
                <h2 className="ss-policy-title">Study Room Policies &amp; Guidelines</h2>
                <p className="ss-policy-sub">Please review before making a reservation.</p>
              </div>

              {/* Tabs */}
              <div className="ss-tab-bar">
                {[
                  { id: "bookings",   icon: "bi-calendar-check", label: "Bookings" },
                  { id: "whiteboard", icon: "bi-easel2",          label: "Whiteboard" },
                  { id: "safety",     icon: "bi-shield-check",    label: "Safety & Security" },
                  { id: "practices",  icon: "bi-stars",           label: "Best Practices" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`ss-tab ${activePolicyTab === tab.id ? "active" : ""}`}
                    onClick={() => setActivePolicyTab(tab.id)}
                  >
                    <i className={`bi ${tab.icon} me-2`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="ss-policy-body">

                {activePolicyTab === "bookings" && (
                  <div className="ss-fade">
                    <p>You must confirm your study room reservation by clicking the confirmation link sent to your <strong>UTRGV email account</strong>. Study rooms may be reserved:</p>
						<h6>UTRGV Main Campus (Edinburg)</h6>
                    <ol>
                      <li>For individual study or group study. Please check room capacity — seating capacity cannot be exceeded.</li>
                      <li>In 30-minute increments.</li>
                      <li>Displays availability by week (Sunday-Saturday).</li>
                    </ol>
                    <h6>Your reservation will be canceled and made available to other students:</h6>
                    <ol>
                      <li>If you fail to confirm your study room reservation.</li>
                      <li>If you are late or fail to occupy the study room within 10 minutes after the start of your reservation.</li>
                      <li>If you are sleeping in the study room. You will be asked to vacate the room for use by another study group.</li>
                    </ol>
                    <p>If there are no other reservations scheduled, a group can continue to use the room by making another reservation. All study room reservations end <strong>30 minutes prior to the library closing</strong>.</p>
                  </div>
                )}

                {activePolicyTab === "whiteboard" && (
                  <ul className="ss-fade">
                    <li>Each study room is equipped with a whiteboard or glass board.</li>
                    <li>Do <strong>NOT USE</strong> outside markers on the boards.</li>
						<li>Markers and supplies are available for checkout at the closest service desk. Be prepared to present your UTRGV ID.</li>
                    <li>If utilized, please erase the board before leaving.</li>
                  </ul>
                )}

                {activePolicyTab === "safety" && (
                  <ul className="ss-fade">
                    <li>For emergencies contact Campus Police, <a href="tel:1-956-882-4911">(956) 882-4911</a> or <a href="tel:911">911</a>.</li>
                    <li>The lights must remain on at all times.</li>
                    <li>Do not lock study room doors.</li>
                    <li>Do not cover doors or windows.</li>
                    <li>Do not rearrange the room layout by moving furniture in or out of the study rooms.</li>
                    <li>Do not exceed the recommended room capacity.</li>
                    <li>Vacate study rooms 30 minutes before the library closes.</li>
                    <li>Please do not leave items unattended. You are solely responsible for your personal belongings. Unattended items will be turned over to Campus Police, <a href="tel:1-956-882-7777">(956) 882-7777</a>.</li>
                  </ul>
                )}

                {activePolicyTab === "practices" && (
                  <ul className="ss-fade">
                    <li>Food is not allowed inside the library and study rooms.</li>
                    <li>Please clean tables before leaving.</li>
                    <li>Be courteous and vacate the study room promptly when your time is up, gathering your belongings and properly disposing of trash.</li>
                    <li>Be respectful of your fellow students — study rooms are not sound-proof!</li>
                    <li>Study rooms are in high demand; save other activities like napping for elsewhere.</li>
                    <li>
                      Report disruptive behavior or misuse to library staff via{" "}
                      <a href="https://www.utrgv.edu/library/services/ask-a-librarian/email/index.htm" target="_blank" rel="noreferrer">email</a>,{" "}
                      <a href="https://www.utrgv.edu/library/services/ask-a-librarian/index.htm" target="_blank" rel="noreferrer">text</a>, or{" "}
                      <a href="https://www.utrgv.edu/library/services/ask-a-librarian/chat/index.htm" target="_blank" rel="noreferrer">chat</a>.
                    </li>
                  </ul>
                )}

              </div>
            </div>

          </Container>
        </main>

        {/* ═══════════════════════════════════════════════════════════════
            MODALS
            Stack order: Room Detail → Room Booking → Computer → Waitlist
        ════════════════════════════════════════════════════════════════ */}

        {/* ── ROOM DETAIL MODAL ──────────────────────────────────────────
            Opens first when a room hotspot is clicked.
            Student reviews capacity + features, then clicks "Continue"
            which closes this and opens the full booking modal.
            size="lg" makes it substantially wider than the default.    */}
        <Modal
          show={showRoomDetail}
          onHide={() => setShowRoomDetail(false)}
          centered
          size="lg"   
        >
          {/*plain div instead of Modal.Body removes Bootstrap's color cascade*/}
          <div style={{ padding: 0, overflow: "hidden", borderRadius: 8 }}>
            {/* Terracotta header — all text colors set directly as inline styles
                to beat Bootstrap's .modal-content color cascade completely */}
            <div
              className="ss-detail-head"
              style={{
                background: "#c0421a",
                padding: "22px 28px 18px",
                margin: "-1px -1px 0",
                borderRadius: "8px 8px 0 0",
              }}
            >
              {/* Eyebrow label — inline color beats any cascade */}
              <p style={{
                fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", margin: "0 0 4px",
                color: "rgba(255,237,200,.85)",   /* directly on element */
              }}>
                Study Room Details
              </p>

              {/* Room name — Playfair serif, explicitly white-cream */}
              <h3 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "1.55rem", margin: "4px 0 10px",
                color: "#fff8ee",                 /* directly on element */
                fontWeight: 700,
              }}>
                {selectedRoomDetail?.room_name ?? "—"}
              </h3>

              {/* Status pill — all styles inline, no class dependency */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,.12)",
                border: "0.5px solid rgba(255,237,200,.2)",
                borderRadius: 999, padding: "4px 13px",
                fontSize: "0.73rem", fontWeight: 600,
                color: "#fff8ee",                 /* directly on element */
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: statuses[selectedRoomDetail?.room_name] === "occupied" ? "#f87171" : "#34d399",
                }} />
                {statuses[selectedRoomDetail?.room_name] === "occupied" ? "Currently Occupied" : "Available Now"}
              </div>
            </div>

            {/* White body */}
            <div style={{ padding: "22px 28px 26px" }}>

              <p style={{ fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>
                Room Features
              </p>

              {/* Feature chips — yes/no/info colour coding */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>

                {/* Capacity — info (blue) chip */}
                <span className="ss-chip ss-chip-info">
                  <i className="bi bi-people-fill" />
                  {(selectedRoomDetail as any)?.capacity ?? "—"}&nbsp;
                  {((selectedRoomDetail as any)?.capacity ?? 2) === 1 ? "person" : "people"}
                </span>

                {/* ADA accessible */}
                <span className={`ss-chip ${(selectedRoomDetail as any)?.accessible ? "ss-chip-yes" : "ss-chip-no"}`}>
                  <i className="bi bi-universal-access" />
                  {(selectedRoomDetail as any)?.accessible ? "ADA Accessible" : "Not ADA Accessible"}
                </span>

                {/* Whiteboard */}
                <span className={`ss-chip ${(selectedRoomDetail as any)?.has_whiteboard ? "ss-chip-yes" : "ss-chip-no"}`}>
                  <i className="bi bi-easel2" />
                  {(selectedRoomDetail as any)?.has_whiteboard ? "Whiteboard" : "No Whiteboard"}
                </span>

                {/* Monitor */}
                <span className={`ss-chip ${(selectedRoomDetail as any)?.has_monitor ? "ss-chip-yes" : "ss-chip-no"}`}>
                  <i className="bi bi-display" />
                  {(selectedRoomDetail as any)?.has_monitor ? "Monitor / Display" : "No Monitor"}
                </span>

                {/* Power outlets */}
                <span className={`ss-chip ${(selectedRoomDetail as any)?.has_power !== false ? "ss-chip-yes" : "ss-chip-no"}`}>
                  <i className="bi bi-lightning-charge-fill" />
                  {(selectedRoomDetail as any)?.has_power !== false ? "Power Outlets" : "No Power"}
                </span>

                {/* Location text — only shown when present */}
                {(selectedRoomDetail as any)?.location_text && (
                  <span className="ss-chip ss-chip-info">
                    <i className="bi bi-geo-alt-fill" />
                    {(selectedRoomDetail as any).location_text}
                  </span>
                )}
              </div>

              {/* Booking rules callout — amber left-border accent */}
              <div className="ss-callout" style={{ marginBottom: 22 }}>
                <i className="bi bi-info-circle-fill me-2" />
                Must book <strong>30+ min ahead</strong> · Max <strong>3 hours</strong> · Up to <strong>3 days</strong> in advance.
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                {/* Primary — closes detail and opens booking modal */}
                <button
                  style={{
                    flex: 1,
                    background: "#2e68dc",
                    color: "#fff8ee",           /* inline — beats everything */
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 24px",
                    fontSize: "0.87rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setBookingError(null);
                    setShowWaitlistFromError(false);
                    setShowWaitlistHoldConflict(false);
                    setWaitlistHoldMessage("");
                    setShowRoomDetail(false);
                    setShowModal(true);
                     // manually trigger a fresh schedule fetch
                    const roomId = roomNameToId.get(bookingData.resource);
                    if (roomId && bookingData.date) {
                      fetchRoomSchedule(roomId, bookingData.date);
                    }
                  }}
                >
                  <i className="bi bi-calendar-plus me-2" />
                  Continue to Booking
                </button>

                {/* Ghost — just dismiss */}
                <button className="ss-btn-ghost" onClick={() => setShowRoomDetail(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* ── WAITLIST RULES MODAL ───────────────────────────────────────
            Shown when a student tries to book an already-occupied slot.
            Unchanged from original logic.                               */}
        <Modal show={showWaitlistRules} onHide={() => { setShowWaitlistRules(false); setWaitlistMessage(null); }} centered>
          <Modal.Header closeButton className="border-0 pb-0" style={{ backgroundColor: "#fffbf0" }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <i className="bi bi-bell-fill text-warning" />
              <span className="fw-bold" style={{ fontSize: "1.05rem" }}>
                Join the Waitlist for {bookingData.resource}
              </span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: "#fffbf0" }} className="px-4 pt-2 pb-3">
            <div className="d-flex align-items-center gap-2 rounded-3 px-3 py-2 mb-4" style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}>
              <i className="bi bi-calendar-x text-danger fs-5" />
              <div>
                <strong className="small d-block" style={{ color: "#842029" }}>This room is currently reserved</strong>
                <span className="small" style={{ color: "#6c2b30" }}>The selected time window is unavailable right now.</span>
              </div>
            </div>
            <p className="fw-semibold mb-2" style={{ color: "#5a4a00", fontSize: "0.9rem" }}>Here's how the waitlist works:</p>
            <div className="d-flex flex-column gap-2 mb-4">
              {[
                { icon: "bi-person-check", color: "#0d6efd", text: "You'll be added to the queue for this room." },
                { icon: "bi-bell",         color: "#e6a817", text: "If the room opens up, you'll get a notification in your dashboard." },
                { icon: "bi-calendar2-check", color: "#198754", text: "You can then choose to book the room or decline — no pressure." },
                { icon: "bi-clock-history",   color: "#6c757d", text: "Notifications expire after a limited window, so act quickly." },
                { icon: "bi-x-circle",        color: "#dc3545", text: "You can only be on the waitlist for one window per room at a time." },
              ].map((item, idx) => (
                <div key={idx} className="d-flex align-items-start gap-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 30, height: 30, backgroundColor: `${item.color}18` }}>
                    <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: "0.8rem" }} />
                  </div>
                  <span className="small pt-1" style={{ color: "#444" }}>{item.text}</span>
                </div>
              ))}
            </div>
            {waitlistMessage && (
              <div className={`small rounded-2 px-3 py-2 mb-3 ${waitlistMessage.startsWith("You've been") ? "text-success" : "text-danger"}`}
                style={{ backgroundColor: waitlistMessage.startsWith("You've been") ? "#d1e7dd" : "#f8d7da" }}>
                <i className={`bi me-1 ${waitlistMessage.startsWith("You've been") ? "bi-check-circle" : "bi-exclamation-circle"}`} />
                {waitlistMessage}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0 px-4 pb-4" style={{ backgroundColor: "#fffbf0" }}>
            <Button variant="outline-secondary" className="rounded-pill px-4"
              onClick={() => { setShowWaitlistRules(false); setWaitlistMessage(null); }}>
              Maybe Later
            </Button>
            <Button className="rounded-pill px-4 fw-semibold"
              style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
              onClick={async () => {
                await joinWaitlist();
                setTimeout(() => {
                  setShowWaitlistRules(false); setWaitlistMessage(null); setShowModal(false);
                  setBookingData({ resource: bookingData.resource, date: "", startTime: "", endTime: "", resourceType: bookingData.resourceType });
                }, 1500);
              }}
              disabled={waitlistLoading || waitlistMessage?.startsWith("You've been")}
            >
              {waitlistLoading
                ? <><i className="bi bi-hourglass-split me-2" />Adding…</>
                : waitlistMessage?.startsWith("You've been")
                  ? <><i className="bi bi-check-circle me-2" />You're on the waitlist!</>
                  : <><i className="bi bi-bell-fill me-2" />Notify Me When Available</>}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ── COMPUTER BOOKING MODAL ─────────────────────────────────────
            Simpler flow for computer stations — no waitlist or hold logic. */}
        <Modal show={showComputerModal} onHide={() => { setShowComputerModal(false); setBookingError(null); }} centered>
          <Modal.Header closeButton style={{ borderBottom: "1px solid #e2e8f0" }}>
            <Modal.Title style={{ fontSize: "1rem", fontWeight: 700, color: "#431d07" }}>
              <i className="bi bi-pc-display me-2" style={{ color: "#b45309" }} />
              Reserve {bookingData.resource}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {bookingError && (
              <div className="rounded-3 p-3 mb-3 d-flex align-items-start gap-2" style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}>
                <i className="bi bi-exclamation-circle-fill text-danger mt-1" />
                <div>
                  <strong className="d-block small" style={{ color: "#842029" }}>Time Unavailable</strong>
                  <span className="small" style={{ color: "#6c2b30" }}>{bookingError}</span>
                </div>
              </div>
            )}
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Reservation Date</Form.Label>
                <Form.Select value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value, startTime: "", endTime: "" })}>
                  {dateOptions.map((d, i) => <option key={d} value={d}>{i === 0 ? `Starting Sunday: ${formatDateMMDDYYYY(d)}` : formatDateMMDDYYYY(d)}</option>)}
                </Form.Select>
                <div className="form-text">Times shown in Central Time (America/Chicago).</div>
              </Form.Group>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Time</Form.Label>
                    <Form.Select value={bookingData.startTime} onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value, endTime: "" })} disabled={!bookingData.date}>
                      <option value="">Select start…</option>
                      {timeOptions.startTimes.map(t => <option key={t} value={t}>{format12Hour(t)}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time</Form.Label>
                    <Form.Select value={bookingData.endTime} onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })} disabled={!bookingData.startTime}>
                      <option value="">Select end…</option>
                      {endTimeOptions.map(t => <option key={t} value={t}>{format12Hour(t)}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: "1px solid #e2e8f0" }}>
            <Button variant="outline-secondary" onClick={() => { setShowComputerModal(false); setBookingError(null); }} disabled={bookingLoading}>Cancel</Button>
            <Button style={{ background: "#2e68dc", border: "none" }} onClick={confirmComputerBooking} disabled={bookingLoading}>
              {bookingLoading ? "Booking…" : "Confirm Booking"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ── ROOM BOOKING MODAL ─────────────────────────────────────────
            Full modal with date/time pickers, waitlist error handling,
            hold conflict panel, and red-times hint.                    */}
        <Modal
          show={showModal}
          onHide={() => {
            setShowModal(false); setBookingError(null); setWaitlistMessage(null);
            setShowWaitlistFromError(false); setShowWaitlistHoldConflict(false);
            setWaitlistHoldMessage(""); setShowWaitlistRules(false);
          }}
          centered
        >
          <Modal.Header closeButton style={{ borderBottom: "1px solid #e2e8f0" }}>
            <Modal.Title style={{ fontSize: "1rem", fontWeight: 700, color: "#431d07" }}>
              <i className="bi bi-calendar-plus me-2" style={{ color: "#b45309" }} />
              Book {bookingData.resource}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ overflowY: "auto", maxHeight: "70vh" }}>

            {/* Booking error banner + optional waitlist CTA */}
            {bookingError && (
              <div className="rounded-3 p-3 mb-3 d-flex align-items-start gap-3" style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}>
                <i className="bi bi-exclamation-circle-fill text-danger mt-1 fs-5 flex-shrink-0" />
                <div className="flex-grow-1">
                  <strong className="d-block small" style={{ color: "#842029" }}>Time Unavailable</strong>
                  <span className="small" style={{ color: "#6c2b30" }}>{bookingError}</span>
                  {showWaitlistFromError && (
                    <Button className="mt-2 w-100 rounded-pill fw-semibold" size="sm"
                      style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
                      onClick={() => { setBookingError(null); setShowWaitlistFromError(false); setShowWaitlistHoldConflict(false); setWaitlistHoldMessage(""); setShowWaitlistRules(true); }}>
                      <i className="bi bi-bell-fill me-2" />Notify Me When This Time Becomes Available
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Waitlist hold conflict panel */}
            {showWaitlistHoldConflict && (
              <div className="rounded p-3 mb-3" style={{ backgroundColor: "#fff8e1", border: "1px solid #ffe082" }}>
                <div className="d-flex align-items-start gap-2 mb-2">
                  <i className="bi bi-clock-history text-warning mt-1" />
                  <div>
                    <strong className="d-block small">Time Pending for Waitlisted User</strong>
                    <span className="small text-muted">{waitlistHoldMessage}</span>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-2">
                  {!waitlistHoldMessage.includes("You cancelled") && (
                    <Button variant="warning" size="sm" className="flex-grow-1"
                      onClick={() => { joinWaitlist(); setShowWaitlistHoldConflict(false); }}
                      disabled={waitlistLoading}>
                      {waitlistLoading ? "Adding…" : "Join Waitlist — Notify Me If Available"}
                    </Button>
                  )}
                  <Button variant="outline-secondary" size="sm" className="flex-grow-1"
                    onClick={() => { setShowWaitlistHoldConflict(false); setWaitlistHoldMessage(""); }}>
                    Choose Another Time
                  </Button>
                </div>
                {waitlistHoldMessage.includes("You cancelled") && (
                  <Button className="mt-2 w-100 rounded-pill fw-semibold" size="sm"
                    style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
                    onClick={() => { setShowWaitlistHoldConflict(false); setWaitlistHoldMessage(""); setBookingError(null); setShowWaitlistFromError(false); setShowWaitlistRules(true); }}>
                    <i className="bi bi-bell-fill me-2" />Notify Me When This Time Becomes Available
                  </Button>
                )}
              </div>
            )}

            {/* Date + time pickers */}
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Reservation Date</Form.Label>
                <Form.Select value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value, startTime: "", endTime: "" })}>
                  {dateOptions.map((d, i) => <option key={d} value={d}>{i === 0 ? `Starting Sunday: ${formatDateMMDDYYYY(d)}` : formatDateMMDDYYYY(d)}</option>)}
                </Form.Select>
                <div className="form-text">Times shown in Central Time (America/Chicago).</div>
              </Form.Group>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Time</Form.Label>
                    <Form.Select value={bookingData.startTime}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setBookingData({ ...bookingData, startTime: selected, endTime: "" });
                        // Booked start time → open waitlist modal immediately
                        if (selected && isTimeBooked(selected, "start")) setShowWaitlistRules(true);
                      }}
                      disabled={!bookingData.date}>
                      <option value="">Select start…</option>
                      {timeOptions.startTimes.map(t => {
                        const booked = isTimeBooked(t, "start");
                        return <option key={t} value={t} style={{ color: booked ? "#dc3545" : "#059669", fontWeight: 500 }}>{format12Hour(t)}</option>;
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time</Form.Label>
                    <Form.Select value={bookingData.endTime} onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })} disabled={!bookingData.startTime}>
                      <option value="">Select end…</option>
                      {endTimeOptions.map(t => {
                        const booked = isTimeBooked(t, "end");
                        return <option key={t} value={t} style={{ color: booked ? "#dc3545" : "#059669", fontWeight: 500 }}>{format12Hour(t)}</option>;
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>

            {/* Occupied room → waitlist nudge */}
            {statuses[bookingData.resource] === "occupied" && !showWaitlistFromError && (
              <div className="mt-2 rounded-3 p-3 d-flex align-items-center justify-content-between gap-3"
                style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-bell text-warning fs-5" />
                  <div>
                    <strong className="d-block small" style={{ color: "#92400e" }}>Room Currently Occupied</strong>
                    <span className="small text-muted">Get notified the moment it opens up.</span>
                  </div>
                </div>
                <Button size="sm" className="text-nowrap rounded-pill px-3 fw-semibold"
                  style={{ backgroundColor: "#b45309", border: "none", color: "#fff" }}
                  onClick={() => setShowWaitlistRules(true)} disabled={waitlistLoading}>
                  {waitlistLoading ? "Adding…" : "Notify Me"}
                </Button>
              </div>
            )}

            {/* Red-times hint */}
            {bookingData.date && (
              <div className="mt-3 rounded-3 px-3 py-2 d-flex align-items-start gap-2"
                style={{ backgroundColor: "#fffbeb", border: "1px solid rgba(180,83,9,.2)", fontSize: "0.78rem", color: "#92400e" }}>
                <i className="bi bi-info-circle mt-1 flex-shrink-0" style={{ color: "#b45309" }} />
                <span>
                  <strong style={{ color: "#431d07" }}>Red times are taken</strong> — select them anyway to join the waitlist and get notified if they open up.
                </span>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer style={{ borderTop: "1px solid #e2e8f0" }}>
            <Button variant="outline-secondary"
              onClick={() => { setShowModal(false); setBookingError(null); }}
              disabled={bookingLoading}>
              Cancel
            </Button>
            {/* Terracotta confirm button matches the page theme */}
            <Button style={{ background: "#2e68dc", border: "none" }} onClick={confirmBooking} disabled={bookingLoading}>
              {bookingLoading ? "Booking…" : "Confirm Booking"}
            </Button>
          </Modal.Footer>
        </Modal>


        {/* ── BOOKING SUCCESS MODAL ─────────────────────────────────────── */}
        <Modal
          show={!!showBookingSuccess}
          onHide={() => setShowBookingSuccess(null)}
          centered
          size="sm"
        >
          <div style={{ padding: 0, overflow: "hidden", borderRadius: 8 }}>
            {/* Green success header */}
            <div style={{
              background: "#059669",
              padding: "24px 28px 20px",
              borderRadius: "8px 8px 0 0",
              textAlign: "center",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(255,255,255,.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <i className="bi bi-check-lg" style={{ fontSize: "1.5rem", color: "#fff" }} />
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                Booking Confirmed!
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "0.9rem", color: "#334155", marginBottom: 6 }}>
                <strong style={{ color: "#1e293b" }}>{showBookingSuccess}</strong> has been successfully reserved.
              </p>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 20 }}>
                Your reservation will appear in your dashboard under upcoming activity.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={{
                    flex: 1, background: "#059669", color: "#fff",
                    border: "none", borderRadius: 8, padding: "10px 16px",
                    fontSize: "0.87rem", fontWeight: 600, cursor: "pointer",
                  }}
                  onClick={() => setShowBookingSuccess(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </Modal>
        
        </div>
        <Footer />
      </div>
    </>
  );


};

export default StudySpaces;
