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
    setBookingData((prev) => ({
      ...prev,
      resource: roomName,
      date: "",
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

    // Build ISO timestamps (Django DateTimeField expects full datetime)
    // This uses the user's local time interpretation; for production you’d standardize timezone.
    const startISO = new Date(`${bookingData.date}T${bookingData.startTime}:00`).toISOString();
    const endISO = new Date(`${bookingData.date}T${bookingData.endTime}:00`).toISOString();

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
                  <Form.Control
                    type="date"
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                  />
                </Form.Group>

                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control
                        type="time"
                        value={bookingData.startTime}
                        onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                      />
                    </Form.Group>
                  </Col>

                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>End Time</Form.Label>
                      <Form.Control
                        type="time"
                        value={bookingData.endTime}
                        onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                      />
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