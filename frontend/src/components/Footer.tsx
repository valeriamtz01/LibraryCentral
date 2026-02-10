import { Container, Row, Col } from 'react-bootstrap';
import './Footer.css'; // importing footer custom styles 

const Footer = () => {
  return (
    <footer className="footer-custom fixed-bottom py-3">
      <Container>
        <Row className="align-items-center">
          <Col md={6} className="text-center text-md-start">
            <span className="fw-bold">LibraryCentral</span>
            <p className="small mb-0 text-white-50">
              © 2026 Senior Design Project | A Unified Reservation & Tracking System for Library Resources
            </p>
          </Col>
          
          <Col md={6} className="text-center text-md-end mt-3 mt-md-0">
            <ul className="list-inline mb-0">
              <li className="list-inline-item me-4">
                <a href="https://github.com/Alondra371/library" className="text-white-50 small">Github</a>
              </li>
              <li className="list-inline-item me-4">
                <a href="#" className="text-white-50 small">Resources</a>
              </li>
              <li className="list-inline-item">
                <a href="#" className="text-white-50 small">Contact Us</a>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;