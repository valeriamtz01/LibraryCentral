import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import Footer from "../components/Footer";
import './Home.css'; // <--- import styles!

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1 home-page">
        <section className="hero-section text-center">
          <Container>
            <Row className="justify-content-center">
              <Col md={10} lg={8}>
                <h1 className="display-3 fw-bold mb-3">Library Central</h1>
                <p className="lead mb-5 px-md-5">
                  For the UTRGV Main Campus Library (Edinburg). Manage study room reservations,
                  track equipment checkouts, and view your student dashboard.
                </p>
                <div className="d-flex gap-3 justify-content-center">
                  <Button onClick={() => navigate('/signup')} variant="primary" size="lg" 
                          style={{backgroundColor: '#f05023', borderColor: '#f05023'}}>
                    Sign Up
                  </Button>
                  <Button onClick={() => navigate('/login')} variant="outline-light" size="lg">
                    Log In
                  </Button>
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
