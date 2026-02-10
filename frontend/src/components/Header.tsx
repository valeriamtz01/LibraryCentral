import {Container, Navbar, Nav} from 'react-bootstrap';
import { NavLink } from "react-router-dom";
import'./Header.css'; // importing custom CSS for header styling

const Header = () => {
  return (
      <Navbar fixed="top" className="custom-navbar" bg="dark" data-bs-theme="dark">
        <Container>
          <Navbar.Brand>LibraryCentral</Navbar.Brand>
          <Nav className="justify-content-end">
            <Nav.Link as={NavLink} to="/" end>Home</Nav.Link>
            <Nav.Link as={NavLink} to="/signup">Sign Up</Nav.Link>
            <Nav.Link as={NavLink} to="/login">Login</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
  );
}

export default Header;