// this is the main dashboard page for students, it will show a summary of their activity (i.e. active reservations, equipment loans, etc.) and provide links to the different sections of the dashboard (i.e. room reservations, equipment loans, etc.)
import { useState } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Badge } from 'react-bootstrap'; // list group will be used to show a list of upcoming reservations and loans, badge will be used to show the number of active reservations and loans
import StudentHeader from '../components/StudentHeader'; // importing the student header which has the navbar for the dashboard and related pages --> finishing this later, 
import Footer from '../components/Footer';

const Dashboard = () => {
  // initializing state with 0 to reflect that a new user starts with no activity.
  // we explicitly show "0" rather than hiding the section to provide clear feedback to the user about their current status and encourage them to engage with the library's resources
  const [activeReservations, setActiveReservations] = useState(0); // this will eventually be populated with data from the backend API to show the user's current active room reservations. starting with 0 for new users.
  const [equipmentLoans, setEquipmentLoans] = useState(0); // likewise, this will be populated with data from the backend API to show the user's current active equipment loans. starting with 0 for new users.

  return (
    <div className="d-flex flex-column min-vh-100">
      <StudentHeader />
      <main className="flex-grow-1 dashboard-page">
        <Container className="py-5">
          <header className="mb-5">
            <h1 className="fw-bold">Student Dashboard</h1>
            <p className="text-muted">Welcome back! Here is your library activity at a glance.</p>
          </header>

          <Row className="g-4">
            {/* room reservations summary card */}
            <Col lg={6}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h3 className="h5 fw-bold">Room Reservations</h3>
                      <p className="text-muted small">Your upcoming study sessions.</p>
                    </div>
                    <Badge bg={activeReservations > 0 ? "primary" : "secondary"} pill>
                      {activeReservations} Active
                    </Badge>
                  </div>
                  
                  <div className="py-4 text-center">
                    {activeReservations === 0 ? (
                      <p className="text-muted italic">You currently have 0 active reservations.</p>
                    ) : (
                      <p>You have scheduled sessions.</p>
                    )}
                    <Button variant="outline-primary" size="sm">Book a Room</Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* equipment loans summary cardd*/}
            <Col lg={6}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h3 className="h5 fw-bold">Equipment on Loan</h3>
                      <p className="text-muted small">Track your borrowed tech.</p>
                    </div>
                    <Badge bg={equipmentLoans > 0 ? "success" : "secondary"} pill>
                      {equipmentLoans} Items
                    </Badge>
                  </div>

                  <div className="py-4 text-center">
                    {equipmentLoans === 0 ? (
                      <p className="text-muted italic">You currently have 0 items checked out.</p>
                    ) : (
                      <p>Check your return dates.</p>
                    )}
                    <Button variant="outline-success" size="sm">View Inventory</Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </main>
      <Footer/>
    </div>
  );
};

export default Dashboard;