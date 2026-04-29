import {Container, Navbar, Nav} from 'react-bootstrap';
import { NavLink } from "react-router-dom";
import { resolveBackendOrigin } from "../api";
import'./Header.css'; // importing custom CSS for header styling

const Header = () => {
  const backendOrigin = resolveBackendOrigin();

  return (
      <Navbar fixed="top" className="custom-navbar" bg="dark" data-bs-theme="dark">
        <Container>
          <Navbar.Brand>LibraryCentral</Navbar.Brand>
          <Nav className="justify-content-end">
            <Nav.Link as={NavLink} to="/" end>Home</Nav.Link>
            <Nav.Link as={NavLink} to="/signup">Sign Up</Nav.Link>
            <Nav.Link as={NavLink} to="/login">Login</Nav.Link>

            {/* Admin link — opens Django admin panel in a new tab.
                href points directly to the Django admin URL (not a React route).
                target="_blank" opens in a new tab so the user doesn't leave the app.
                rel="noreferrer" is a security best practice when using target="_blank" —
                prevents the new tab from accessing the opener window via window.opener.
                bi-lock — Bootstrap Icon: padlock, signals restricted/admin access. */}
            <Nav.Link
              href={`${backendOrigin}/admin/`}
              target="_blank"
              rel="noreferrer"
            >
              <i className="bi bi-lock me-1" style={{ fontSize: '12px' }}></i>
              Admin
            </Nav.Link>

          </Nav>
        </Container>
      </Navbar>
  );
}

export default Header;
