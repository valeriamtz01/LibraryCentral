// this is the main dashboard page for students, it will show a summary of their activity (i.e. active reservations, equipment loans, etc.) and provide links to the different sections of the dashboard (i.e. room reservations, equipment loans, etc.)
import { useCallback, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Badge } from 'react-bootstrap'; // list group will be used to show a list of upcoming reservations and loans, badge will be used to show the number of active reservations and loans
import { useNavigate } from 'react-router-dom'; // we will use navigate to redirect users to the room reservation and equipment inventory pages when they click the buttons on the dashboard summary cards, this is a better user experience than just showing them a summary without a clear cta
import StudentHeader from '../components/StudentHeader'; // importing the student header which has the navbar for the dashboard and related pages --> finishing this later, 
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { api } from '../api';  // added to import centrailized axios instance for be calls
import 'bootstrap-icons/font/bootstrap-icons.css';
import libraryBg from '../assets/background-image.jpg';


const Dashboard = () => {
  const navigate = useNavigate(); // react-router-dom hook for navigation to other pages using buttons from the dashboard  

  // initializing state with 0 to reflect that a new user starts with no activity.
  // we explicitly show "0" rather than hiding the section to provide clear feedback to the user about their current status and encourage them to engage with the library's resources
  
  // removed the three separate state variables and consolidated the separate states into a single 'dashboardData' object

  // storing the entire dashboard response object in one state, keeping everything synchronized and making it easier to manage 
  // (updating and accessing the datat simpler than using multiple states like before)
  // also : prevents partial renders where once count updates before another
  // this mirrors the json strucutre sent by the dashboard_summary view
  // one api call updates the entire user interface at one
  const [dashboardData, setDashboardData] = useState ({
    activeRooms: 0, // number of study rooms reserved by current user
    activeComputers: 0, // number of computers reserved
    equipmentLoans: 0, // number of equipment items checkout
    reservations: [], // list of upcoming reservations (later, need to display them with the listgroup)
    equipment: [], // list of equipment the user has checkout out
    waitlist: [] // added waitlist to the intital state
  });

  // show in the console the array
  useEffect(() => {
    console.log("Dashboard equipment data:", dashboardData.equipment);
  }, [dashboardData.equipment]);

  // fetchDashboard inside useEffect:
  /* useEffect will run once when the component loads. 
  so when the user lands on dashboard, it will immediately request live data from the be
  where the be will calculate the real reservation and loans */
  // sends an authenticated GET request to the be
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get("/user/dashboard-summary/");
      setDashboardData(response.data);
      setUserName(response.data.user_name);
    }
    catch (error) {
      console.error("Dashboard fetch failed: ", error);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  type DashNotification = {
    id: number;
    message: string;
    room_name: string | null;
    room_id: number | null;
    created_at: string;
  };

  const [notifications, setNotifications] = useState<DashNotification[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications/");
      setNotifications(res.data.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/mark-read/", {});
      setNotifications([]);
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  // poll for notifications every 10 seconds
  // evert 10 seconds, the broswer makes a GET request to /notifications/ and check if there's anything new
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10_000);
    return () => clearInterval(interval);
  }, []);

  // added for the delete reservation
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  
  // add a state to track the global warning - will control whether the bottom warning is visible 
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  // add username to state
  const [userName, setUserName] = useState("");

  // helper function for data formatting: 
  // be iso strings (2026-01-02T14:00:00Z) aren't user friendly
  // function -> makes the iso string look nice ("Jan 24, 2:00 PM")
  // helps localize UTC strings from datbase since django stores all timestamps in UTC 
  const formatDateTime = (isoString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',  // a short month ("Mar")
      day: 'numeric',  // numerica day ("10")
      hour: '2-digit',  // ensure times alighment (07 instead of 7)
      minute: '2-digit', // kepps the list from shifting horizontally as numbers change
      timeZone: 'America/Chicago' // this forces browser to ignore user's local system clock => ensuring time shown is always the time at the utrgv campus
    };
    return new Date(isoString).toLocaleString('en-US', options); // newDate(isostring) = parses the ISO-8601 string ("2026-03-10T12:30:00Z"). .toLocalestring = guarantees the "month day, time" order
  }

  const handleDeleteReservation = async (reservationId: number) => {
   setDeletingId(reservationId);

  try {
    // call the be to delete
    await api.delete(`/reservations/${reservationId}/`);

    await fetchDashboard();
    
    alert("Reservation cancelled successfully.");
  } catch (error) {
    console.error("Failed to delete reservation:", error);
    alert("Could not cancel reservation. Please try again.");
  }
};

  // calculate due date using loan_period and checked_out_at
  const calculateDueDate = (loanPeriod: string, checkedOutAt?: string) => {
    if (!loanPeriod || !checkedOutAt) return 'N/A';

    let dueDate = new Date(checkedOutAt);
    const period = loanPeriod.toLowerCase();

    if (period.includes('day')) {
      const match = period.match(/(\d+)\s*day/);
      const days = match ? parseInt(match[1]) : 1;
      dueDate.setDate(dueDate.getDate() + days);
    } else if (period.includes('hour')) {
      const match = period.match(/(\d+)\s*hour/);
      const hours = match ? parseInt(match[1]) : 24;
      dueDate.setHours(dueDate.getHours() + hours);
    } else if (period.includes('semester')) {
      dueDate.setMonth(dueDate.getMonth() + 4);
    } else {
      dueDate.setDate(dueDate.getDate() + 1);
    }

    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  function async(): import("react").MouseEventHandler<HTMLButtonElement> | undefined {
    throw new Error('Function not implemented.');
  }


// CURRENT DASHBOARD STARTS HERE: 
// Hero + Timeline Focus 

// Layout (top → bottom):
//   1. StudentHeader  — existing navbar, unchanged
//   2. Hero banner    — orange (#C0421A) strip: greeting, date, 3 stat counts, bell
//   3. Quick-action pills — "+ Book a space", "View inventory", "My account"
//   4. Body row (flexbox, no Container so it stretches edge-to-edge inside the page):
//        LEFT  (flex 1.1) — vertical timeline of upcoming reservations + equipment due dates
//        RIGHT (248px)    — Notifications card | Equipment on Loan card | LC Assistant card (AI, blank)
//   5. Bottom CTA bar — "Book a space" + "View inventory" buttons
//   6. Footer — existing Footer component, unchanged
// ─────────────────────────────────────────────────────────────────────────────

return (
    //  Page shell 
    // min-vh-100  → page always fills the full viewport height (Bootstrap utility)
    // paddingTop  → clears the fixed StudentHeader navbar (56px tall)
    // backgroundColor → light gray page background, same as the other dashboard options
    <div
      className="d-flex flex-column min-vh-100"
      style={{ paddingTop: '56px', backgroundColor: '#f4f5f7' }}
    >
      {/* StudentHeader — fixed navbar with LC Portal branding + nav links */}
      <StudentHeader />

      {/* ── Main scrollable content  */}
      <main className="flex-grow-1">

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 1 — HERO BANNER
            Full-width orange strip. Shows the student's name (from userName state),
            today's date, and the three live stat counts from dashboardData.
            The bell icon opens/closes the notification dropdown (showNotifDropdown state).
            No Container wrapper here so the orange bleeds edge-to-edge.
        ════════════════════════════════════════════════════════════════════ */}
        <div style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.62)), url(${libraryBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 45%',
          //padding: '32px 0 28px',
          padding: '0',
          display: 'flex',
          minHeight: '186px',
          alignItems: 'center',
        }}>
          <Container style={{ maxWidth: 1200 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '24px',
              flexWrap: 'wrap',
            }}>

              {/* LEFT side of hero: label → name → date */}
              <div style={{
                flex: '1 1 0',
                minWidth: '260px',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.55)',
                  textTransform: 'uppercase',
                  letterSpacing: '.09em',
                  marginBottom: '4px',
                }}>
                  Student Dashboard · LC Portal
                </div>

                <div style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 700, color: '#fff', marginBottom: '0px', lineHeight: 1.05 }}>
                  Welcome back, {userName || 'Student'}!
                </div>

                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '0' }}>
                  LibraryCentral · UTRGV ·{' '}
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* RIGHT side of hero: stat strip aligned on hero background */}
              <div style={{
                flex: '0 0 auto',
                minWidth: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '18px',
                paddingTop: '1px',
              }}>
                <div style={{ paddingRight: '20px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                    Rooms active
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 500, color: '#fff', lineHeight: 1 }}>
                    {dashboardData.activeRooms}
                  </div>
                </div>

                <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'stretch' }} />

                <div style={{ paddingRight: '20px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                    Computers
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 500, color: '#fff', lineHeight: 1 }}>
                    {dashboardData.activeComputers}
                  </div>
                </div>

                <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'stretch' }} />

                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                    Equipment loans
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 500, color: '#fff', lineHeight: 1 }}>
                    {dashboardData.equipmentLoans}
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </div>
        {/* END SECTION 1 — HERO BANNER */}

{/* ════════════════════════════════════════════════════════════════════
            SECTION 3 — BODY: TIMELINE (LEFT) + SIDEBAR CARDS (RIGHT)
            Two-column flex row. No Bootstrap Container — stretches full width.
            LEFT:  flex 1.1  — takes most of the space — timeline of activity
            RIGHT: 248px fixed — stacked cards (notifications, AI agent)
        ════════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* ── LEFT COLUMN: Upcoming Activity Timeline ─────────────────────
              Vertical timeline that lists reservations + equipment due dates
              in chronological order. Each item = a colored dot + a card.
              A continuous vertical line (2px, #e9ecef) connects all dots.
          ── */}
          <div style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: '20px 20px 20px 24px',
            borderRight: '1px solid #e9ecef',
            backgroundColor: '#f4f5f7',
          }}>

            {/* Section label — all-caps micro label above the timeline */}
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#6c757d',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              marginBottom: '16px',
            }}>
              Upcoming activity
            </div>

            {/* ── Timeline container ─────────────────────────────────────────
                paddingLeft: 24px → makes room for the dot + connecting line
                that sit in the 24px gutter to the left of each card.
            ── */}
            <div style={{ position: 'relative', paddingLeft: '24px' }}>

              {/* Vertical connecting line — only renders when there is content */}
              {(dashboardData.reservations.length > 0 || dashboardData.equipment.length > 0) && (
                <div style={{
                  position: 'absolute',
                  left: '7px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  backgroundColor: '#e9ecef',
                }} />
              )}

              {/* ── RESERVATION ITEMS ──────────────────────────────────────────
                  Maps over dashboardData.reservations (set by fetchDashboard useEffect).
                  Each renders as: orange dot + white card.
                  Card layout:
                    - Room name + trash icon inline on the same row (left side)
                    - Time range below the name row
                    - Confirmed badge on the right
                  Cancel logic: confirmDeleteId controls the confirm form;
                  handleDeleteReservation fires axios DELETE to /reservations/{id}/.
              ── */}
              {dashboardData.reservations.length > 0 ? (
                dashboardData.reservations.map((res: any) => (
                  <div key={res.id} style={{ position: 'relative', marginBottom: '14px' }}>

                    {/* Orange dot — brand color for room reservations */}
                    <div style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '8px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: '#C0421A',
                      border: '2px solid #f4f5f7',
                    }} />

                    {/* Reservation card */}
                    <div style={{
                      backgroundColor: '#fff',
                      border: '1px solid #e9ecef',
                      borderRadius: '10px',
                      padding: '11px 14px',
                    }}>
                      <div className="d-flex justify-content-between align-items-start">

                        {/* Room name row — name and trash icon sit side by side on the same line
                            gap: 6px keeps the icon close to the name without crowding it */}
                        <div style={{ flex: 1 }}>

                          {/* Room name + trash icon on the same row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <div style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a' }}>
                              {res.room_name}
                            </div>
                            {confirmDeleteId === res.id ? (
                              <div className="d-flex align-items-center gap-1">
                                <small className="text-danger fw-bold" style={{ fontSize: '11px' }}>Cancel?</small>
                                <Button
                                  variant="danger" size="sm"
                                  className="py-0 px-2"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={async () => {
                                    await handleDeleteReservation(res.id);
                                    setShowCancelWarning(false);
                                  }}
                                  disabled={deletingId === res.id}
                                >
                                  {deletingId === res.id ? '…' : 'Yes'}
                                </Button>
                                <Button
                                  variant="outline-secondary" size="sm"
                                  className="py-0 px-2"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={() => { setConfirmDeleteId(null); setShowCancelWarning(false); }}
                                >
                                  No
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="link"
                                className="text-danger p-0"
                                onClick={() => { setConfirmDeleteId(res.id); setShowCancelWarning(true); }}
                                title="Cancel Reservation"
                                style={{ lineHeight: 1, fontSize: '12px' }}
                                disabled={deletingId === res.id}
                              >
                                <i className="bi bi-trash3-fill" />
                              </Button>
                            )}
                          </div>

                          {/* Type label — between name and date, same format as Equipment Loan */}
                          <div style={{
                            fontSize: '11px', color: '#94a3b8', marginBottom: '3px',
                            textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
                          }}>
                            {res.room_name?.startsWith('Computer') ? 'Computer Reservation' : 'Room Reservation'}
                          </div>

                          {/* Time range */}
                          <div style={{ fontSize: '12px', color: '#6c757d', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-clock" style={{ color: '#92400e', fontSize: '11px' }} />
                            <span>
                              <strong style={{ color: '#1a1a1a' }}>
                                {new Date(res.start_time).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                  timeZone: 'America/Chicago',
                                })}
                                {' · '}
                                {new Date(res.start_time).toLocaleTimeString('en-US', {
                                  hour: '2-digit', minute: '2-digit',
                                  timeZone: 'America/Chicago', hour12: true,
                                })}
                                {' – '}
                                {new Date(res.end_time).toLocaleTimeString('en-US', {
                                  hour: '2-digit', minute: '2-digit',
                                  timeZone: 'America/Chicago', hour12: true,
                                })}
                              </strong>
                            </span>
                          </div>
                          
                          {/* Appears when showCancelWarning is true (trash icon clicked).
                           Resets to false when user clicks Yes or No.
                           borderLeft: 4px amber → standard warning stripe pattern. */}
                           {/* Inline warning — only shows on the card whose trash was clicked */}
                          {confirmDeleteId === res.id && (
                            <div
                              className="d-flex align-items-center gap-2 px-2 py-1 mt-2"
                              style={{
                                backgroundColor: '#fff9f0',
                                border: '1px solid #ffcc80',
                                borderLeft: '3px solid #f59e0b',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                color: '#8a6d3b',
                              }}
                            >
                              <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', fontSize: '11px', flexShrink: 0 }} />
                              <span>Cancellations cannot be undone — you must rebook if needed.</span>
                            </div>
                          )}

                        </div>

                        {/* RIGHT: Time-away badge — shows how soon the reservation is
                            instead of a static "Confirmed" label.
                            Logic (all derived from res.start_time):
                              - diffMs   → milliseconds between now and the reservation start
                              - diffDays → full calendar days until start (Math.floor)
                              - 'Now'         → reservation is currently happening (diffMs < 0)
                              - 'Today'       → same calendar day as today (diffDays === 0)
                              - 'Tomorrow'    → exactly 1 day away
                              - 'In X days'   → 2–6 days away
                              - 'In X weeks'  → 7+ days away (divided by 7, rounded)
                            Badge color:
                              - danger  (red)   → happening now
                              - warning (amber) → today
                              - success (green) → tomorrow or further out
                        ── */}
                        <div className="d-flex align-items-center gap-2 ms-2">
                          {(() => {
                            // calculate how far away the reservation is from right now
                            const now = new Date();
                            const start = new Date(res.start_time);
                            const end = new Date(res.end_time);
                            const diffMs = start.getTime() - now.getTime();

                            // compare CALENDAR dates only (strip time component)
                            // this ensures Apr 22 9:00 AM vs Apr 21 10:59 PM = 1 day away
                            // rather than "less than 24 hours" which Math.floor would give 0
                            const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                            const diffDays = Math.round((startDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

                            // determine the label and badge color
                            let label = '';
                            let bg: string = 'success';

                            if (now >= start && now <= end) {
                              // reservation is actively happening right now
                              label = 'Happening now';
                              bg = 'danger';
                            } else if (diffDays < 0) {
                              // start has passed but end hasn't (shouldn't normally show, but safe fallback)
                              label = 'In progress';
                              bg = 'danger';
                            } else if (diffDays === 0) {
                              // same calendar day
                              label = 'Today';
                              bg = 'warning';
                            } else if (diffDays === 1) {
                              label = 'Tomorrow';
                              bg = 'success';
                            } else if (diffDays < 7) {
                              label = `In ${diffDays} days`;
                              bg = 'success';
                            } else {
                              // 7+ days away — show weeks
                              const weeks = Math.round(diffDays / 7);
                              label = `In ${weeks} week${weeks > 1 ? 's' : ''}`;
                              bg = 'success';
                            }

                            {/* swapped bootstrap <badge> for the tinted pill style matching the equipment badges 
                                but blue for tommorrow
                                - red for now/overdue
                                - amber for today */}
                            return (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 20,
                                flexShrink: 0,
                                backgroundColor:
                                  bg === 'danger' ? '#fdecea' :
                                  bg === 'warning' ? '#fff7ed' :
                                  '#eff6ff',  
                                color:
                                  bg === 'danger' ? '#991b1b' :
                                  bg === 'warning' ? '#92400e' :
                                  '#1d4ed8',
                                border: `1px solid ${
                                  bg === 'danger' ? '#fca5a5' :
                                  bg === 'warning' ? '#fed7aa' :
                                  '#bfdbfe'  
                                }`,
                              }}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>

                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // ── Empty state: no upcoming reservations ──────────────────────
                // bi-calendar2-x — Bootstrap Icon: calendar with X, no events
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '10px',
                    padding: '28px 16px',
                    textAlign: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <i className="bi bi-calendar2-x" style={{ fontSize: '2rem', color: '#dee2e6' }} />
                  <p className="text-muted mt-2 mb-0" style={{ fontSize: '13px' }}>
                    You have no upcoming room reservations.
                  </p>
                </div>
              )}

              {/* ── EQUIPMENT DUE DATE ITEMS ────────────────────────────────────
                  Renders each checked-out equipment item as a timeline entry.
                  Amber dot differentiates from orange room dots.
                  Badge logic:
                    - 'Overdue'   (red)   → due_at is before right now
                    - 'Due today' (amber) → due_at is same calendar day as today
                    - 'Due soon'  (amber) → due_at is a future date
                  toDateString() strips time so only the calendar date is compared.
              ── */}
              {dashboardData.equipment.map((item: any) => (
                <div key={`equip-${item.id}`} style={{ position: 'relative', marginBottom: '14px' }}>

                  {/* Amber dot — distinct from orange room dots */}
                  <div style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '8px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: '#E5A020',
                    border: '2px solid #f4f5f7',
                  }} />

                  {/* Equipment card */}
                  <div style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      {/* Item name — clean, no suffix */}
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a', marginBottom: '3px' }}>
                        {item.item_name}
                      </div>

                      {/* Type label */}
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Equipment Loan
                      </div>

                      {/* Due date — clearly labeled */}
                      <div style={{ fontSize: '12px', color: '#6c757d', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="bi bi-calendar-x" style={{ color: '#dc3545', fontSize: '11px' }} />
                        <span>Due by{' '}
                          <strong style={{ color: '#dc3545' }}>
                            {new Date(item.due_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              timeZone: 'America/Chicago'
                            })}
                          </strong>
                        </span>
                      </div>
                    </div>
                      
                    {/* bage now uses colored text on a light tinted background
                        - red tint for overdue 
                        - amber for due today
                        - green for due soon */}
                    {(() => {
                      const now = new Date();
                      const due = new Date(item.due_at);
                      const isOverdue = due < now;
                      const isDueToday = due.toDateString() === now.toDateString();
                      return (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 20,
                          flexShrink: 0,
                          backgroundColor: isOverdue ? '#fdecea' : isDueToday ? '#fff7ed' : '#f0fdf4',
                          color: isOverdue ? '#991b1b' : isDueToday ? '#92400e' : '#166534',
                          border: `1px solid ${isOverdue ? '#fca5a5' : isDueToday ? '#fed7aa' : '#bbf7d0'}`,
                        }}>
                          {isOverdue ? '⚠ Overdue' : isDueToday ? 'Due today' : 'Due soon'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))}

              {/* ── WAITLIST ITEMS ─────────────────────────────────────────────
                  Renders each active waitlist entry as a timeline item.
                  Purple dot differentiates from orange (room) and amber (equipment).
              ── */}
              {(dashboardData as any).waitlist?.map((entry: any) => (
                <div key={`waitlist-${entry.id}`} style={{ position: 'relative', marginBottom: '14px' }}>

                  {/* Purple dot — distinct from room (orange) and equipment (amber) */}
                  <div style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '8px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: '#7c3aed',
                    border: '2px solid #f4f5f7',
                  }} />

                  {/* Waitlist card */}
                  <div style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      {/* Room name + waitlist label */}
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a', marginBottom: '2px' }}>
                        {entry.room_name} · Waitlisted
                      </div>

                      {/* Time slot if available */}
                      {entry.room_start_time && (
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {formatDateTime(entry.room_start_time)}
                          {entry.room_end_time && (
                            <> – {new Date(entry.room_end_time).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit',
                              timeZone: 'America/Chicago', hour12: true,
                            })}</>
                          )}
                        </div>
                      )}

                      {/* Position in queue */}
                      <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '3px', fontWeight: 500 }}>
                        Position {entry.position} of {entry.total} in queue
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge
                      style={{
                        backgroundColor: entry.status === 'notified' ? '#7c3aed' : '#6c757d',
                        color: '#fff',
                        fontSize: '11px',
                        flexShrink: 0,
                      }}
                    >
                      {entry.status === 'notified' ? 'Notified — Book Now' : 'Waitlisted'}
                    </Badge>
                  </div>
                </div>
              ))}

              {/* ── End-of-timeline gray dot ────────────────────────────────────
                  Caps the vertical line. Italic text signals end of activity.
              ── */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '4px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#dee2e6',
                  border: '2px solid #f4f5f7',
                }} />
                 <div style={{ fontSize: '12px', color: '#adb5bd', fontStyle: 'italic', paddingLeft: '2px' }}>
                    Nothing else scheduled
                  </div>
                </div>
                {/* END timeline container */}

              </div>
              {/* END timeline paddingLeft wrapper */}

              

            {/* ── Quick action buttons below the timeline ──────────────────────
                Two side-by-side buttons giving fast access to the two most
                common actions after reviewing upcoming activity.
                Button 1: Book a Space  → /study-spaces (orange, primary)
                Button 2: View Inventory → /equipment   (outline, secondary)
                borderTop → visual separator from the timeline above.
            ── */}
            <div
              className="d-flex gap-2 mt-4 pt-3"
              style={{ borderTop: '1px solid #e9ecef' }}
            >
              {/* Primary: Book a Space — brand orange
                  bi-calendar2-check — Bootstrap Icon: calendar + checkmark */}
              <button
                onClick={() => navigate('/study-spaces')}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#C0421A',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <i className="bi bi-calendar2-check" style={{ fontSize: '13px' }} />
                + Book a Space
              </button>

              {/* Secondary: View Inventory — outline style
                  bi-laptop — Bootstrap Icon: laptop outline */}
              <button
                onClick={() => navigate('/equipment')}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  backgroundColor: '#fff',
                  color: '#495057',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <i className="bi bi-laptop" style={{ fontSize: '13px' }} />
                View Inventory
              </button>
            </div>
          </div>
          {/* END LEFT COLUMN */}


          {/* ── RIGHT COLUMN: Stacked sidebar cards ──────────────────────────
              Fixed 248px width. Two cards stacked vertically with 12px gap:
                Card 1 — Notifications
                 Card 2 — Library Clerk (AI placeholder)
              paddingTop: 52px → aligns card tops with the timeline start.
          ── */}
          <div style={{
            width: '360px',
            flexShrink: 0,
            padding: '20px 14px',
            paddingTop: '52px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f4f5f7',
          }}>

            {/* ── CARD 1: Notifications ──────────────────────────────────────
                Shows first 2 unread notifications inline.
                notifications state polled every 10s by fetchNotifications().
                markAllRead() → POST /notifications/mark-read/, clears state.
                "Reserve now" → markAllRead() + navigate('/study-spaces').
                Empty state: bi-bell-slash icon.
            ── */}
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '10px',
              padding: '14px',
            }}>
              <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '10px' }}>
                <div className="d-flex align-items-center" style={{ gap: 10, fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#C0421A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                  }}>
                    <i className="bi bi-bell-fill" style={{ fontSize: 14, color: '#fff' }} />
                  </div>
                  Notifications
                </div>
                {/* Bootstrap Badge — danger red, only renders when unread count > 0 */}
                {notifications.length > 0 && (
                  <Badge bg="danger" style={{ fontSize: '10px' }}>{notifications.length}</Badge>
                )}
              </div>

              {notifications.length > 0 ? (
                <>
                  {/* First 2 notifications only — full list via bell dropdown in navbar */}
                  {notifications.slice(0, 2).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        padding: '6px 0',
                        borderBottom: '1px solid #f0f0f0',
                        lineHeight: 1.4,
                      }}
                    >
                      {/* "New:" in brand orange draws attention to actionable items */}
                      <span style={{ fontWeight: 600, color: '#C0421A', marginRight: '4px' }}>New:</span>
                      {n.message}
                    </div>
                  ))}

                  <div className="d-flex gap-2 mt-2">
                    {/* Mark all read — POST /notifications/mark-read/ */}
                    <Button
                      variant="outline-secondary" size="sm"
                      style={{ flex: 1, fontSize: '11px', borderRadius: '8px' }}
                      onClick={markAllRead}
                    >
                      Mark all read
                    </Button>
                    {/* Reserve now — markAllRead + navigate to study spaces */}
                    <Button
                      size="sm"
                      style={{
                        flex: 1, fontSize: '11px', borderRadius: '8px',
                        backgroundColor: '#C0421A', borderColor: '#C0421A',
                      }}
                      onClick={() => { markAllRead(); navigate('/study-spaces'); }}
                    >
                      Reserve now
                    </Button>
                  </div>
                </>
              ) : (
                // Empty state — no unread notifications
                <div className="text-center py-2">
                  {/* bi-bell-slash — Bootstrap Icon: bell with slash, no notifications */}
                  <i className="bi bi-bell-slash" style={{ fontSize: '1.4rem', color: '#dee2e6' }} />
                  <p className="text-muted mt-2 mb-0" style={{ fontSize: '12px' }}>No new notifications.</p>
                </div>
              )}
            </div>
            {/* END CARD 1: Notifications */}

            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '10px',
              padding: '14px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div className="d-flex align-items-center" style={{ gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #534AB7 0%, #185FA5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 auto',
                }}>
                  <i className="bi bi-chat-dots-fill" style={{ fontSize: '14px', color: '#fff' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                  Library Clerk
                </div>
              </div>

              <div style={{
                fontSize: '11px',
                color: '#6c757d',
                lineHeight: 1.45,
                marginBottom: '12px',
                overflowWrap: 'anywhere',
              }}>
                AI-powered help with bookings and equipment.
              </div>

              <div style={{ flex: 1, minHeight: 0 }}>
                <Chatbot onMutation={fetchDashboard} />
              </div>
            </div>


          </div>
          {/* END RIGHT COLUMN */}

        </div>

        {/* END SECTION 3 — BODY ROW */}


        

      </main>
      {/* END main */}

      {/* Footer — existing Footer component, completely unchanged */}
      <Footer />

    </div>
  );
};
export default Dashboard;
