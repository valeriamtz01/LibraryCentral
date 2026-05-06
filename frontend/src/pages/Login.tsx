import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import './Login.css'; // importing customized css styles --> we have hero-section for background image here and can add more styles as needed
import { InputGroup, Button } from 'react-bootstrap';
import Header from "../components/Header";
import Footer from "../components/Footer";  

//functional login component with form handling and API integration
const Login = () => {
  const navigate = useNavigate(); // react-router-dom hook for navigation after successful login

  // State variables for form input  && UI behavior
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // for toggling password visibility
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // planning to track if user is logged in, can be used for conditional rendering of navbar and protected routes in the future
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  // planning to track password failed attempts for security measures in the future
  // const [failedAttempts, setFailedAttempts] = useState(0);

  //validate user input before submitting to API
  const validate = () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return false;
    }
    // simple email check --> updating to regex for better validation (checks for university email format)
    const re = /^[a-zA-Z0-9._%+-]+@utrgv\.edu$/;
    if (!re.test(email)) {
      setError('Please use your @utrgv.edu email address.');
      return false;
    }
    setError(null); //used to clear error if validation passes.
    return true;
  };

  //handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return; //stops submission if validation fails
    setLoading(true);
    setError(null); // clear previous errors before new attempt
    localStorage.removeItem("token"); // clears any old tokens before attempting again
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("omniagent_session_id_v1_") || key.startsWith("omniagent_widget_open_v1_")) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    
    try {
      //send login request to backend API with email and password
      const resp = await api.post('/auth/login/', { email, password });
      // Expect a token or user payload. Save token if present.
      if (resp?.data?.token) {
        localStorage.setItem('token', resp.data.token);
      }
      setLoading(false);
      navigate('/dashboard'); //redirect to dashboard on successful login
    } catch (err: any) {
      setLoading(false);
      // log full error for debugging network/CORS issues
      // eslint-disable-next-line no-console
      console.error('Login error', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Invalid Email or Password.';
      setError(String(msg));
    }
  };

  

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
       <main className="flex-grow-1 login-page">
        <section className="hero-section text-center">
          <div className="login-card">
            <h2>Welcome Back</h2>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@utrgv.edu"
                  required // to enforce user input before form submission. also handled in validate function for better error messaging and to prevent API calls with invalid data
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <InputGroup>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required // again, this enforces user input before submission and is complemented by the validate function for better user feedback
                />
                <Button 
                    variant="outline-secondary" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="border-start-0"
                  >
                    <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                  </Button>
                </InputGroup>
              </div>

              {/* submit button is disabled if email or password is empty or if loading is true to prevent multiple submissions */}
              <button className="btn btn-primary w-100" type="submit" disabled={!email || !password || loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            

            <div className="text-center mt-3 small">
              <span>New here? </span>
              <Link to="/signup">Create an account</Link>
            </div>

            {/* div for test accounts */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #e9ecef' }}>
            <p className="text-center text-muted mb-2" style={{ fontSize: '11px' }}>
              Test Accounts
            </p>
            <div className="d-flex flex-wrap gap-1 justify-content-center">
              {[
                { label: 'Vaquero 01', email: 'vaquero01@utrgv.edu', password: 'Vaquero01!' },
                { label: 'Vaquero 02', email: 'vaquero02@utrgv.edu', password: 'Vaquero02!' },
              ].map(({ label, email: e, password: p }) => (
                <button
                  key={e}
                  type="button"
                  onClick={async () => {
                    setEmail(e);
                    setPassword(p);
                    setLoading(true);
                    setError(null);
                    try {
                      const resp = await api.post('/auth/login/', { email: e, password: p });
                      if (resp?.data?.token) {
                        localStorage.setItem('token', resp.data.token);
                      }
                      navigate('/dashboard');
                    } catch (err: any) {
                      const msg = err?.response?.data?.error || 'Login failed.';
                      setError(String(msg));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '3px 12px',
                    borderRadius: '20px',
                    border: '1px solid #dee2e6',
                    backgroundColor: '#f8f9fa',
                    color: '#495057',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>


            {/* admin login button - removed it and instead added it to the header */}
             {/* <div className="text-center mt-3 pt-3 border-top">
              <a 
                href="/admin/" 
                target="_blank"
                rel="noreferrer"
                className="text-muted small d-inline-flex align-items-center gap-1 border rounded px-3 py-1"
                style={{ textDecoration: 'none', fontSize: '0.85rem' }}
              >
                <i className="bi bi-lock"></i>
                Admin login
              </a>
            </div> */}

        </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
