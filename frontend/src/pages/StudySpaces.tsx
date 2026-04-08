import { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Button, ButtonGroup, Card } from "react-bootstrap";
import StudentHeader from "../components/StudentHeader";
import Footer from "../components/Footer";
import FloorMap from "../components/FloorMap";
import { Modal, Form } from "react-bootstrap";
import { api } from "../api";


/**
 * Types for the backend payload.
 * Keeping variable names literal (activeRooms, reservations, statuses)
 * to avoid mapping issues.
 */
type ActiveRoom = {
  id: number;
  room_name: string; // backend sends room_name that matches the strings used in FloorMap (e.g. "Room 2.111")
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
 * Build N date options starting from today (in Central Time).
 */
function buildDateOptions(daysAhead: number, timeZone: string): string[] {
  const start = new Date(`${todayInTimeZone(timeZone)}T00:00:00`);
  const out: string[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
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

  const dow = new Date(`${dateYYYYMMDD}T00:00:00`).getDay();
  const hours = HOURS_BY_DOW[dow];
  const openM = hhmmToMinutes(hours.open);
  const closeM = hhmmToMinutes(hours.close);

  // check if selected date is today in Central Time
  const todayStr = todayInTimeZone(UTRGV_TIME_ZONE);
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
  const [bookingData, setBookingData] = useState({
    resource: "", // room name string, e.g. "Room 2.111"
    date: "",
    startTime: "",
    endTime: "",
  });

  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);


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

    // exclude windows that belong to the current user from both held and waitlisted
    // so their priority slot shows green and doesn't trigger the waitlist modal
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
        return selectedStart < wEnd && slotDate > wStart;
      }
    });
  };

  /**
   * When a room hotspot is clicked:
   * - open booking modal
   * - prefill resource with room name
   */
  const handleRoomClick = (roomName: string) => {
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
    }));

    setShowModal(true);
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
      setShowWaitlistFromError(false);
      // Refresh live statuses so the map changes color
      await fetchStatuses();

      alert(`Success! ${bookingData.resource} has been reserved.`);
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

  /**
   * The map itself still expects a statuses object keyed by room name.
   * pass backend statuses instead of local state.
   */
  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: "56px" }}>
      <StudentHeader />

      <main className="flex-grow-1">
        <Container className="py-5">
          <header className="mb-4 d-flex justify-content-between align-items-center">
            <div>
              <h1 className="fw-bold">Study Spaces</h1>
              <p className="text-muted">
                Select a floor to view available rooms and computers.
                {loadingStatuses ? " (Loading live data…)" : ""}
              </p>
            </div>

            <ButtonGroup>
              <Button
                variant={selectedFloor === 2 ? "primary" : "outline-primary"}
                onClick={() => setSelectedFloor(2)}
              >
                2nd Floor
              </Button>
              <Button
                variant={selectedFloor === 3 ? "primary" : "outline-primary"}
                onClick={() => setSelectedFloor(3)}
              >
                3rd Floor
              </Button>
            </ButtonGroup>
          </header>

          <Row>
            <Col lg={9}>
              <FloorMap floor={selectedFloor} onRoomSelect={handleRoomClick} statuses={statuses} />
            </Col>

            <Col lg={3}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold">Map Legend</Card.Header>
            
                <Card.Body>
                  <div className="mb-3 d-flex align-items-center">
                    <span className="badge bg-success me-2">&nbsp;</span>
                    <small>Available</small>
                  </div>
                  <div className="mb-3 d-flex align-items-center">
                    <span className="badge bg-danger me-2">&nbsp;</span>
                    <small>Occupied/Reserved</small>
                  </div>
                  <hr />
                  <h6>Resources on Floor {selectedFloor}</h6>
                  <ul className="list-unstyled small">
                    <li>
                      <i className="bi bi-door-closed me-2"></i> Study Rooms
                    </li>
                    {selectedFloor === 2 ? (
                      <li className="mt-2 text-primary">
                        <i className="bi bi-pc-display me-2"></i> Computers Available
                      </li>
                    ) : (
                      <li className="mt-2 text-muted italic">
                        <i className="bi bi-pc-display me-2"></i> No Computers on this floor
                      </li>
                    )}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>


          {/* a new modal with the waitlist rules */}
          <Modal
            show={showWaitlistRules}
            onHide={() => {
              setShowWaitlistRules(false);
              setWaitlistMessage(null);
              // do NOT close showModal here — user should return to the booking form
            }}
            centered 
          >
            <Modal.Header
              closeButton
              className="border-0 pb-0"
              style={{ backgroundColor: "#fffbf0" }}
            >
              <Modal.Title className="d-flex align-items-center gap-2">
                <i className="bi bi-bell-fill text-warning" />
                <span className="fw-bold" style={{ fontSize: "1.1rem" }}>
                  Join the Waitlist for {bookingData.resource}
                </span>
              </Modal.Title>
            </Modal.Header>

            <Modal.Body style={{ backgroundColor: "#fffbf0" }} className="px-4 pt-2 pb-3">
              {/* status banner */}
              <div
                className="d-flex align-items-center gap-2 rounded-3 px-3 py-2 mb-4"
                style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}
              >
                <i className="bi bi-calendar-x text-danger fs-5" />
                <div>
                  <strong className="small d-block" style={{ color: "#842029" }}>
                    This room is currently reserved
                  </strong>
                  <span className="small" style={{ color: "#6c2b30" }}>
                    The selected time window is unavailable right now.
                  </span>
                </div>
              </div>

              {/* how it works */}
              <p className="fw-semibold mb-2" style={{ color: "#5a4a00", fontSize: "0.9rem" }}>
                Here's how the waitlist works:
              </p>

              <div className="d-flex flex-column gap-2 mb-4">
                {[
                  {
                    icon: "bi-person-check",
                    color: "#0d6efd",
                    text: "You'll be added to the queue for this room.",
                  },
                  {
                    icon: "bi-bell",
                    color: "#e6a817",
                    text: "If the room opens up, you'll get a notification in your dashboard.",
                  },
                  {
                    icon: "bi-calendar2-check",
                    color: "#198754",
                    text: "You can then choose to book the room or decline — no pressure.",
                  },
                  {
                    icon: "bi-clock-history",
                    color: "#6c757d",
                    text: "Notifications expire after a limited window, so act quickly when you receive one.",
                  },
                  {
                    icon: "bi-x-circle",
                    color: "#dc3545",
                    text: "You can only be on the waitlist for one window per room at a time.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: `${item.color}18`,
                      }}
                    >
                      <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: "0.85rem" }} />
                    </div>
                    <span className="small pt-1" style={{ color: "#444" }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* waitlist feedback */}
              {waitlistMessage && (
                <div
                  className={`small rounded-2 px-3 py-2 mb-3 ${
                    waitlistMessage.startsWith("You've been")
                      ? "text-success"
                      : "text-danger"
                  }`}
                  style={{
                    backgroundColor: waitlistMessage.startsWith("You've been")
                      ? "#d1e7dd"
                      : "#f8d7da",
                  }}
                >
                  <i
                    className={`bi me-1 ${
                      waitlistMessage.startsWith("You've been")
                        ? "bi-check-circle"
                        : "bi-exclamation-circle"
                    }`}
                  />
                  {waitlistMessage}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer
              className="border-0 pt-0 px-4 pb-4"
              style={{ backgroundColor: "#fffbf0" }}
            >
              <Button
                variant="outline-secondary"
                className="rounded-pill px-4"
                onClick={() => {
                  setShowWaitlistRules(false);
                  setWaitlistMessage(null);
                  // booking modal stays open — user can pick a different time
                }}
              >
                Maybe Later
              </Button>
              <Button
                className="rounded-pill px-4 fw-semibold"
                style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
                onClick={async () => {
                  await joinWaitlist();
                  setTimeout(() => {
                    setShowWaitlistRules(false);
                    setWaitlistMessage(null);
                    // also close the booking modal since they've joined — nothing left to do here
                    setShowModal(false);
                    setBookingData({ resource: bookingData.resource, date: "", startTime: "", endTime: "" });
                  }, 1500);
                }}
                disabled={waitlistLoading || waitlistMessage?.startsWith("You've been")}
              >
                {waitlistLoading ? (
                  <>
                    <i className="bi bi-hourglass-split me-2" />
                    Adding to waitlist…
                  </>
                ) : waitlistMessage?.startsWith("You've been") ? (
                  <>
                    <i className="bi bi-check-circle me-2" />
                    You're on the waitlist!
                  </>
                ) : (
                  <>
                    <i className="bi bi-bell-fill me-2" />
                    Notify Me When Available
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Booking modal */}
          <Modal show={showModal} onHide={() => {setShowModal(false); setBookingError(null); setWaitlistMessage(null); setShowWaitlistFromError(false); setShowWaitlistHoldConflict(false); setWaitlistHoldMessage(""); setShowWaitlistRules(false);}} centered> {/* resets the conflict states on close */}
            <Modal.Header closeButton>
              <Modal.Title>Book {bookingData.resource}</Modal.Title>
            </Modal.Header>

            <Modal.Body style={{ overflowY: "auto", maxHeight: "70vh" }}>
              {bookingError && (
                <div
                  className="rounded-3 p-3 mb-3 d-flex align-items-start gap-3"
                  style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}
                >
                  <i className="bi bi-exclamation-circle-fill text-danger mt-1 fs-5 flex-shrink-0" />
                  <div className="flex-grow-1">
                    <strong className="d-block small" style={{ color: "#842029" }}>
                      Time Unavailable
                    </strong>
                    <span className="small" style={{ color: "#6c2b30" }}>
                      {bookingError}
                    </span>

                    {showWaitlistFromError && (
                      <Button
                        className="mt-2 w-100 rounded-pill fw-semibold"
                        size="sm"
                        style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
                        onClick={() => {
                          // reset modal error states
                          setBookingError(null);
                          setShowWaitlistFromError(false);
                          setShowWaitlistHoldConflict(false);
                          setWaitlistHoldMessage("");

                          // open the full waitlist modal
                          setShowWaitlistRules(true);

                          // ensure bookingData.date/startTime are current for the waitlist
                          // (so joinWaitlist knows which slot)
                        }}
                      >
                        <i className="bi bi-bell-fill me-2" />
                        Notify Me When This Time Becomes Available
                      </Button>
                    )}
  
                  </div>
                </div>
)}
              
              {/* 
                      waitlist hold conflict panel
                      : shows when someone tries to book a window that is held for a waitlisted 
                      user, offers the two choices of joining the waitlist or picking another time 
              */}
              {showWaitlistHoldConflict && (
                <div
                  className="rounded p-3 mb-3"
                  style={{ backgroundColor: "#fff8e1", border: "1px solid #ffe082" }}
                >
                  <div className="d-flex align-items-start gap-2 mb-2">
                    <i className="bi bi-clock-history text-warning mt-1" />
                    <div>
                      <strong className="d-block small">Time Pending for Waitlisted User</strong>
                      <span className="small text-muted">{waitlistHoldMessage}</span>
                    </div>
                  </div>

            
                  <div className="d-flex gap-2 mt-2">
                    {/* only show generic join button for non-cancellers */}
                    {!waitlistHoldMessage.includes("You cancelled") && (
                      <Button
                        variant="warning"
                        size="sm"
                        className="flex-grow-1"
                        onClick={() => {
                          // join the waitlist then close the conflict panel
                          joinWaitlist();
                          setShowWaitlistHoldConflict(false);
                        }}
                        disabled={waitlistLoading}
                      >
                        {waitlistLoading ? "Adding…" : "Join Waitlist — Notify Me If Available"}
                      </Button>
                    )}
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="flex-grow-1"
                      onClick={() => {
                        setShowWaitlistHoldConflict(false);
                        setWaitlistHoldMessage("");
                      }}
                    >
                      Choose Another Time
                    </Button>
                  </div>
                  

                  {/* canceller gets the same waitlist rules modal as everyone else */}
                  {waitlistHoldMessage.includes("You cancelled") && (
                    <Button
                      className="mt-2 w-100 rounded-pill fw-semibold"
                      size="sm"
                      style={{ backgroundColor: "#e6a817", border: "none", color: "#fff" }}
                      onClick={() => {
                        setShowWaitlistHoldConflict(false);
                        setWaitlistHoldMessage("");
                        setBookingError(null);
                        setShowWaitlistFromError(false);
                        setShowWaitlistRules(true);
                      }}
                    >
                      <i className="bi bi-bell-fill me-2" />
                      Notify Me When This Time Becomes Available
                    </Button>
                  )}
                </div>
              )}






              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Reservation Date</Form.Label>
                  <Form.Select
                    value={bookingData.date}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, date: e.target.value, startTime: "", endTime: "" })
                    }
                  >
                    {dateOptions.map((d, i) => (
                      <option key={d} value={d}>
                        {i === 0 ? `Starting Sunday: ${formatDateMMDDYYYY(d)}` : formatDateMMDDYYYY(d)}
                      </option>
                    ))}
                  </Form.Select>
                  <div className="form-text">Times shown in Central Time (America/Chicago).</div>
                </Form.Group>

                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Select
                        value={bookingData.startTime}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setBookingData({ ...bookingData, startTime: e.target.value, endTime: "" })
                          
                          // if the selected start time is booked, immediately prompt the waitlist rules
                          // the booking modal stays open underneath so they can still pick another time
                          if (selected && isTimeBooked(selected, "start")) {
                            setShowWaitlistRules(true);
                          }
                        }}
                        disabled={!bookingData.date}
                      >
                        <option value="">Select start…</option> {/* optino styling has limited support - may not work on safari / mobile */}
                        {timeOptions.startTimes.map((t) => {
                          const booked = isTimeBooked(t, "start");
                          return (
                            <option
                              key={t}
                              value={t}
                              style={{ color: booked ? "#dc3545" : "#198754", fontWeight: 500 }}
                            >
                              {format12Hour(t)} {booked}
                            </option>
                          );
                        })}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>End Time</Form.Label>
                      <Form.Select
                        value={bookingData.endTime}
                        onChange={(e) =>
                          setBookingData({ ...bookingData, endTime: e.target.value })
                        }
                        disabled={!bookingData.startTime}
                      >
                        <option value="">Select end…</option>
                        {endTimeOptions.map((t) => {
                          const booked = isTimeBooked(t, "end");
                          return (
                            <option
                              key={t}
                              value={t}
                              style={{ color: booked ? "#dc3545" : "#198754", fontWeight: 500 }}
                            >
                              {format12Hour(t)} {booked}
                            </option>
                          );
                        })}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>

              {/* added: a distinct card with an icon, short explanation line, and a button seaprated from the booking form so it reads as a secondary action not a form submit */}
              {statuses[bookingData.resource] === "occupied" && !showWaitlistFromError && (
                <div
                  className="mt-3 rounded-3 p-3 d-flex align-items-center justify-content-between gap-3"
                  style={{ backgroundColor: "#fff3cd", border: "1px solid #ffc107" }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-bell text-warning fs-4" />
                    <div>
                      <strong className="d-block small" style={{ color: "#856404" }}>
                        Room Currently Occupied
                      </strong>
                      <span className="small text-muted">
                        Get notified the moment it opens up.
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowWaitlistRules(true)}
                    disabled={waitlistLoading}
                    size="sm"
                    className="text-nowrap rounded-pill px-3 fw-semibold"
                    style={{
                      backgroundColor: "#e6a817",
                      border: "none",
                      color: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {waitlistLoading
                      ? <><i className="bi bi-hourglass-split me-1" /> Adding…</>
                      : "Notify Me When Available"}
                  </Button>

                  {waitlistMessage && (
                    <small
                      className={`d-block mt-2 ${
                        waitlistMessage.startsWith("You've been") ? "text-success" : "text-danger"
                      }`}
                    >
                      {waitlistMessage}
                    </small>
                  )}
                </div>
              )}


              
              {/* waitlist hint — shown once a date is selected so the user knows red = joinable */}
              {bookingData.date && (
                <div
                  className="mt-3 rounded-3 px-3 py-2 d-flex align-items-start gap-2"
                  style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    fontSize: "0.8rem",
                    color: "#6c757d",
                  }}
                >
                  <i className="bi bi-info-circle mt-1 flex-shrink-0" style={{ color: "#0d6efd" }} />
                  <span>
                    <strong style={{ color: "#495057" }}>Seeing red times?</strong>{" "}
                    Those slots are already reserved — but you can still select them to join the
                    waitlist and get notified if they open up.
                  </span>
                </div>
              )}
              </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onClick={() => {setShowModal(false); setBookingError(null); }} disabled={bookingLoading}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmBooking} disabled={bookingLoading}>
                {bookingLoading ? "Booking…" : "Confirm Booking"}
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </main>

      <Footer />
    </div>
  );
};

export default StudySpaces;