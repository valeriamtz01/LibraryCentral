// this is the main dashboard page for students, it will show a summary of their activity (i.e. active reservations, equipment loans, etc.) and provide links to the different sections of the dashboard (i.e. room reservations, equipment loans, etc.)
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Badge } from 'react-bootstrap'; // list group will be used to show a list of upcoming reservations and loans, badge will be used to show the number of active reservations and loans
import { useNavigate } from 'react-router-dom'; // we will use navigate to redirect users to the room reservation and equipment inventory pages when they click the buttons on the dashboard summary cards, this is a better user experience than just showing them a summary without a clear cta
import StudentHeader from '../components/StudentHeader'; // importing the student header which has the navbar for the dashboard and related pages --> finishing this later, 
import Footer from '../components/Footer';
import { api } from '../api';  // added to import centrailized axios instance for be calls
import 'bootstrap-icons/font/bootstrap-icons.css';

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
    equipment: [] // list of equipment the user has checkout out
  });

  // fetchDashboard inside useEffect:
  /* useEffect will run once when the component loads. 
  so when the user lands on dashboard, it will immediately request live data from the be
  where the be will calculate the real reservation and loans */
  // sends an authenticated GET request to the be
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // using our axios instance : baseUrl is automatically applied
        // GET request to be dashboard summary endpoint
        const response = await api.get("/user/dashboard-summary/", {
          withCredentials: true // already on settings (ensures the browser sends the session token so django knows which student is asking for data)
        });

        // response.data contains a JSON object with activerooms and so on
        // set this as the new dashboard state
        // updates the unified state with the full object from be
        setDashboardData(response.data);
      }
      catch (error) {
        console.error("Dashboard fetch failed: ", error);
      }
    };

    fetchDashboard(); // calls the async function
  }, []); // empty array makes sure we only hit the server once on mount

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
  if (!window.confirm("Are you sure you want to cancel this reservation?")) return;

  try {
    // call the be to delete
    await api.delete(`/reservations/${reservationId}/`, {
      withCredentials: true
    });

    // update local state to remove the deleted item
    setDashboardData(prev => ({
      ...prev,
      reservations: prev.reservations.filter((res: any) => res.id !== reservationId),
      // this is optional to decrement the count if our fe relies on it
      activeRooms: prev.activeRooms - 1 
    }));
    
    alert("Reservation cancelled successfully.");
  } catch (error) {
    console.error("Failed to delete reservation:", error);
    alert("Could not cancel reservation. Please try again.");
  }
};

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
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h3 className="h5 fw-bold">Study Spaces</h3>
                      <p className="text-muted small">Your upcoming study sessions.</p>
                    </div>
                    <div className="d-flex gap-1">
                        <Badge bg={dashboardData.activeRooms > 0 ? "primary" : "secondary"} pill>
                          {dashboardData.activeRooms} Rooms Active
                        </Badge>
                        <Badge bg={dashboardData.activeComputers > 0 ? "primary" : "secondary"} pill>
                          {dashboardData.activeComputers} Computers Active
                        </Badge>
                    </div>
                  </div>
                  
                  <div className="flex-grow-1">
                    {/* list rendering with .map() => dynamically generates a ListGroup.Item for every object in the array*/}
                    {dashboardData.reservations.length > 0 ? (
                      <ListGroup variant="flush" className="mb-3">

                        {/* corrected => loop through reservations here */}
                        {dashboardData.reservations.map((res: any) => (
                          <ListGroup.Item key={res.id} className="px-0 py-3 bg-transparent">
                            <div className="d-flex justify-content-between align-items-center">
                              
                              {/* grouping the delete + text together in one div */}
                              <div className="d-flex align-items-center">
                                <Button 
                                  variant="link" 
                                  className="text-danger p-0 me-2" // reduced it from me-3 to me-2
                                  onClick={() => handleDeleteReservation(res.id)}
                                  title="Cancel Reservation"
                                  style={{ lineHeight: 1 }} // ensuring the button doesn't add extra height
                                >
                                  <i className="bi bi-trash3-fill"></i>
                                </Button>
                                
                                <div>
                                  <h6 className="mb-0 fw-bold">{res.room_name}</h6> 
                                  <small className="text-muted">
                                    {/* start time and date: the 'formatDateTime' helper function displays both the date and the time
                                        so this establishes the 'day' of the reservation (ex: Mar 10) so that the student know exactly which
                                        date they are looking at without needing a seprate column */}

                                    {/* new Date(res.end_time) -> converts the UTC string from the database (ending in z) into a js date object
                                        .toLocaleTimeString -> extracts only the time portion (hour:minute am/pm) */}  
                                    {formatDateTime(res.start_time)} - {new Date(res.end_time).toLocaleTimeString('en-US', { 
                                      hour: '2-digit',  // ensures consistent spacing in the interface (like 07:00 instead of 7:00)
                                      minute: '2-digit',  
                                      timeZone: 'America/Chicago', // fix for the five hour jump. even if set to a different timezone, this forces display to match utrgv campus time (central time). it does calculate for daylight saving time
                                      hour12: true // matches the utrgv library's standard 12 hour clock format
                                    })}
                                  </small>
                                </div>
                              </div>

                              <Badge bg="success">Confirmed</Badge>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-muted italic">You currently have 0 active reservations.</p> {/* replaces an empty list with the message */}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-top text-center">
                    <Button variant="outline-primary" size="sm" onClick={() => navigate('/study-spaces')}>
                      Book a Space
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* equipment loans summary cardd*/}
            <Col lg={6}>
              <Card className="h-100 shadow-lg border-0 equipment-card">
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h3 className="h5 fw-bold">Equipment on Loan</h3>
                      <p className="text-muted small">Track your borrowed tech.</p>
                    </div>
                    <Badge bg={dashboardData.equipmentLoans > 0 ? "success" : "secondary"} pill>
                      {dashboardData.equipmentLoans} Items
                    </Badge>
                  </div>

                  <div className="flex-grow-1">
                    {dashboardData.equipment.length > 0 ? (
                      <ListGroup variant="flush" className="mb-3">
                        {/* corrected => loop through equipment here */}
                        {dashboardData.equipment.map((item: any) => (
                          <ListGroup.Item key={item.id} className="px-0 py-3 bg-transparent">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="mb-0 fw-bold">{item.item_name}</h6>
                                <small className="text-danger">
                                  Due: {item.due_at ? new Date(item.due_at).toLocaleDateString() : 'N/A'} {/* corrected the varirable na,e */}
                                </small>
                              </div>
                              <i className="bi bi-laptop text-muted"></i>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-muted italic">You currently have 0 items checked out.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-top text-center">
                    <Button variant="outline-success" size="sm" onClick={() => navigate('/equipment')}>
                      View Inventory
                    </Button>
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