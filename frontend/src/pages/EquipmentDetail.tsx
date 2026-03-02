// This page will display detailed information about a specific piece of equipment, including its description, use, loan period, location, and a larger image. 
// It will also include a checkout button that allows students to borrow the equipment if it is available. 
// When the checkout button is clicked, a confirmation modal will appear with the checkout guidelines and a summary of the selected equipment. Students must accept the guidelines before they can complete the checkout process. 
// After confirming, the equipment's availability status will be updated accordingly.
//includes state/modals for checkout confirmation and guidelines acceptance, as well as a success message after checkout is completed.
//manages the mocked checkout process by updating the available quantity of the equipment and recording the checkout history in the component's state.
import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Modal, Form } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';
import './EquipmentDetail.css';
import { api } from '../api'; // axios instance configured for the be calls

//represents a single checkout record for an equipment item, including the date it was checked out, the quantity, and optionally who checked it out.
interface CheckoutRecord {
  checkedOutAt: Date;
  quantity: number;
  checkedOutBy?: string;
}

//represents a equipment item.
interface Equipment {
  id: number;
  name: string;
  category: string;
  description: string;
  use: string;
  loanPeriod: string;
  location: string;
  photoUrl: string;
  totalQuantity: number;
  availableQuantity: number;
  checkoutHistory: CheckoutRecord[];
}

const EquipmentDetail = () => {
  const navigate = useNavigate(); //used to programmatically navigate the user back to the equipment list page after viewing the details of a specific equipment item.
  const { id } = useParams<{ id: string }>(); //get equip id from url
  
  // state variables
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(null); // equipment data stored
  const [loading, setLoading] = useState(true); // show loading while fetching
  const [showConfirmation, setShowConfirmation] = useState(false); // shows and hides the checkout modal
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false); // checkbox for agreeing to rules
  const [showSuccess, setShowSuccess] = useState(false); // shows successful modal after checkout


  // IMPO - these data has been added to the seed file so it can be added to the database, can delete once reviewed
  /*  Equipment data - hard-coded subject to change(?)
  const allEquipment: Equipment[] = [
    {
      id: 1,
      name: 'DVDs',
      category: 'Media',
      description: 'Collection of educational and entertainment DVDs',
      use: 'Can be borrowed for personal viewing, classroom presentations, or research purposes',
      loanPeriod: '7 days',
      location: 'Media Library - Shelf A1',
      photoUrl: 'https://via.placeholder.com/400x300?text=DVDs',
      totalQuantity: 25,
      availableQuantity: 25,
      checkoutHistory: [],
    },
    {
      id: 2,
      name: 'CDs',
      category: 'Media',
      description: 'Audio CDs including music, audiobooks, and educational content',
      use: 'For music listening, audiobook review, or audio project work',
      loanPeriod: '7 days',
      location: 'Media Library - Shelf B2',
      photoUrl: 'https://via.placeholder.com/400x300?text=CDs',
      totalQuantity: 25,
      availableQuantity: 25,
      checkoutHistory: [],
    },
    {
      id: 3,
      name: 'Digital Camcorder',
      category: 'Media',
      description: 'Professional digital camcorders for video recording projects',
      use: 'Student projects, documentaries, and research video documentation',
      loanPeriod: '3 days',
      location: 'Media Center - Equipment Room',
      photoUrl: 'https://via.placeholder.com/400x300?text=Camcorder',
      totalQuantity: 10,
      availableQuantity: 10,
      checkoutHistory: [],
    },
    {
      id: 4,
      name: 'Digital Camera',
      category: 'Media',
      description: 'Digital cameras for photography and image capture',
      use: 'Photography projects, presentations, research documentation',
      loanPeriod: '3 days',
      location: 'Media Center - Equipment Room',
      photoUrl: 'https://via.placeholder.com/400x300?text=Camera',
      totalQuantity: 8,
      availableQuantity: 0,
      checkoutHistory: [{ checkedOutAt: new Date('2026-02-20'), quantity: 8 }],
    },
    {
      id: 5,
      name: 'Laptops (MacBook and PC)',
      category: 'Electronics',
      description: 'MacBook Pro and Dell XPS laptops for computing needs',
      use: 'Assignments, research, coding projects, and general computing',
      loanPeriod: '24 hours (can be renewed)',
      location: 'Tech Center - Laptop Station',
      photoUrl: 'https://via.placeholder.com/400x300?text=Laptops',
      totalQuantity: 50,
      availableQuantity: 50,
      checkoutHistory: [],
    },
    {
      id: 6,
      name: 'Mobile Phone Charger',
      category: 'Accessories',
      description: 'Various phone chargers compatible with most devices',
      use: 'Charging mobile devices, emergency use',
      loanPeriod: '24 hours',
      location: 'Tech Center - Accessories Counter',
      photoUrl: 'https://via.placeholder.com/400x300?text=Charger',
      totalQuantity: 30,
      availableQuantity: 30,
      checkoutHistory: [],
    },
    {
      id: 7,
      name: 'Projector',
      category: 'Electronics',
      description: 'High-definition projectors for presentations and screenings',
      use: 'Class presentations, events, movie screenings',
      loanPeriod: '1 day',
      location: 'presentation Room - Storage',
      photoUrl: 'https://via.placeholder.com/400x300?text=Projector',
      totalQuantity: 15,
      availableQuantity: 15,
      checkoutHistory: [],
    },
    {
      id: 8,
      name: 'Graphing Calculator (TI-84 CE Plus)',
      category: 'Supplies',
      description: 'TI-84 CE Plus graphing calculators for mathematics',
      use: 'Math courses, scientific calculations, engineering work',
      loanPeriod: 'Semester',
      location: 'Math Tutoring Center',
      photoUrl: 'https://via.placeholder.com/400x300?text=Calculator',
      totalQuantity: 65,
      availableQuantity: 0,
      checkoutHistory: [{ checkedOutAt: new Date('2026-02-19'), quantity: 65 }],
    },
    {
      id: 9,
      name: 'Graphing Calculator (models vary, batteries not included)',
      category: 'Supplies',
      description: 'Various graphing calculator models for mathematics courses',
      use: 'Math courses, scientific calculations, problem solving',
      loanPeriod: 'Semester',
      location: 'Math Tutoring Center',
      photoUrl: 'https://via.placeholder.com/400x300?text=Calculator2',
      totalQuantity: 55,
      availableQuantity: 55,
      checkoutHistory: [],
    },
    {
      id: 10,
      name: 'iPad',
      category: 'Electronics',
      description: 'iPad tablets for note-taking and academic work',
      use: 'Digital note-taking, research, multimedia projects',
      loanPeriod: '24 hours (can be renewed)',
      location: 'Tech Center - Mobile Devices',
      photoUrl: 'https://via.placeholder.com/400x300?text=iPad',
      totalQuantity: 20,
      availableQuantity: 20,
      checkoutHistory: [],
    },
    {
      id: 11,
      name: 'Headphones',
      category: 'Accessories',
      description: 'Quality headphones for audio work and listening',
      use: 'Multimedia projects, language learning, audio editing',
      loanPeriod: '24 hours',
      location: 'Tech Center - Accessories',
      photoUrl: 'https://via.placeholder.com/400x300?text=Headphones',
      totalQuantity: 7,
      availableQuantity: 7,
      checkoutHistory: [],
    },
    {
      id: 12,
      name: 'HDMI Cable',
      category: 'Accessories',
      description: 'HDMI cables for video and audio connections',
      use: 'Connecting devices to projectors, TVs, and displays',
      loanPeriod: '24 hours',
      location: 'Tech Center - Cables',
      photoUrl: 'https://via.placeholder.com/400x300?text=HDMI+Cable',
      totalQuantity: 7,
      availableQuantity: 7,
      checkoutHistory: [],
    },
    {
      id: 13,
      name: 'Mouse',
      category: 'Accessories',
      description: 'Computer mice for desktop and laptop use',
      use: 'Computer navigation and work',
      loanPeriod: '24 hours',
      location: 'Tech Center - Peripherals',
      photoUrl: 'https://via.placeholder.com/400x300?text=Mouse',
      totalQuantity: 20,
      availableQuantity: 20,
      checkoutHistory: [],
    },
    {
      id: 14,
      name: 'Screenflex Portable Display Panels',
      category: 'Supplies',
      description: 'Portable room dividers and display panels for events',
      use: 'Creating spaces for presentations, exhibitions, and events',
      loanPeriod: '3 days',
      location: 'Event Space - Storage',
      photoUrl: 'https://via.placeholder.com/400x300?text=Display+Panels',
      totalQuantity: 5,
      availableQuantity: 5,
      checkoutHistory: [],
    },
  ];
  */

  // fetch the equipment data from backend when the page loads or the id changes
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await api.get(`/equipment/${id}/`, { withCredentials: true });  // makes GET request to be API for the specific equipment (withcredentials not necessary, delete later)
        setCurrentEquipment(response.data); // set fetched equipment in state
      }
      catch (error) {
        console.error('Failed to fetch equipment: ', error);
      }
      finally {
        setLoading(false); // stop loading spinner
      }
    };

    fetchEquipment();
  }, [id]); // dependency array ensures fetch runs if the id changes

  // show loading message while fetching data 
   if (loading) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: '56px' }}>
        <StudentHeader />
        <main className="flex-grow-1">
          <Container className="py-5 text-center">
            <p>Loading equipment details...</p>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

/*load state copy of the equipment
  const equipment = allEquipment.find(item => item.id === Number(id));
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(
    equipment ? { ...equipment } : null
  ); */



//if equipment is not found, show a 'not found' page with a back button
  if (!currentEquipment) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: '56px' }}>
        <StudentHeader />
        <main className="flex-grow-1">
          <Container className="py-5">
            <div className="text-center">
              <h2>Equipment not found</h2>
              <Button variant="primary" onClick={() => navigate('/equipment')} className="mt-3">
                Back to Equipment
              </Button>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  //opens checkout confirmation modal when checkout button is clicked
  const handleCheckout = () => {
    setShowConfirmation(true);
  };

  //handle final checkout lofic whe user confirms guidelines
  const handleConfirmCheckout = async () => {
    try {
      if (!currentEquipment) return; // safetu check

      // 1. Calculate a due date for the equipment (as of right now, it is 24 hours after??)
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24); 

      // 2. Send POST request to be to create a checkout record 
      // CheckoutSerializer expects "item" (the ID) and "due_at"
      await api.post(
        "/checkouts/", 
        { 
          item: currentEquipment.id, 
          due_at: dueDate.toISOString() 
        },
        { withCredentials: true }
      );
 
      // 3. Update frontend state to reflect the checkout
      setCurrentEquipment(prev =>
        prev
          ? {
              ...prev,
              availableQuantity: 0, // assume a single item checkout out
              status: 'CHECKED_OUT', // updates the status
            }
          : null
      );

      setShowConfirmation(false); // close confirmation and show success modal
      setShowSuccess(true);
      setAcceptedGuidelines(false); // reset guidelines checkbox
    } catch (error: any) {
      console.error('Checkout failed:', error.response?.data || error.message);
      // show alert when specific be error if checkout fails
      alert(`Checkout failed: ${JSON.stringify(error.response?.data || 'Server error')}`);
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: '56px' }}>
      <StudentHeader />

      <main className="flex-grow-1">
        <Container className="py-5">
          {/* Back Button */}
          <Button
            variant="link"
            className="mb-4 p-0"
            onClick={() => navigate('/equipment')}
          >
            <i className="bi bi-chevron-left"></i> Back to Equipment
          </Button>
           
          <Row className="mb-5">
            {/* Product Image */}
            <Col lg={6} className="mb-4">
              <Card className="border-0 shadow-sm overflow-hidden">
                <Card.Img
                  variant="top"
                  src={currentEquipment.photoUrl}
                  alt={currentEquipment.name}
                  className="equipment-detail-image"
                />
              </Card>
            </Col>

            {/* Product Details */}
            <Col lg={6}>
              <div className="equipment-details">
                <h1 className="fw-bold mb-2">{currentEquipment.name}</h1>
                <p className="text-muted mb-4">
                  <span className="badge bg-light text-dark">{currentEquipment.category}</span>
                </p>

                {/* Availability Status */}
                <div className="availability-box mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-muted small mb-1">Availability</p>
                      <h5 className="fw-bold mb-0">
                        {currentEquipment?.availableQuantity && currentEquipment.availableQuantity > 0 ? (
                          <span className="text-success">Available</span>
                        ) : (
                          <span className="text-danger">Unavailable</span>
                        )}
                      </h5>
                    </div>
                    <div className="text-center">
                      <p className="text-muted small mb-1">In Stock</p>
                      <h5 className="fw-bold mb-0">
                        {currentEquipment?.availableQuantity}/{currentEquipment?.totalQuantity}
                      </h5>
                    </div>
                  </div>
                </div>

                {/* Checkout Button  disable if unavailable */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-100 mb-4"
                  onClick={handleCheckout}
                  disabled={!(currentEquipment && currentEquipment.availableQuantity > 0)}
                >
                  {currentEquipment && currentEquipment.availableQuantity > 0 ? 'Checkout' : 'Out of Stock'}
                </Button>

                {/* Equipment Info */}
                <div className="info-section">
                  <div className="info-item mb-4">
                    <h6 className="fw-semibold text-muted mb-2">DESCRIPTION</h6>
                    <p className="mb-0">{currentEquipment.description}</p>
                  </div>

                  <div className="info-item mb-4">
                    <h6 className="fw-semibold text-muted mb-2">USE</h6>
                    <p className="mb-0">{currentEquipment.use}</p>
                  </div>

                  <div className="info-item mb-4">
                    <h6 className="fw-semibold text-muted mb-2">LOAN PERIOD</h6>
                    <p className="mb-0">{currentEquipment.loanPeriod}</p>
                  </div>

                  <div className="info-item">
                    <h6 className="fw-semibold text-muted mb-2">LOCATION</h6>
                    <p className="mb-0">{currentEquipment.location}</p>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </main>

      {/* Guidelines Confirmation Modal */}
      <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Equipment Checkout Guidelines</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* summary of selected equipment */}
          <div className="mb-3">
            <h5 className="fw-bold">{currentEquipment?.name}</h5>
            <p className="mb-1"><strong>Loan period:</strong> {currentEquipment?.loanPeriod}</p>
            <p className="mb-1"><strong>Location:</strong> {currentEquipment?.location}</p>
            <p className="mb-0 text-muted">
              ({currentEquipment?.availableQuantity}/{currentEquipment?.totalQuantity} available)
            </p>
          </div>

          <p>Please read and agree to the following loan rules before checking out the equipment:</p>
          <ul>
            <li>All borrowers must present their current UTRGV photo identification at the time of pickup.</li>
            <li>The borrower's library account must be active and clear of fines and overdue materials.</li>
            <li>Borrowers are responsible for all materials, equipment, and accessories checked out on their library account.</li>
            <li>To ensure proper handling of items please return all media materials and equipment in person, allowing at least one hour before the library closes.</li>
            <li>Media materials and available equipment are limited and are loaned on a first-come, first-served basis.</li>
            <li>All media and equipment must be returned before the end of the loan period. Failure to do so will result in: Late fees and a hold placed on the user's library account, preventing circulation of all library materials.</li>
            <li>UTRGV credentials are required for login and use of laptops and tablets.</li>
            <li>UTRGV Information Resources Acceptable Use and Security Policy</li>
          </ul>
          {/*agreement checkbox*/}
          <Form.Check
            type="checkbox"
            id="accept-guidelines"
            label="I have read and accept the equipment checkout guidelines"
            checked={acceptedGuidelines}
            onChange={(e) => setAcceptedGuidelines(e.target.checked)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmation(false)}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={!acceptedGuidelines}
            onClick={handleConfirmCheckout} // before-logic exists in handleConfirmCheckout function
          >
            Accept & Checkout
          </Button>
        </Modal.Footer>
      </Modal>

      <Footer />

      {/* Success Modal */}
      <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Checked Out</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>{currentEquipment?.name}</strong> has been successfully checked out.
          </p>
          <p className="text-muted small">
            Please return it by {currentEquipment?.loanPeriod} and handle it responsibly.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccess(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EquipmentDetail;
