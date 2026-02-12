//import { Container, Row, Col, Button } from 'react-bootstrap';
//import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import './Login.css'; // importing customized css styles --> we have hero-section for background image here and can add more styles as needed

//functional login component with form handling and API integration
const Login = () => {
  const navigate = useNavigate(); // react-router-dom hook for navigation after successful login

  // State variables for form input  && UI behavior
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  //validate user input before submitting to API
  const validate = () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return false;
    }
    // simple email check
    const re = /^\S+@\S+\.\S+$/;
    if (!re.test(email)) {
      setError('Please enter a valid email address.');
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
    try {
      //send login request to backend API with email and password
      const resp = await api.post('/auth/login/', { email, password });
      // Expect a token or user payload. Save token if present.
      if (resp?.data?.token) {
        localStorage.setItem('token', resp.data.token);
      }
      setLoading(false);
      navigate('/');
    } catch (err: any) {
      setLoading(false);
      // log full error for debugging network/CORS issues
      // eslint-disable-next-line no-console
      console.error('Login error', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Login failed';
      setError(String(msg));
    }
  };

  

  return (
    <div className="login-page">
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
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button className="btn btn-primary w-100" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          

          <div className="mt-3">
            <span>New here? </span>
            <Link to="/signup">Create an account</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;