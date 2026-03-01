import { useState } from 'react';
import { Container, Row, Col, Button, ButtonGroup, Card } from 'react-bootstrap';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';
import FloorMap from '../components/FloorMap';
import { Modal, Form } from 'react-bootstrap';

const StudySpaces = () => {

  const [selectedFloor, setSelectedFloor] = useState(2); // use to track which floor is currently selected (2nd or 3rd)
  // we'll use "2" as the default since the 2nd floor has both rooms and computers

  // mock data to simulate the data we'd get from the backed
  // represents the current "Live" status of the library
  const [roomStatuses, setRoomStatuses] = useState({
    "Room 2.111": "occupied",
    "Room 2.100A": "occupied",
    "Room 2.100B": "available",
    "Room 3.111A": "occupied",
  });

  // booking modal
  const [showModal, setShowModal] = useState(false); // state to control whether the booking modal is shown
  const [bookingData, setBookingData] = useState({
    resource: "", // the name of the room or computer being booked
    date: "", // the date of the reservation
    startTime: "", // the start time of the reservation
    endTime: "" // the end time of the reservation
  });

  // this function will be called when a user clicks on a room hotspot on the map - it will open the booking modal and pre-fill the "resource" field with the name of the room that was clicked
  const handleRoomClick = (roomName: string) => {
    // when a room hotspot is clicked on the map, we want to open the booking modal and pre-fill the "resource" field with the name of the room
    setBookingData(prev => ({ ...prev, resource: roomName }));
    setShowModal(true);
  };

  // this function will be called when the user clicks the "Confirm Reservation" button in the booking modal - for now it just updates the map color locally and shows an alert, but later we'll implement proper booking logic to save the reservation data to the backend and check for conflicts, etc.
  const confirmBooking = () => {
    // updates the map color to 'occupied' locally
    setRoomStatuses(prev => ({
      ...prev,
      [bookingData.resource]: 'occupied'
    }));
    
    // closes modal
    setShowModal(false);
    alert(`Success! ${bookingData.resource} has been reserved.`);
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: '56px' }}>
      <StudentHeader />
      
      <main className="flex-grow-1">
        <Container className="py-5">

          <header className="mb-4 d-flex justify-content-between align-items-center">
            
            <div>
              <h1 className="fw-bold">Study Spaces</h1>
              <p className="text-muted">Select a floor to view available rooms and computers.</p>
            </div>

            {/* floor selection toggle */}
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
            {/* the live map container */}
            <Col lg={9}>
            <FloorMap 
              floor={selectedFloor} 
              onRoomSelect={handleRoomClick} 
              statuses={roomStatuses} />
            </Col>

            {/* legend & filter sidebar */}
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
                    <li><i className="bi bi-door-closed me-2"></i> Study Rooms</li>
                    {/* only show computer availability info if on floor 2 */}
                    {selectedFloor === 2 ? (
                      <li className="mt-2 text-primary"><i className="bi bi-pc-display me-2"></i> Computers Available</li>
                    ) : (
                      <li className="mt-2 text-muted italic"><i className="bi bi-pc-display me-2"></i> No Computers on this floor</li>
                    )}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>

        {/* booking modal - this will be shown when a user clicks on a room hotspot on the map, and will allow them to select a date and time for their reservation and confirm the booking 
        currently this is just to make sure flow is working. later we'll implement proper booking logic */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Book {bookingData.resource}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Reservation Date</Form.Label>
                <Form.Control type="date" onChange={(e) => setBookingData({...bookingData, date: e.target.value})} />
              </Form.Group>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control type="time" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time</Form.Label>
                    <Form.Control type="time" />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmBooking}>Confirm Booking</Button>
            {/* 
              // later we need to make sure to validate the input data and check for conflicts before confirming the reservation, but for now we'll just show an alert with the selected resource and close the modal
              // also note that right now the date and time fields aren't actually connected to our state, so they won't do anything - we'll need to add state for those and update it on change in order to use that data when confirming the reservation
              // irl we'd also want to disable the confirm button until valid date/time inputs are provided, but for now this is just a placeholder to show how the booking flow will work
              // irl we'd also need to decide if bookings can only be made for the current day or if users can book in advance, etc. - this will affect how we implement the date selection and validation logic
              // irl we'd also need to decide if bookings can only be made for whole hour increments or if we want to allow more flexible start/end times, etc. - this will again affect how we implement the time selection and validation logic
             */}
          </Modal.Footer>
        </Modal>

        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default StudySpaces;