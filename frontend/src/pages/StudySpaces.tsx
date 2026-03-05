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
function buildTimeOptionsForDate(dateYYYYMMDD: string): { startTimes: string[]; endTimes: string[] } {
  if (!dateYYYYMMDD) return { startTimes: [], endTimes: [] };

  const dow = new Date(`${dateYYYYMMDD}T00:00:00`).getDay();
  const hours = HOURS_BY_DOW[dow];
  const openM = hhmmToMinutes(hours.open);
  const closeM = hhmmToMinutes(hours.close);

  const startTimes: string[] = [];
  const endTimes: string[] = [];

  // Start times: from open up to close - slot
  for (let t = openM; t <= closeM - SLOT_MINUTES; t += SLOT_MINUTES) {
    startTimes.push(minutesToHHMM(t));
  }

  // End times: from open + slot to close
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

  /**
   * Build a quick lookup map so we can convert room name -> room id
   * when POSTing to /reservations/.
   */
  const roomNameToId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of activeRooms) map.set(r.room_name, r.id);
    return map;
  }, [activeRooms]);

  const dateOptions = useMemo(() => buildDateOptions(14, UTRGV_TIME_ZONE), []);
  const timeOptions = useMemo(
    () => buildTimeOptionsForDate(bookingData.date),
    [bookingData.date]
  );
  const endTimeOptions = useMemo(() => {
    if (!bookingData.startTime) return timeOptions.endTimes;
    const startM = hhmmToMinutes(bookingData.startTime);
    return timeOptions.endTimes.filter((t) => hhmmToMinutes(t) > startM);
  }, [bookingData.startTime, timeOptions.endTimes]);


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

  /**
   * When a room hotspot is clicked:
   * - open booking modal
   * - prefill resource with room name
   */
  const handleRoomClick = (roomName: string) => {
    setBookingError(null);

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

      // Refresh live statuses so the map changes color
      await fetchStatuses();

      alert(`Success! ${bookingData.resource} has been reserved.`);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Booking failed", err);

      // Backend overlap validation returns a 400 with message string
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        JSON.stringify(err?.response?.data || {}) ||
        "Booking failed.";

      setBookingError(String(msg));
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

          {/* Booking modal */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Book {bookingData.resource}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              {bookingError && <div className="alert alert-danger small">{bookingError}</div>}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Reservation Date</Form.Label>
                  
                  <Form.Select
                  value={bookingData.date}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, date: e.target.value, startTime: "", endTime: "" })
                    }
                    >
                      {dateOptions.map((d) => (
                        <option key={d} value={d}>
                          {formatDateMMDDYYYY(d)}
                          </option>
                        ))}
                        </Form.Select>
                        
                        <div className="form-text">
                           Times shown in Central Time (America/Chicago).
                           </div>

                </Form.Group>

                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      
                      <Form.Select
                      value={bookingData.startTime}
                      onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value, endTime: "" })}
                      disabled={!bookingData.date}
                      >
                        <option value="">Select start…</option>
                        {timeOptions.startTimes.map((t) => (
                          <option key={t} value={t}>
                            {format12Hour(t)}
                            </option>
                          ))}
                        </Form.Select>

                    </Form.Group>
                  </Col>

                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>End Time</Form.Label>
                      
                      <Form.Select
                      value={bookingData.endTime}
                      onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                      disabled={!bookingData.startTime}
                      >
                        <option value="">Select end…</option>
                        {endTimeOptions.map((t) => (
                          <option key={t} value={t}>
                            {format12Hour(t)}
                            </option>
                          ))}
                        </Form.Select>


                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={bookingLoading}>
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