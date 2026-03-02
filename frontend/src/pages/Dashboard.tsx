// this is the main dashboard page for students, it will show a summary of their activity (i.e. active reservations, equipment loans, etc.) and provide links to the different sections of the dashboard (i.e. room reservations, equipment loans, etc.)
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Badge } from 'react-bootstrap'; // list group will be used to show a list of upcoming reservations and loans, badge will be used to show the number of active reservations and loans
import { useNavigate } from 'react-router-dom'; // we will use navigate to redirect users to the room reservation and equipment inventory pages when they click the buttons on the dashboard summary cards, this is a better user experience than just showing them a summary without a clear cta
import StudentHeader from '../components/StudentHeader'; // importing the student header which has the navbar for the dashboard and related pages --> finishing this later, 
import Footer from '../components/Footer';
import { api } from '../api';  // added to import centrailized axios instance for be calls


const Dashboard = () => {
  const navigate = useNavigate(); // react-router-dom hook for navigation to other pages using buttons from the dashboard  

  // initializing state with 0 to reflect that a new user starts with no activity.
  // we explicitly show "0" rather than hiding the section to provide clear feedback to the user about their current status and encourage them to engage with the library's resources
  
  // removed the three separate state variables and converted it to one single object below to update entire dashboard in one go

  // this stores the entire dashboard response object in one state, keeping everything synchronized and making it easier to manage 
  // (updating and accessing the datat simpler than using multiple states like before)
  const [dashboardData, setDashboardData] = useState ({
    activeRooms: 0, // number of study rooms reserved by current user
    activeComputers: 0, // number of computers reserved
    equipmentLoans: 0, // number of equipment items checkout
    reservations: [], // list of upcoming reservations (later, need to display them with the listgroup)
    equipment: [] // list of equipment the user has checkout out
  });

  /* useEffect will run once when the component loads. 
  so when the user lands on dashboard, it will immediately request live data from the be
  where the be will calculate the real reservation and loans */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // using our axios instance : baseUrl is automatically applied
        // GET request to be dashboard summary endpoint
        const response = await api.get("/user/dashboard-summary/", {
          withCredentials: true // already on settings
        });

        // response.data contains a JSON object with activerooms and so on
        // set this as the new dashboard state
        setDashboardData(response.data);
      }
      catch (error) {
        console.error("Dashboard fetch failed: ", error);
      }
    };

    fetchDashboard(); // calls the async function
  }, []); // an empty dependency array so will run only once when component mounts

  return (
    <div className="d-flex flex-column min-vh-100" style= {{ paddingTop: '56px' }}> {/* paddingTop added to prevent content from being hidden behind the fixed navbar */}
      <StudentHeader />
      <main className="flex-grow-1 dashboard-page">
        <Container className="py-5">
          <header className="mb-5">
            <h1 className="fw-bold">Student Dashboard</h1>
            <p className="text-muted">Welcome back! Here is your library activity at a glance.</p>
          </header>
{/* 
****room reservations card no longer needed as we updated to 'Study Spaces' to encompass rooms and computers as planned in key features***
plan is to have a single 'Study Spaces' card that shows active room and computer reservations with separate badges for each, this simplifies the dashboard and provides a clearer overview of the user's study space activity
it will contain info about upcoming reservations and a cta button to book a new space, this encourages user engagement and makes it easy for them to manage their study space reservations directly from the dashboard
later on once reservations are implemented, we can add a list group below the summary info to show details of upcoming reservations (e.g. date, time, location) for both rooms and computers, this provides users with 
quick access to their reservation details without having to navigate to a separate page
*/}
          <Row className="g-4">
            {/* study spaces summary card */}
            <Col lg={6}>
              <Card className="h-100 shadow-lg border-0 study-spaces-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h3 className="h5 fw-bold">Study Spaces</h3>
                      <p className="text-muted small">Your upcoming study sessions.</p>
                    </div>
                    <Badge bg={dashboardData.activeRooms > 0 ? "primary" : "secondary"} pill>
                      {dashboardData.activeRooms} Rooms Active
                    </Badge>
                    <Badge bg={dashboardData.activeComputers > 0 ? "primary" : "secondary"} pill>
                      {dashboardData.activeComputers} Computers Active
                    </Badge>
                  </div>
                  
                  <div className="py-4 text-center">
                    {dashboardData.activeRooms === 0 && dashboardData.activeComputers === 0 ? (
                      <p className="text-muted italic">You currently have 0 active reservations.</p>
                    ) : (
                      <p>You have scheduled sessions.</p>
                    )}
                    <Button variant="outline-primary" size="sm" onClick={() => navigate('/study-spaces')}>Book a Space</Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* equipment loans summary cardd*/}
            <Col lg={6}>
              <Card className="h-100 shadow-lg border-0 equipment-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h3 className="h5 fw-bold">Equipment on Loan</h3>
                      <p className="text-muted small">Track your borrowed tech.</p>
                    </div>
                    <Badge bg={dashboardData.equipmentLoans > 0 ? "success" : "secondary"} pill>
                      {dashboardData.equipmentLoans} Items
                    </Badge>
                  </div>

                  <div className="py-4 text-center">
                    {dashboardData.equipmentLoans === 0 ? (
                      <p className="text-muted italic">You currently have 0 items checked out.</p>
                    ) : (
                      <p>Check your return dates.</p>
                    )}
                    <Button variant="outline-success" size="sm" onClick={() => navigate('/equipment')}>View Inventory</Button>
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