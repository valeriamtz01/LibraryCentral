import { useState, useEffect, useCallback } from 'react';
import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import './StudentHeader.css'; 

type DashNotification = {
  id: number;
  message: string;
  room_name: string | null;
  room_id: number | null;
  created_at: string;
};

const StudentHeader = () => {
  const location = useLocation();
  const [notifications, setNotifications] = useState<DashNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-read/', {});
      setNotifications([]);
      setShowNotifDropdown(false);
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <Navbar fixed="top" expand="lg" className="student-navbar shadow-sm">
      {/* added the same style to container that studyspaces and equipment use so that 'LC Portal' begins aligns with the content */} 
      <Container style={{ maxWidth: 1200}}>
        <Navbar.Brand as={Link} to="/dashboard" className="fw-bold">
          LC <span style={{ opacity: 0.8 }}>Portal</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="student-navbar-nav" />

        <Navbar.Collapse id="student-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard" active={location.pathname === '/dashboard'}>
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/study-spaces" active={location.pathname === '/study-spaces'}>
              Study Spaces
            </Nav.Link>
            <Nav.Link as={Link} to="/equipment" active={location.pathname === '/equipment'}>
              Equipment
            </Nav.Link>
          </Nav>

          <Nav className="d-flex align-items-center">
            <div className="position-relative me-3" style={{ minWidth: '44px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline-light position-relative"
                style={{ minWidth: '44px', minHeight: '44px', borderRadius: '12px' }}
                onClick={() => setShowNotifDropdown((prev) => !prev)}
                aria-label="Notifications"
              >
                <i className="bi bi-bell-fill" style={{ fontSize: '1.05rem' }} />
                {notifications.length > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: '0.65rem' }}
                  >
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '52px',
                    width: '320px',
                    zIndex: 1100,
                    backgroundColor: '#fff',
                    border: '1px solid rgba(0,0,0,0.12)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    color: '#1a1a1a',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                    <strong className="small mb-0" style={{ color: '#1a1a1a' }}>Notifications</strong>
                    {notifications.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        style={{ fontSize: '0.75rem' }}
                        onClick={markAllRead}
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>

                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div className="text-center p-3 text-muted small">No new notifications.</div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className="px-3 py-2 border-bottom">
                          <div className="small mb-1" style={{ fontWeight: 600, color: '#C0421A' }}>
                            New
                          </div>
                          <div className="small text-dark">{n.message}</div>
                          <div className="text-muted small">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
