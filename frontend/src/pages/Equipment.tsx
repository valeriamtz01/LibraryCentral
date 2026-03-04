//main inventory list browse/search/filter page for all equipment, with links to individual equipment detail pages.
//display summary information for each item in the inventory, including name, category, availability status, and a thumbnail image.
// This page will also include a search bar and filter options for category and availability status.
import { useState, useMemo, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Card, InputGroup, Form, Modal } from 'react-bootstrap';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';
import './Equipment.css';
import { api } from '../api'; // axios instance to communicate with be

//represent a single checkout record for an item.
interface CheckoutRecord {
  checkedOutAt: Date;
  quantity: number;
  checkedOutBy?: string;
}

//represent a single equipment in the inventory
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

const EquipmentPage = () => {
  const navigate = useNavigate();
  

  // IMPO: since now we fetch data from the backend, comment out the ui testing code. TO BE DELETED after review
  /* hard coded inventory data for now, I believe this will eventually be fetched from the backend(??) need confirmation on this. 
  For now, this is just to have something to work with for the UI and functionality.
  Your equipment inventory
  const initialEquipment: Equipment[] = [
    { id: 1, name: 'DVDs', category: 'Media', description: 'Collection of educational and entertainment DVDs', use: 'Can be borrowed for personal viewing, classroom presentations, or research purposes', loanPeriod: '7 days', location: 'Media Library - Shelf A1', photoUrl: 'https://via.placeholder.com/400x300?text=DVDs', totalQuantity: 25, availableQuantity: 25, checkoutHistory: [] },
    { id: 2, name: 'CDs', category: 'Media', description: 'Audio CDs including music, audiobooks, and educational content', use: 'For music listening, audiobook review, or audio project work', loanPeriod: '7 days', location: 'Media Library - Shelf B2', photoUrl: 'https://via.placeholder.com/400x300?text=CDs', totalQuantity: 25, availableQuantity: 25, checkoutHistory: [] },
    { id: 3, name: 'Digital Camcorder', category: 'Media', description: 'Professional digital camcorders for video recording projects', use: 'Student projects, documentaries, and research video documentation', loanPeriod: '3 days', location: 'Media Center - Equipment Room', photoUrl: 'https://via.placeholder.com/400x300?text=Camcorder', totalQuantity: 10, availableQuantity: 10, checkoutHistory: [] },
    { id: 4, name: 'Digital Camera', category: 'Media', description: 'Digital cameras for photography and image capture', use: 'Photography projects, presentations, research documentation', loanPeriod: '3 days', location: 'Media Center - Equipment Room', photoUrl: 'https://via.placeholder.com/400x300?text=Camera', totalQuantity: 8, availableQuantity: 0, checkoutHistory: [{ checkedOutAt: new Date('2026-02-20'), quantity: 8 }] },
    { id: 5, name: 'Laptops (MacBook and PC)', category: 'Electronics', description: 'MacBook Pro and Dell XPS laptops for computing needs', use: 'Assignments, research, coding projects, and general computing', loanPeriod: '24 hours (can be renewed)', location: 'Tech Center - Laptop Station', photoUrl: 'https://via.placeholder.com/400x300?text=Laptops', totalQuantity: 50, availableQuantity: 50, checkoutHistory: [] },
    { id: 6, name: 'Mobile Phone Charger', category: 'Accessories', description: 'Various phone chargers compatible with most devices', use: 'Charging mobile devices, emergency use', loanPeriod: '24 hours', location: 'Tech Center - Accessories Counter', photoUrl: 'https://via.placeholder.com/400x300?text=Charger', totalQuantity: 30, availableQuantity: 30, checkoutHistory: [] },
    { id: 7, name: 'Projector', category: 'Electronics', description: 'High-definition projectors for presentations and screenings', use: 'Class presentations, events, movie screenings', loanPeriod: '1 day', location: 'Presentation Room - Storage', photoUrl: 'https://via.placeholder.com/400x300?text=Projector', totalQuantity: 15, availableQuantity: 15, checkoutHistory: [] },
    { id: 8, name: 'Graphing Calculator (TI-84 CE Plus)', category: 'Supplies', description: 'TI-84 CE Plus graphing calculators for mathematics', use: 'Math courses, scientific calculations, engineering work', loanPeriod: 'Semester', location: 'Math Tutoring Center', photoUrl: 'https://via.placeholder.com/400x300?text=Calculator', totalQuantity: 65, availableQuantity: 0, checkoutHistory: [{ checkedOutAt: new Date('2026-02-19'), quantity: 65 }] },
    { id: 9, name: 'Graphing Calculator (models vary, batteries not included)', category: 'Supplies', description: 'Various graphing calculator models for mathematics courses', use: 'Math courses, scientific calculations, problem solving', loanPeriod: 'Semester', location: 'Math Tutoring Center', photoUrl: 'https://via.placeholder.com/400x300?text=Calculator2', totalQuantity: 55, availableQuantity: 55, checkoutHistory: [] },
    { id: 10, name: 'iPad', category: 'Electronics', description: 'iPad tablets for note-taking and academic work', use: 'Digital note-taking, research, multimedia projects', loanPeriod: '24 hours (can be renewed)', location: 'Tech Center - Mobile Devices', photoUrl: 'https://via.placeholder.com/400x300?text=iPad', totalQuantity: 20, availableQuantity: 20, checkoutHistory: [] },
    { id: 11, name: 'Headphones', category: 'Accessories', description: 'Quality headphones for audio work and listening', use: 'Multimedia projects, language learning, audio editing', loanPeriod: '24 hours', location: 'Tech Center - Accessories', photoUrl: 'https://via.placeholder.com/400x300?text=Headphones', totalQuantity: 7, availableQuantity: 7, checkoutHistory: [] },
    { id: 12, name: 'HDMI Cable', category: 'Accessories', description: 'HDMI cables for video and audio connections', use: 'Connecting devices to projectors, TVs, and displays', loanPeriod: '24 hours', location: 'Tech Center - Cables', photoUrl: 'https://via.placeholder.com/400x300?text=HDMI+Cable', totalQuantity: 7, availableQuantity: 7, checkoutHistory: [] },
    { id: 13, name: 'Mouse', category: 'Accessories', description: 'Computer mice for desktop and laptop use', use: 'Computer navigation and work', loanPeriod: '24 hours', location: 'Tech Center - Peripherals', photoUrl: 'https://via.placeholder.com/400x300?text=Mouse', totalQuantity: 20, availableQuantity: 20, checkoutHistory: [] },
    { id: 14, name: 'Screenflex Portable Display Panels', category: 'Supplies', description: 'Portable room dividers and display panels for events', use: 'Creating spaces for presentations, exhibitions, and events', loanPeriod: '3 days', location: 'Event Space - Storage', photoUrl: 'https://via.placeholder.com/400x300?text=Display+Panels', totalQuantity: 5, availableQuantity: 5, checkoutHistory: [] },
  ]; */

  //state storing full equipment list that was initially empty (added 'from be')
  //it is now initialized as an empty array[] (fetching live data = need to start with empty state)
  //having this typed interface <Equipment[]> ensures typescript catches errors if BE returns unexpected
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  //loading state:
  //this is to show a spinner and prevent the "no equipment found" from flashing on the screen before the data actually arrives from the server
  const [loading, setLoading] = useState(true); // loading state while fetching from be

  //list of categories used in the filter modal 
  const categories = ['Accessories', 'Media', 'Electronics', 'Supplies'];

  //states for search and filter functionality
  const [searchQuery, setSearchQuery] = useState(''); // what user types in search bar
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // applied categpry filter
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // applied availiability filter
  const [showFilterModal, setShowFilterModal] = useState(false); // show or hide filter modal
  
  //temporary filter states used inside modal before the user clicks apply
  const [tempCategory, setTempCategory] = useState<string>('all');
  const [tempStatus, setTempStatus] = useState<string>('all');

  // Helper function to determine status based on available quantity
  const getStatus = (availableQuantity: number): 'available' | 'unavailable' => {
    return availableQuantity > 0 ? 'available' : 'unavailable';
  };

  // fetchEquipment asyn function: 
  // fetch equipment from backend when component loads
  // replaces the hardcode data
  // instead get from be and map the fiels to the equipment interface
  // idea = core logic that connect the react ui to the django backend by using the centralized 'api' axios instance (handles baseurl and auth headers)
  const fetchEquipment = async () => {
    try {
      const response = await api.get("/equipment/", { withCredentials: true }); // send GET request to /equipment/ endpoint
      console.log('Fetched data:', response.data);

      // map backend data to frontend equipment structure (basically what is in the serializer)
      // be keys and fe keys don't always match perfectly so need data mapping
      // this tranforms the json from the api into the specifc 'equipment' interface that was defined at the top
      const mapped = response.data.map((item: any) => ({
        id: item.id,
        name: item.name,              // the name now comes from the friendly name logic in the serializer
        category: item.category,      // from serializer
        description: item.description || "No description", // a fallback in case empty
        use: "See description", // placeholder until we add a use field to models
        loanPeriod: "Check policy", 
        location: item.location,
        photoUrl: item.photoUrl,
        totalQuantity: item.totalQuantity,
        availableQuantity: item.availableQuantity,
        checkoutHistory: [], // this isn't fetched for this page, but later if needed -> empty for now to prevent undefined errors in the interface
      }));

      setEquipment(mapped); // update state with the clean, mapped data
    }
    catch (error) {
      console.error('Failed to fetch equipment: ', error); // 401 (authorization) or 500 (server) error
    }
    finally {
      setLoading(false); // stops the loading state regardless of success or failure
    }
  };
    
    // useEffect hook:
    // initial fetch when component mounts
    // only want to call the be once when the user first lands on the page
    useEffect(() => {
      fetchEquipment();
    }, []); // empty dependency array [] ensures we don't get into an infinite loop of fetching


  // useMemo for filtering:
  // it wraps the equipment list and only recalculates if the search query or filters change
  // if we add more to inventory, this will prevent the user interface from lagging every time the user types a letter
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const status = getStatus(item.availableQuantity);

      //check if item matches search queuery
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      //check category filter
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      //check availability status filter
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, selectedCategory, selectedStatus, equipment]);

  //opens filter modal and initializes temporary filter states to current selected filters, so if user opens modal and cancels, their previous filter selections are preserved.
  const handleOpenFilterModal = () => {
    setTempCategory(selectedCategory);
    setTempStatus(selectedStatus);
    setShowFilterModal(true);
  };

  //applies temporary selected filters from modal to the main state
  const handleApplyFilters = () => {
    setSelectedCategory(tempCategory);
    setSelectedStatus(tempStatus);
    setShowFilterModal(false);
  };

  //clears temp filters inside modal
  const handleClearFilters = () => {
    setTempCategory('all');
    setTempStatus('all');
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: '56px' }}>
      <StudentHeader />
      
      <main className="flex-grow-1">
        <Container className="py-5">
          <header className="mb-5">
            <h1 className="fw-bold">Equipment</h1>
            <p className="text-muted">View inventory and checkout equipment.</p>
          </header>

          {/* Search and Filter Section */}
          <Row className="mb-4 align-items-end">
            <Col lg={6} md={8} className="mb-3">
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col lg="auto" className="mb-3">
              <Button
                variant="outline-secondary"
                onClick={handleOpenFilterModal}
                className="d-flex align-items-center gap-2"
              >
                <i className="bi bi-funnel"></i>
                Filters
              </Button>
            </Col>
          </Row>

          {/* Equipment List */}
          <div className="equipment-list-container">
            {filteredEquipment.length > 0 ? (
              <div className="equipment-list">
                {filteredEquipment.map(equipment => (
                  <Card
                    key={equipment.id}
                    className="equipment-card mb-3 border-0 shadow-sm hover-lift"
                  >
                    <Card.Body className="p-4 d-flex justify-content-between align-items-center">
                      <div className="equipment-info">
                        <h5 className="mb-2 fw-semibold">{equipment.name}</h5>
                        <div className="equipment-meta">
                          <span className="badge bg-light text-dark me-2">
                            {equipment.category}
                          </span>
                          <span
                            className={`badge ${
                              getStatus(equipment.availableQuantity) === 'available'
                                ? 'bg-success'
                                : 'bg-danger'
                            }`}
                          >
                            {getStatus(equipment.availableQuantity) === 'available' ? 'Available' : 'Unavailable'}
                          </span>
                          <span className="text-muted ms-2 small">
                            ({equipment.availableQuantity}/{equipment.totalQuantity} available)
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/equipment/${equipment.id}`)}
                        className="ms-3"
                      >
                        View
                      </Button>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm p-5 text-center">
                <Card.Body>
                  <p className="text-muted mb-0">
                    No equipment found matching your search and filters.
                  </p>
                </Card.Body>
              </Card>
            )}
          </div>
        </Container>
      </main>
      {/* Filter Modal */}
      <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Filter Equipment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Category Filter */}
          <div className="mb-4">
            <label className="fw-semibold d-block mb-3">Category</label>
            <div className="filter-options">
              <Form.Check
                type="radio"
                label="All"
                name="category"
                value="all"
                checked={tempCategory === 'all'}
                onChange={(e) => setTempCategory(e.target.value)}
                id="category-all"
              />
              {categories.map(category => (
                <Form.Check
                  key={category}
                  type="radio"
                  label={category}
                  name="category"
                  value={category}
                  checked={tempCategory === category}
                  onChange={(e) => setTempCategory(e.target.value)}
                  id={`category-${category}`}
                />
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="fw-semibold d-block mb-3">Status</label>
            <div className="filter-options">
              <Form.Check
                type="radio"
                label="All"
                name="status"
                value="all"
                checked={tempStatus === 'all'}
                onChange={(e) => setTempStatus(e.target.value)}
                id="status-all"
              />
              <Form.Check
                type="radio"
                label="Available"
                name="status"
                value="available"
                checked={tempStatus === 'available'}
                onChange={(e) => setTempStatus(e.target.value)}
                id="status-available"
              />
              <Form.Check
                type="radio"
                label="Unavailable"
                name="status"
                value="unavailable"
                checked={tempStatus === 'unavailable'}
                onChange={(e) => setTempStatus(e.target.value)}
                id="status-unavailable"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClearFilters}>
            Clear Filters
          </Button>
          <Button variant="primary" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
        </Modal.Footer>
      </Modal>

      <Footer />
    </div>
  );
};

export default EquipmentPage;