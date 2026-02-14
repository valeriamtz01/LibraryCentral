import { Container, Row, Col, Button, Card, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './SignUp.css'; // importing customized css styles --> we have hero-section for background image here and can add more styles as needed



const SignUp = () => {
  return (
    <div className="sign-up-page">
      {/* section for background image*/}
      <section className="hero-section">

        <Container className = 'px-0 d-flex justify-content-center'>
          <Row className="justify-content-center w-100"> {/* this centers the form horizontally */}
            <Col md={0} lg={6} > {/* this sets the width of the form on medium and large screens */}
             
              <Card className="signup-card shadow-lg border-0">
                <Card.Body className="p-4">

                  {/* title Section */}
                  <div className="text-center mb-4">
                    <h3 className="fw-bold mb-2">
                      <i className="bi bi-person-plus-fill me-2"></i>
                        User Signup
                    </h3>
                    <p className="text-muted small">
                      Create your Library Central account to manage reservations and checkouts.
                    </p>
                  </div>

                  <Form> {/* is not connected to backend and no submit handler */}
                    <Form.Group className = "mb-3" controlId = "fullName">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control type = "text" placeholder = "Enter your full name" />
                    </Form.Group>


                    <Form.Group className = "mb-3" controlId="email">
                      <Form.Label>Email</Form.Label>
                      <Form.Control type = "email" placeholder = "Enter email" />
                    </Form.Group>


                    <Form.Group className = "mb-3" controlId="password">
                      <Form.Label>
                        Password <span className = "text-muted" style = {{ fontSize: "0.85 rem"}}> (min 6 characters) </span> {/* bootstrap */}
                        </Form.Label>
                      <Form.Control type = "password" placeholder = "Enter password" />
                    </Form.Group>


                    <Form.Group className = "mb-3" controlId="confirmPassword">
                      <Form.Label>Confirm Password</Form.Label>
                      <Form.Control type = "password" placeholder = "Confirm password" />
                    </Form.Group>


                    <div className = "d-grid">
                      <Button
                        size = "lg"
                        style = {{backgroundColor: '#f05023', borderColor: '#f05023'}}
                        >
                          Register Now &#174;
                        </Button>
                    </div>


                    <div className = "text-center mt-3 small">
                      Already registered? {""}
                      <Link to = "/login" style = {{color: '#f05023', textDecoration:'underline'}}>Log In</Link>
                    </div>
                 </Form>


                </Card.Body>
              </Card>


            </Col>
          </Row>  
        </Container>
      </section>
    </div>
  );
};


export default SignUp;
