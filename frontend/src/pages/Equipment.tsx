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
  
  // states for the guidelines modal 
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  
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
        name: item.name || "Unknown Item",
        category: item.category || "Uncategorized",
        description: item.description || "No description",
        use: "See description",
        loanPeriod: "Check policy",
        location: item.location || "unknown",
        photoUrl: item.photoUrl || "https://via.placeholder.com/400x300?text=Equipment",
        totalQuantity: item.totalQuantity || 0,
        availableQuantity: item.availableQuantity || 0,
        checkoutHistory: [],
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
      // const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      const matchesCategory = selectedCategory === 'all' || 
        item.category.toLowerCase() === selectedCategory.toLowerCase();
      
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

//   return (
//     <div className="d-flex flex-column min-vh-100 bg-light" style={{ paddingTop: '56px' }}>
//       <StudentHeader />
      
//       <main className="flex-grow-1">
//         <Container className="py-5">
//           <header className="mb-5">
//             <h1 className="fw-bold">Equipment</h1>
//             <p className="text-muted">View inventory and checkout equipment.</p>
//           </header>

//           {/* Search and Filter Section */}
//           <Row className="mb-4 align-items-end">
//             <Col lg={6} md={8} className="mb-3">
//               <InputGroup>
//                 <InputGroup.Text className="bg-white">
//                   <i className="bi bi-search"></i>
//                 </InputGroup.Text>
//                 <Form.Control
//                   placeholder="Search equipment..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="border-start-0"
//                 />
//               </InputGroup>
//             </Col>
//             <Col lg="auto" className="mb-3">
//               <Button
//                 variant="outline-secondary"
//                 onClick={handleOpenFilterModal}
//                 className="d-flex align-items-center gap-2"
//               >
//                 <i className="bi bi-funnel"></i>
//                 Filters
//               </Button>
//             </Col>
//           </Row>

//           {/* Equipment List */}
//           <div className="equipment-list-container">
//             {filteredEquipment.length > 0 ? (
//               <div className="equipment-list">
//                 {filteredEquipment.map(equipment => (
//                   <Card
//                     key={equipment.id}
//                     className="equipment-card mb-3 border-0 shadow-sm hover-lift"
//                   >
//                     <Card.Body className="p-4 d-flex justify-content-between align-items-center">
//                       <div className="equipment-info">
//                         <h5 className="mb-2 fw-semibold">{equipment.name ? equipment.name.split(" - ")[0] : "Unnamed Item"}</h5>
//                         <div className="equipment-meta">
//                           <span className="badge bg-light text-dark me-2">
//                             {equipment.category}
//                           </span>
//                           <span
//                             className={`badge ${
//                               getStatus(equipment.availableQuantity) === 'available'
//                                 ? 'bg-success'
//                                 : 'bg-danger'
//                             }`}
//                           >
//                             {getStatus(equipment.availableQuantity) === 'available' ? 'Available' : 'Unavailable'}
//                           </span>
//                           <span className="text-muted ms-2 small">
//                             ({equipment.availableQuantity}/{equipment.totalQuantity} available)
//                           </span>
//                         </div>
//                       </div>
//                       <Button
//                         variant="primary"
//                         size="sm"
//                         onClick={() => navigate(`/equipment/${equipment.id}`)}
//                         className="ms-3"
//                       >
//                         View
//                       </Button>
//                     </Card.Body>
//                   </Card>
//                 ))}
//               </div>
//             ) : (
//               <Card className="border-0 shadow-sm p-5 text-center">
//                 <Card.Body>
//                   <p className="text-muted mb-0">
//                     No equipment found matching your search and filters.
//                   </p>
//                 </Card.Body>
//               </Card>
//             )}
//           </div>
//         </Container>
//       </main>
//       {/* Filter Modal */}
//       <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)} centered>
//         <Modal.Header closeButton>
//           <Modal.Title>Filter Equipment</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           {/* Category Filter */}
//           <div className="mb-4">
//             <label className="fw-semibold d-block mb-3">Category</label>
//             <div className="filter-options">
//               <Form.Check
//                 type="radio"
//                 label="All"
//                 name="category"
//                 value="all"
//                 checked={tempCategory === 'all'}
//                 onChange={(e) => setTempCategory(e.target.value)}
//                 id="category-all"
//               />
//               {categories.map(category => (
//                 <Form.Check
//                   key={category}
//                   type="radio"
//                   label={category}
//                   name="category"
//                   value={category}
//                   checked={tempCategory === category}
//                   onChange={(e) => setTempCategory(e.target.value)}
//                   id={`category-${category}`}
//                 />
//               ))}
//             </div>
//           </div>

//           {/* Status Filter */}
//           <div className="mb-4">
//             <label className="fw-semibold d-block mb-3">Status</label>
//             <div className="filter-options">
//               <Form.Check
//                 type="radio"
//                 label="All"
//                 name="status"
//                 value="all"
//                 checked={tempStatus === 'all'}
//                 onChange={(e) => setTempStatus(e.target.value)}
//                 id="status-all"
//               />
//               <Form.Check
//                 type="radio"
//                 label="Available"
//                 name="status"
//                 value="available"
//                 checked={tempStatus === 'available'}
//                 onChange={(e) => setTempStatus(e.target.value)}
//                 id="status-available"
//               />
//               <Form.Check
//                 type="radio"
//                 label="Unavailable"
//                 name="status"
//                 value="unavailable"
//                 checked={tempStatus === 'unavailable'}
//                 onChange={(e) => setTempStatus(e.target.value)}
//                 id="status-unavailable"
//               />
//             </div>
//           </div>
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="secondary" onClick={handleClearFilters}>
//             Clear Filters
//           </Button>
//           <Button variant="primary" onClick={handleApplyFilters}>
//             Apply Filters
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       <Footer />
//     </div>
//   );
// };

// export default EquipmentPage;


// ─────────────────────────────────────────────────────────────────────────────
// CURRENT EQUIPMENT PAGE:
// ─────────────────────────────────────────────────────────────────────────────
// DROP-IN REPLACEMENT: paste this entire return() in place of the existing one.
// All state, hooks, and handlers above remain completely untouched:
//   - equipment, loading, categories, searchQuery, selectedCategory,
//     selectedStatus, showFilterModal, tempCategory, tempStatus
//   - fetchEquipment, getStatus, filteredEquipment (useMemo)
//   - handleOpenFilterModal, handleApplyFilters, handleClearFilters
//
// Design goals:
//   - Matches the dashboard: #f4f5f7 page bg, #C0421A brand orange, white cards,
//     same border radius, same font sizes, same badge patterns
//   - Dark charcoal hero banner with live stat strip (no photo needed here)
//   - Equipment cards are wide list-style rows — easier to scan a long inventory
//     list vs a cramped grid
//   - Filter modal (react-bootstrap Modal) is unchanged — only trigger style changes
// ─────────────────────────────────────────────────────────────────────────────

return (
  // ── Page shell ───────────────────────────────────────────────────────────────
  // min-vh-100 → page always fills the full viewport height (Bootstrap utility)
  // paddingTop → clears the fixed StudentHeader navbar (56px tall)
  // backgroundColor → matches dashboard page background (#f4f5f7 light gray)
  <div
    className="d-flex flex-column min-vh-100 ss-page"
    style={{ paddingTop: '56px', backgroundColor: '#f4f5f7' }}
  >
    {/* StudentHeader — fixed navbar, identical to dashboard */}
    <StudentHeader />

    <main className="flex-grow-1">

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — PAGE HEADER BANNER
          Dark charcoal banner — mirrors the dashboard hero structure but uses
          a solid dark bg instead of the library photo (equipment page doesn't
          need a photo, keeps the visual hierarchy clean).
          Shows page title + three live stat counts:
            - equipment.length    → total distinct item types from BE
            - reduce(availableQuantity) → total units available right now
            - filteredEquipment.length → how many results are currently showing
          All three update reactively as the user searches/filters.
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="ss-hero">
        <Container style={{ maxWidth: 1200 }}>
          <div className="ss-hero-inner">
            <div>
              <h1 className="ss-serif ss-hero-title">Equipment Inventory</h1>
              <p className="ss-hero-sub">
                Browse available library equipment, reserve items, and view live availability.
              </p>
              <div className="ss-avail-pill">
                UTRGV Library · Equipment Checkout
              </div>
            </div>

            <button
              type="button"
              className="ss-hero-cta"
              onClick={() => setShowGuidelinesModal(true)}
            >
              <i className="bi bi-shield-check me-2" />
              Guidelines
            </button>
          </div>
        </Container>
      </div>
      {/* END SECTION 1 — HERO BANNER */}


      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — SEARCH + FILTER PILL ROW
          White bar directly below the banner — same layout as the dashboard
          quick-action pill row. Three elements:
            1. Search input (flex 1, pill-shaped) — bound to searchQuery state
            2. Active filter pills — only render when a non-"all" filter is applied
            3. Filter button — opens the react-bootstrap Modal (unchanged logic)
          All state and handlers come from above return() — untouched.
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e9ecef',
        flexWrap: 'wrap',   // wraps to second line on small screens
      }}>

        {/* Search input — pill-shaped, flex 1 fills available width
            onChange updates searchQuery state → useMemo re-filters filteredEquipment
            bi-search — Bootstrap Icon: magnifying glass */}
        <div style={{
          flex: 1,
          minWidth: '200px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f4f5f7',
          border: '1px solid #e9ecef',
          borderRadius: '20px',
          padding: '7px 14px',
        }}>
          {/* bi-search — Bootstrap Icon: magnifying glass, standard search indicator */}
          <i className="bi bi-search" style={{ fontSize: '13px', color: '#6c757d' }} />
          <input
            placeholder="Search equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#1a1a1a',
              width: '100%',
            }}
          />
          {/* Clear X — only visible when searchQuery is non-empty.
              Clicking resets searchQuery to '' → useMemo re-runs with no search filter.
              bi-x — Bootstrap Icon: X mark */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                border: 'none', background: 'none',
                cursor: 'pointer', color: '#6c757d',
                fontSize: '14px', padding: 0, lineHeight: 1,
              }}
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>

        {/* Active filter pill: category — only renders when selectedCategory !== 'all'
            Shows which category filter is active and lets the user remove it inline
            without reopening the modal. Clicking × resets selectedCategory → 'all'. */}
        {selectedCategory !== 'all' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#fff4f1',         // light orange tint — brand color family
            border: '1px solid #f5c4b3',
            borderRadius: '20px',
            padding: '5px 10px',
            fontSize: '12px',
            color: '#C0421A',
            fontWeight: 500,
          }}>
            {selectedCategory}
            <button
              onClick={() => setSelectedCategory('all')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#C0421A', padding: '0 0 0 4px', fontSize: '13px', lineHeight: 1 }}
            >
              <i className="bi bi-x" />
            </button>
          </div>
        )}

        {/* Active filter pill: status — only renders when selectedStatus !== 'all'
            Green tint for 'available', red tint for 'unavailable' — matches badge colors below. */}
        {selectedStatus !== 'all' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: selectedStatus === 'available' ? '#eaf3de' : '#fcebeb',
            border: `1px solid ${selectedStatus === 'available' ? '#C0DD97' : '#F7C1C1'}`,
            borderRadius: '20px',
            padding: '5px 10px',
            fontSize: '12px',
            color: selectedStatus === 'available' ? '#3B6D11' : '#A32D2D',
            fontWeight: 500,
          }}>
            {selectedStatus === 'available' ? 'Available' : 'Unavailable'}
            <button
              onClick={() => setSelectedStatus('all')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: '0 0 0 4px', fontSize: '13px', lineHeight: 1 }}
            >
              <i className="bi bi-x" />
            </button>
          </div>
        )}

        {/* Filter button — pill-shaped, calls handleOpenFilterModal() which snapshots
            current filters into tempCategory/tempStatus before opening so Cancel preserves
            the previous selection.
            Orange dot indicator appears when any filter is active.
            bi-funnel — Bootstrap Icon: funnel shape, standard filter icon */}
        <button
          onClick={handleOpenFilterModal}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 16px',
            borderRadius: '20px',
            border: '1px solid #dee2e6',
            backgroundColor: '#fff',
            color: '#495057',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {/* bi-funnel — Bootstrap Icon: filter funnel */}
          <i className="bi bi-funnel" style={{ fontSize: '13px' }} />
          Filters
          {/* Orange dot — signals an active filter without requiring the user to read the pills */}
          {(selectedCategory !== 'all' || selectedStatus !== 'all') && (
            <span style={{
              width: '7px', height: '7px',
              borderRadius: '50%',
              backgroundColor: '#C0421A',
              display: 'inline-block',
              flexShrink: 0,
            }} />
          )}
        </button>
      </div>
      {/* END SECTION 2 — SEARCH + FILTER ROW */}


      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — EQUIPMENT LIST
          Main content area. Three possible render states:
            1. loading=true → skeleton pulse rows (no content flash)
            2. filteredEquipment.length === 0 → empty state
            3. filteredEquipment.length > 0 → list of row cards

          filteredEquipment = result of useMemo() defined above return().
          It filters the `equipment` state array (fetched from /equipment/ BE endpoint)
          by searchQuery, selectedCategory, and selectedStatus on every change.

          Each card row layout:
            LEFT  — colored icon circle (category) + name + badge strip
            RIGHT — quantity fraction (available/total) + View button
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, padding: '20px 24px', backgroundColor: '#f4f5f7' }}>

        {/* Section micro-label — dynamic: shows result count when loaded
            Matches dashboard "UPCOMING ACTIVITY" label style */}
        <div style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#6c757d',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          marginBottom: '14px',
        }}>
          {loading
            ? 'Loading inventory...'
            : `${filteredEquipment.length} item${filteredEquipment.length !== 1 ? 's' : ''}`
          }
        </div>

        {/* ── STATE 1: Loading skeletons ────────────────────────────────────────
            5 placeholder rows while fetchEquipment() awaits the BE response.
            skeleton-pulse class in Equipment.css drives the opacity animation.
            Prevents the "no results" empty state from flashing before data arrives.
        ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="skeleton-pulse"  // Equipment.css: opacity pulse animation
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e9ecef',
                  borderRadius: '10px',
                  height: '68px',
                }}
              />
            ))}
          </div>
        )}

        {/* ── STATE 2: Empty state ──────────────────────────────────────────────
            Shows only after loading completes and no items match the current filters.
            Offers a "Clear all filters" escape hatch if filters are the cause.
            bi-box-seam — Bootstrap Icon: sealed cardboard box, no items present.
        ── */}
        {!loading && filteredEquipment.length === 0 && (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e9ecef',
            borderRadius: '10px',
            padding: '40px 20px',
            textAlign: 'center',
          }}>
            {/* bi-box-seam — Bootstrap Icon: sealed box, represents empty inventory state */}
            <i className="bi bi-box-seam" style={{ fontSize: '2rem', color: '#dee2e6' }} />
            <p className="text-muted mt-3 mb-2" style={{ fontSize: '14px' }}>
              No equipment found matching your search and filters.
            </p>
            {/* Only show "Clear all filters" when at least one filter is active */}
            {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');        // clears the search input
                  setSelectedCategory('all'); // resets category filter
                  setSelectedStatus('all');   // resets status filter
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#C0421A',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── STATE 3: Equipment row cards ─────────────────────────────────────
            Renders when loading is complete and filteredEquipment has items.
            Each item gets a horizontal card row.
        ── */}
        {!loading && filteredEquipment.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredEquipment.map((item) => {

              // getStatus() is defined above return() — returns 'available' | 'unavailable'
              // based purely on availableQuantity > 0
              const status = getStatus(item.availableQuantity);
              const isAvailable = status === 'available';

              // categoryIcon: maps each category string to a Bootstrap Icon class name
              // These icons make each row visually scannable without reading the category badge
              // bi-laptop        → Electronics (computing devices)
              // bi-camera-video  → Media (cameras, camcorders, AV)
              // bi-headphones    → Accessories (peripherals, cables, chargers)
              // bi-calculator    → Supplies (calculators, display panels)
              const categoryIcon: Record<string, string> = {
                Electronics: 'bi-laptop',
                Media:       'bi-camera-video',
                Accessories: 'bi-headphones',
                Supplies:    'bi-calculator',
              };
              const icon = categoryIcon[item.category] || 'bi-box'; // fallback icon

              // categoryColor: bg + text color pair for icon circles and category badges
              // Each category gets a consistent color so repeated items group visually
              // Blue → Electronics, Purple → Media, Green → Accessories, Amber → Supplies
              const categoryColor: Record<string, { bg: string; color: string }> = {
                Electronics: { bg: '#eef4fc', color: '#185FA5' },
                Media:       { bg: '#f3eeff', color: '#534AB7' },
                Accessories: { bg: '#eaf3de', color: '#3B6D11' },
                Supplies:    { bg: '#faeeda', color: '#854F0B' },
              };
              const accent = categoryColor[item.category] || { bg: '#f4f5f7', color: '#6c757d' };

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >

                  {/* LEFT: icon circle + item name + badge strip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>

                    {/* Category icon circle — rounded square colored by categoryColor map
                        Width/height 38px gives a compact but readable icon area */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: accent.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,   // don't let the icon shrink when name is long
                    }}>
                      {/* Dynamic Bootstrap Icon — determined by categoryIcon map above */}
                      <i className={`bi ${icon}`} style={{ fontSize: '16px', color: accent.color }} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      {/* Item name — overflow hidden + ellipsis prevents long names breaking layout
                          split(' - ')[0] strips any " - suffix" that some names include */}
                      <div style={{
                        fontWeight: 500,
                        fontSize: '14px',
                        color: '#1a1a1a',
                        marginBottom: '5px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.name ? item.name.split(' - ')[0] : 'Unnamed Item'}
                      </div>

                      {/* Badge strip: category pill + availability pill
                          Both use color-coded backgrounds — no border needed at this small size */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

                        {/* Category badge — same accent color as the icon circle for visual consistency */}
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: accent.bg,
                          color: accent.color,
                          fontWeight: 500,
                        }}>
                          {item.category}
                        </span>

                        {/* Availability badge — green if any units available, red if all checked out
                            getStatus() determines this from availableQuantity */}
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: isAvailable ? '#eaf3de' : '#fcebeb',
                          color: isAvailable ? '#3B6D11' : '#A32D2D',
                          fontWeight: 500,
                        }}>
                          {isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: quantity fraction + View button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>

                    {/* Quantity fraction — "X / Y available"
                        availableQuantity and totalQuantity come from the BE serializer
                        (EquipmentItemSerializer → get_availableQuantity, get_totalQuantity)
                        Color: green if any available, red if fully checked out */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: isAvailable ? '#1D9E75' : '#dc3545',
                        lineHeight: 1,
                      }}>
                        {item.availableQuantity}
                        <span style={{ fontSize: '11px', fontWeight: 400, color: '#6c757d' }}>
                          {' '}/ {item.totalQuantity}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                        available
                      </div>
                    </div>

                    {/* View button — navigates to /equipment/{id} (EquipmentDetail page)
                        Uses brand orange (#C0421A) to match all CTA buttons on the dashboard
                        navigate() comes from useNavigate() hook at the top of the file */}
                    <button
                      onClick={() => navigate(`/equipment/${item.id}`)}
                      style={{
                        backgroundColor: '#C0421A',  // brand orange — consistent with dashboard
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 500,
                        padding: '7px 16px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* END SECTION 3 — EQUIPMENT LIST */}

    </main>


    {/* ── EQUIPMENT GUIDELINES MODAL ─────────────────────────────────── */}
    <Modal show={showGuidelinesModal} onHide={() => setShowGuidelinesModal(false)} centered size="lg">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #e9ecef' }}>
        <Modal.Title style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
          <i className="bi bi-shield-check me-2" style={{ color: '#C0421A' }} />
          Equipment Checkout Guidelines
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: '24px 28px', maxHeight: '70vh', overflowY: 'auto' }}>

        {/* Eligibility */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '.09em',
            textTransform: 'uppercase', color: '#C0421A', marginBottom: 8,
          }}>
            Eligibility
          </div>
          <p style={{ fontSize: '13px', color: '#495057', lineHeight: 1.7, margin: 0 }}>
            Currently enrolled students and currently employed faculty and staff are eligible
            to borrow media materials and equipment. A valid <strong>UTRGV photo ID</strong> is
            required at the time of checkout and your library account must be active and clear
            of fines and overdue materials.
          </p>
        </div>

        {/* Loan Rules */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '.09em',
            textTransform: 'uppercase', color: '#C0421A', marginBottom: 8,
          }}>
            Loan Rules
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: 'bi-person-badge', text: 'Present your current UTRGV photo ID at the time of checkout.' },
              { icon: 'bi-arrow-return-left', text: 'Return all items in person, allowing at least one hour before the library closes.' },
              { icon: 'bi-people', text: 'Equipment is loaned on a first-come, first-served basis.' },
              { icon: 'bi-clock', text: 'All items must be returned before the end of the loan period.' },
              { icon: 'bi-shield-lock', text: 'UTRGV credentials are required for login and use of laptops and tablets.' },
              { icon: 'bi-bag-check', text: 'Borrowers are responsible for all materials and accessories checked out on their account.' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  backgroundColor: '#fff4f1', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`bi ${icon}`} style={{ fontSize: '13px', color: '#C0421A' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#495057', lineHeight: 1.6, paddingTop: 4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Late Fees */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '.09em',
            textTransform: 'uppercase', color: '#C0421A', marginBottom: 8,
          }}>
            Late Fees & Consequences
          </div>
          <div style={{
            backgroundColor: '#fff4f1',
            border: '1px solid #f5c4b3',
            borderLeft: '3px solid #C0421A',
            borderRadius: 8, padding: '12px 14px',
            fontSize: '13px', color: '#495057', lineHeight: 1.7,
          }}>
            <strong style={{ color: '#C0421A' }}>There is no grace period.</strong> Overdue fines are
            charged immediately for any portion of an hour overdue — <strong>$1.00 per day</strong>,
            up to a maximum of <strong>$25.00</strong>. A hold will be placed on your library account
            preventing circulation of all library materials. Lost or damaged equipment may result in
            replacement fees up to <strong>$1,000 for laptops/tablets</strong> or
            <strong> $2,000 for projectors</strong>.
          </div>
        </div>

        {/* Loan Periods Table */}
        <div>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '.09em',
            textTransform: 'uppercase', color: '#C0421A', marginBottom: 8,
          }}>
            Loan Periods by Item
          </div>
          <div style={{ border: '1px solid #e9ecef', borderRadius: 8, overflow: 'hidden' }}>
            {[
              { item: 'Digital Camcorder',                          period: 'Length of Semester' },
              { item: 'Digital Camera',                             period: 'Length of Semester' },
              { item: 'Laptops (MacBook and PC)',                   period: '24 hours (renewable)' },
              { item: 'Mobile Phone Charger',                       period: '24 hours' },
              { item: 'Projector',                                  period: '1 day' },
              { item: 'Graphing Calculator (TI-84 CE Plus)',        period: 'Length of Semester' },
              { item: 'Scientific Calculator (models vary)',        period: 'Semester' },
              { item: 'iPad',                                       period: '24 hours (renewable)' },
              { item: 'Headphones',                                 period: '24 hours' },
              { item: 'HDMI Cable',                                 period: '24 hours' },
              { item: 'Mouse',                                      period: '24 hours' },
              { item: 'Screenflex Portable Display Panels',         period: '3 days' },
              { item: 'DVDs / CDs',                                 period: '7 days' },
            ].map(({ item, period }, i) => (
              <div key={item} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 14px',
                backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                borderBottom: i < 12 ? '1px solid #f0f0f0' : 'none',
                fontSize: '13px',
              }}>
                <span style={{ color: '#1a1a1a' }}>{item}</span>
                <span style={{
                  color: '#C0421A', fontWeight: 500,
                  backgroundColor: '#fff4f1',
                  padding: '2px 10px', borderRadius: 20, fontSize: '12px',
                }}>{period}</span>
              </div>
            ))}
          </div>
        </div>

      </Modal.Body>

      <Modal.Footer style={{ borderTop: '1px solid #e9ecef', padding: '12px 28px' }}>
        <button
          onClick={() => setShowGuidelinesModal(false)}
          style={{
            backgroundColor: '#C0421A', border: 'none', borderRadius: 8,
            color: '#fff', padding: '8px 20px', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </Modal.Footer>
    </Modal>




    {/* ══════════════════════════════════════════════════════════════════════
        FILTER MODAL — react-bootstrap Modal, logic completely unchanged.
        Only the trigger button style changed (orange Apply, pill-shaped).
        Modal state:   showFilterModal (bool) — toggled by handleOpenFilterModal
        Temp states:   tempCategory, tempStatus — staged before Apply is clicked
        On Apply:      handleApplyFilters() copies temp → selected, closes modal
        On Clear:      handleClearFilters() resets both temp states to 'all'
        On Cancel/X:   setShowFilterModal(false) — discards temp changes
    ══════════════════════════════════════════════════════════════════════ */}
    <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '16px', fontWeight: 500 }}>Filter Equipment</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Category radio group — bound to tempCategory (staged state)
            categories array = ['Accessories', 'Media', 'Electronics', 'Supplies']
            defined above return() */}
        <div className="mb-4">
          <label className="fw-semibold d-block mb-3" style={{ fontSize: '13px' }}>Category</label>
          <div className="filter-options">
            <Form.Check
              type="radio" label="All" name="category" value="all"
              checked={tempCategory === 'all'}
              onChange={(e) => setTempCategory(e.target.value)}
              id="category-all"
            />
            {categories.map(category => (
              <Form.Check
                key={category}
                type="radio" label={category} name="category" value={category}
                checked={tempCategory === category}
                onChange={(e) => setTempCategory(e.target.value)}
                id={`category-${category}`}
              />
            ))}
          </div>
        </div>

        {/* Status radio group — bound to tempStatus (staged state) */}
        <div className="mb-2">
          <label className="fw-semibold d-block mb-3" style={{ fontSize: '13px' }}>Availability</label>
          <div className="filter-options">
            <Form.Check
              type="radio" label="All" name="status" value="all"
              checked={tempStatus === 'all'}
              onChange={(e) => setTempStatus(e.target.value)}
              id="status-all"
            />
            <Form.Check
              type="radio" label="Available" name="status" value="available"
              checked={tempStatus === 'available'}
              onChange={(e) => setTempStatus(e.target.value)}
              id="status-available"
            />
            <Form.Check
              type="radio" label="Unavailable" name="status" value="unavailable"
              checked={tempStatus === 'unavailable'}
              onChange={(e) => setTempStatus(e.target.value)}
              id="status-unavailable"
            />
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        {/* Clear — resets temp filters to 'all' without closing the modal */}
        <Button variant="outline-secondary" onClick={handleClearFilters}>
          Clear filters
        </Button>
        {/* Apply — copies tempCategory/tempStatus to selectedCategory/selectedStatus
            then closes the modal. handleApplyFilters() defined above return(). */}
        <Button
          onClick={handleApplyFilters}
          style={{ backgroundColor: '#C0421A', borderColor: '#C0421A' }}
        >
          Apply filters
        </Button>
      </Modal.Footer>
    </Modal>

    {/* Footer — existing Footer component, completely unchanged */}
    <Footer />

  </div>
);

};

export default EquipmentPage;