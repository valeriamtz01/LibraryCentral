import {useState} from 'react'; // for form state management
import { Container, Row, Col, Button, Card, Form, InputGroup } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api'; // for API calls to backend
import './SignUp.css'; // importing customized css styles --> we have hero-section for background image here and can add more styles as needed
import Header from "../components/Header";
import Footer from "../components/Footer";

const SignUp = () => {
  const navigate = useNavigate(); // react-router-dom hook for navigation after successful login

  // state variables for form input  && UI behavior
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });


  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // validate user input before submitting to API
  const isPasswordValid = formData.password.length >= 6; // simple password length check
  const isEmailValid = /^[a-zA-Z0-9._%+-]+@utrgv\.edu$/.test(formData.email); // regex to ensure email is in the correct format and belongs to UTRGV
  
  // handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // to define the required domain
      const emailDomain = "@utrgv.edu";

      // check if email ends with the required domain
      if (!formData.email.toLowerCase().endsWith(emailDomain)) {
        setError(`Please use a valid university email ending in ${emailDomain}`);
        return; // Stop the plumbing from sending data to the server
      }

      setLoading(true);

      try {
        // API call to  Django backend
        const response = await api.post('/auth/register/', {
          name: formData.fullName,
          email: formData.email,
          password: formData.password
        });

        if (response.status === 201 || response.status === 200) { // success status codes for creation
          setLoading(false);
          // successful signup leads to login
          navigate('/login');
        }
      } catch (err: any) {
        setLoading(false);
        // display backend error or generic message
        setError(err.response?.data?.detail || 'Something went wrong. Registration Failed.');
      }
    };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1 sign-up-page">
        <section className="hero-section">
          <Container className = 'px-0 d-flex justify-content-center'>
            <Row className="justify-content-center w-100"> {/* this centers the form horizontally */}
              <Col sm={10} md={8} lg={5} > {/* this sets the width of the form on medium and large screens */}
              
                <Card className="signup-card shadow-lg border-0">
                  <Card.Body className="p-4">

                    {/* title Section */}
                    <div className="text-center mb-4">
                      <h2>
                          Create Your Account
                      </h2>
                    </div>

                      {error && <div className="alert alert-danger p-2 small">{error}</div>}

                    <Form onSubmit={handleSubmit}> 
                      <Form.Group className = "mb-3" controlId = "fullName">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control 
                          type = "text" 
                          placeholder = "Enter your full name" 
                          value={formData.fullName} 
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>


                      <Form.Group className = "mb-3" controlId="email">
                        <Form.Label>Email</Form.Label>
                        <Form.Control 
                          type = "email" 
                          placeholder = "Enter email" 
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>


                      <Form.Group className="mb-3" controlId="password">
                        <Form.Label>
                          Password <span className="text-muted" style={{ fontSize: "0.85rem" }}>(min 6 characters)</span>
                        </Form.Label>
                        <InputGroup>
                          <Form.Control 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                          />
                          {/* the eye icon toggle */}
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="border-start-0"
                          >
                            <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                          </Button>
                        </InputGroup>
                        {/* check if */}
                        <Form.Text className={isPasswordValid ? "text-success" : "text-muted"}>
                        </Form.Text>
                      </Form.Group>


                      <div className = "d-grid">
                        <Button
                          className="btn btn-primary w-100"
                          type = "submit"
                          disabled={!isEmailValid || !isPasswordValid || loading} // disable if email or password is invalid or if loading
                        >
                          {loading ? 'Registering...' : 'Register Now'}
                        </Button>
                      </div>


                      <div className = "text-center mt-3 small">
                        Already registered? {""}
                        <Link to = "/login" >Log In</Link>
                      </div>
                  </Form>


                  </Card.Body>
                </Card>

              </Col>
            </Row>  
          </Container>
        </section>
      </main>
      <Footer/>
    </div>
  );
};


export default SignUp;
