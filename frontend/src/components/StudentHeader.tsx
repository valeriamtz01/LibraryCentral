import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import './StudentHeader.css'; 

const StudentHeader = () => {
  const location = useLocation();

  return (
    <Navbar expand="lg" className="student-navbar shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard" className="fw-bold">
          LC <span style={{ opacity: 0.8 }}>Portal</span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="student-navbar-nav" />
        
        <Navbar.Collapse id="student-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard" active={location.pathname === '/dashboard'}>
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/rooms" active={location.pathname === '/rooms'}>
              Study Rooms
            </Nav.Link>
            <Nav.Link as={Link} to="/equipment" active={location.pathname === '/equipment'}>
              Equipment
            </Nav.Link>
          </Nav>
          
          <Nav>
            <NavDropdown title="My Account" id="student-nav-dropdown" align="end">
              <NavDropdown.Item as={Link} to="/profile">Profile Settings</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/">Logout</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default StudentHeader;