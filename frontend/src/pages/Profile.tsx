import { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Modal, Form, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';
import { api } from '../api';
import 'bootstrap-icons/font/bootstrap-icons.css';

//  types 
interface ProfileData {
  user_name: string;
  email: string;
  first_name: string;
  last_name: string;
  activeRooms: number;
  activeComputers: number;
  equipmentLoans: number;
}

// one item in the activity feed: shape matches what activity_history returns
interface ActivityItem {
  type: 'room' | 'computer' | 'equipment'; // used to pick icon + color
  label: string;        // ex "Room Reservation"
  description: string;  // ex "Study Room A" or "DSLR Camera"
  date: string;         // ISO string = when the activity started
  end_date: string;     // ISO string = when it ended / was returned
  status: string;       // "Completed", "Cancelled", "Returned"
}

// herlpers

// turns a full name into 1-2 initials for the avatar circle
const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// formats an ISO date string into a friendly short date: "Apr 28, 2:00 PM"
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  });

// returns the right Bootstrap-Icons class + accent color for each activity type
const activityMeta = (type: ActivityItem['type']) => {
  switch (type) {
    case 'room':      return { icon: 'bi-door-open',   color: '#C0421A' };
    case 'computer':  return { icon: 'bi-display',     color: '#185FA5' };
    case 'equipment': return { icon: 'bi-laptop',      color: '#1D9E75' };
  }
};

// returns badge color based on the status string
const statusVariant = (status: string): string => {
  if (status === 'Completed' || status === 'Returned') return 'success';
  if (status === 'Cancelled') return 'danger';
  return 'secondary';
};

// sub-components 

// one labelled field: small grey label on top, bold value below
const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', fontWeight: 500 }}>
      {label}
    </div>
    <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>
      {value || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>—</span>}
    </div>
  </div>
);

// white card with a title row and an optional orange Edit button
const Section = ({
  title,
  badge,
  onEdit,
  children,
}: {
  title: string;
  badge?: string | number;
  onEdit?: () => void;
  children: React.ReactNode;
}) => (
  <div
    style={{
      backgroundColor: '#fff',
      borderRadius: '16px',
      padding: '28px 32px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      marginBottom: '20px',
    }}
  >
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div className="d-flex align-items-center gap-2">
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h2>
        {badge !== undefined && (
          <Badge bg="secondary" style={{ fontSize: '11px', fontWeight: 500 }}>
            {badge}
          </Badge>
        )}
      </div>
      {onEdit && (
        <Button
          size="sm"
          onClick={onEdit}
          style={{
            backgroundColor: '#C0421A',
            borderColor: '#C0421A',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
          }}
        >
          Edit <i className="bi bi-pencil-square" />
        </Button>
      )}
    </div>
    {children}
  </div>
);

// main component 

const Profile = () => {
  const navigate = useNavigate();

  // profile data state 
  const [profile, setProfile] = useState<ProfileData>({
    user_name: '',
    email: '',
    first_name: '',
    last_name: '',
    activeRooms: 0,
    activeComputers: 0,
    equipmentLoans: 0,
  });
  const [loading, setLoading] = useState(true);

  // activity history state 
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // filter controls — lets the student narrow the feed by type
  const [filter, setFilter] = useState<'all' | 'room' | 'computer' | 'equipment'>('all');

  // edit-info modal state 
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' });
  const [saving, setSaving] = useState(false);

  // change-password modal state 
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  // the fetch profile summary 
  // calling profile_summary in views which returns name, email, active counts
  const fetchProfile = async () => {
    try {
      const res = await api.get('/user/profile-summary/');
      const d = res.data;
      setProfile({
        user_name:      d.user_name    || '',
        email:          d.email        || '',
        first_name:     d.first_name   || d.user_name?.split(' ')[0] || '',
        last_name:      d.last_name    || d.user_name?.split(' ').slice(1).join(' ') || '',
        activeRooms:    d.activeRooms    ?? 0,
        activeComputers:d.activeComputers ?? 0,
        equipmentLoans: d.equipmentLoans  ?? 0,
      });
    } catch (err) {
      console.error('Profile fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // fetch activity history 
  // so calls activity_history in views which returns merged sorted list of all
  // past reservations (room + computer) and returned equipment checkouts
  const fetchHistory = async () => {
    try {
      const res = await api.get('/user/activity-history/');
      setHistory(res.data.history);
    } catch (err) {
      console.error('History fetch failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, []);

  // edit personal info 
  const openEditModal = () => {
    setEditForm({ first_name: profile.first_name, last_name: profile.last_name, email: profile.email });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.patch('/user/profile/', editForm);
      await fetchProfile();
      setShowEditModal(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  // change password 
  const openPwModal = () => {
    setPwForm({ current: '', next: '', confirm: '' });
    setPwError('');
    setShowPwModal(true);
  };

  const savePw = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwError("New passwords don't match."); return; }
    setPwSaving(true);
    setPwError('');
    try {
      await api.post('/auth/change-password/', { current_password: pwForm.current, new_password: pwForm.next });
      setShowPwModal(false);
    } catch (err: any) {
      setPwError(err?.response?.data?.error || 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  };

  // derived values 
  const initials = getInitials(profile.user_name || 'U');
  const role = 'Student';

  // apply the active filter to the history list
  const filteredHistory = filter === 'all' ? history : history.filter(h => h.type === filter);

  return (
    <div className="d-flex flex-column min-vh-100" style={{ paddingTop: '56px', backgroundColor: '#f4f5f7' }}>
      <StudentHeader />

      <main className="flex-grow-1">
        <Container className="py-4" style={{ maxWidth: '900px' }}>

          {/*  avatar + name header card  */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
            <div className="d-flex align-items-center gap-4">

              {/* initials avatar circle */}
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#C0421A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, color: '#fff', flexShrink: 0, userSelect: 'none' }}>
                {loading ? '…' : initials}
              </div>

              {/* name + role */}
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {loading ? '…' : profile.user_name}
                </h1>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{role}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>UTRGV Library</div>
              </div>

              {/* live activity counts which is hidden on mobile to not mess with header */}
              <div className="d-flex gap-3 d-none d-md-flex">
                {[
                  { label: 'Rooms',     value: profile.activeRooms,     color: '#C0421A' },
                  { label: 'Computers', value: profile.activeComputers,  color: '#185FA5' },
                  { label: 'On Loan',   value: profile.equipmentLoans,   color: '#1D9E75' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', borderLeft: `3px solid ${color}`, paddingLeft: '14px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* personal info */}
          <Section title="Personal Information" onEdit={openEditModal}>
            <Row className="g-4">
              <Col xs={12} md={4}><Field label="First Name"     value={profile.first_name} /></Col>
              <Col xs={12} md={4}><Field label="Last Name"      value={profile.last_name}  /></Col>
              <Col xs={12} md={4}><Field label="User Role"      value={role}               /></Col>
              <Col xs={12} md={4}><Field label="Email Address"  value={profile.email}      /></Col>
              <Col xs={12} md={4}><Field label="Username"       value={profile.user_name}  /></Col>
              <Col xs={12} md={4}><Field label="Institution"    value="UTRGV"              /></Col>
            </Row>
          </Section>

          {/* account + security */}
          <Section title="Account & Security" onEdit={openPwModal}>
            <Row className="g-4 align-items-center">
              <Col xs={12} md={6}><Field label="Password"     value="••••••••••••" /></Col>
              <Col xs={12} md={6}>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Last updated</div>
                <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>—</div>
              </Col>
            </Row>
          </Section>

          {/* activity history */}
          {/*
            fetches from /user/activity-history/ which
            returns past reservations (room + computer) and returned equipment,
             filter buttons let the student narrow down by type
          */}
          <Section
            title="Activity History"
            badge={historyLoading ? '…' : history.length}
          >
            {/* filter pill buttons */}
            <div className="d-flex flex-wrap gap-2 mb-4">
              {([
                { key: 'all',       label: 'All' },
                { key: 'room',      label: 'Rooms' },
                { key: 'computer',  label: 'Computers' },
                { key: 'equipment', label: 'Equipment' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    // active pill: filled orange. inactive: outlined grey.
                    backgroundColor: filter === key ? '#C0421A' : '#fff',
                    borderColor:     filter === key ? '#C0421A' : '#d1d5db',
                    color:           filter === key ? '#fff'    : '#6b7280',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* history list */}
            {historyLoading ? (
              // loading state — shows while the API call is in flight
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-secondary" role="status" />
                <p className="text-muted mt-2 mb-0" style={{ fontSize: '13px' }}>Loading history…</p>
              </div>

            ) : filteredHistory.length === 0 ? (
              // empty state — either no history at all, or filter has no matches
              <div className="text-center py-5">
                <i className="bi bi-clock-history" style={{ fontSize: '2rem', color: '#dee2e6' }} />
                <p className="text-muted mt-2 mb-0" style={{ fontSize: '13px' }}>
                  {filter === 'all' ? 'No past activity yet.' : `No past ${filter} activity.`}
                </p>
              </div>

            ) : (
              // the actual activity list = one row per item
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredHistory.map((item, idx) => {
                  const { icon, color } = activityMeta(item.type);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '14px 16px',
                        backgroundColor: '#fafafa',
                        borderRadius: '10px',
                        border: '1px solid #f0f0f0',
                      }}
                    >
                      {/* colored icon circle — color matches the activity type */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: `${color}15`, // 15 = ~8% opacity hex
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <i className={`bi ${icon}`} style={{ fontSize: '16px', color }} />
                      </div>

                      {/* in the middle: label + description + date range */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                          {item.description}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          {item.label} · {fmt(item.date)}
                          {item.end_date && ` → ${fmt(item.end_date)}`}
                        </div>
                      </div>

                      {/* in the right: status badge */}
                      <Badge
                        bg={statusVariant(item.status)}
                        style={{ fontSize: '11px', fontWeight: 500, flexShrink: 0 }}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* the quick links at bottom */}
          <Section title="Quick Links">
            <div className="d-flex flex-wrap gap-2">
              {[
                { label: 'Go to Dashboard',    icon: 'bi-speedometer2', path: '/dashboard'    },
                { label: 'Book a Study Space', icon: 'bi-calendar-plus', path: '/study-spaces' },
                { label: 'Browse Equipment',   icon: 'bi-laptop',        path: '/equipment'    },
              ].map(({ label, icon, path }) => (
                <Button
                  key={label}
                  variant="outline-secondary"
                  size="sm"
                  style={{ borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => navigate(path)}
                >
                  <i className={`bi ${icon}`} /> {label}
                </Button>
              ))}
            </div>
          </Section>

        </Container>
      </main>

      <Footer />

      {/* edit personal info modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0f0f0' }}>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 700 }}>Edit Personal Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>First Name</Form.Label>
                  <Form.Control
                    value={editForm.first_name}
                    onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                    style={{ borderRadius: '8px', fontSize: '14px' }}
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Last Name</Form.Label>
                  <Form.Control
                    value={editForm.last_name}
                    onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                    style={{ borderRadius: '8px', fontSize: '14px' }}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    style={{ borderRadius: '8px', fontSize: '14px' }}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f0f0f0' }}>
          <Button variant="outline-secondary" size="sm" style={{ borderRadius: '8px' }} onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button size="sm" style={{ backgroundColor: '#C0421A', borderColor: '#C0421A', borderRadius: '8px' }} onClick={saveEdit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* change password modal */}
      <Modal show={showPwModal} onHide={() => setShowPwModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0f0f0' }}>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 700 }}>Change Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Current Password</Form.Label>
              <Form.Control type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} style={{ borderRadius: '8px', fontSize: '14px' }} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>New Password</Form.Label>
              <Form.Control type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} style={{ borderRadius: '8px', fontSize: '14px' }} />
            </Form.Group>
            <Form.Group>
              <Form.Label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Confirm New Password</Form.Label>
              <Form.Control type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} style={{ borderRadius: '8px', fontSize: '14px' }} isInvalid={!!pwError} />
              {pwError && <Form.Control.Feedback type="invalid">{pwError}</Form.Control.Feedback>}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #f0f0f0' }}>
          <Button variant="outline-secondary" size="sm" style={{ borderRadius: '8px' }} onClick={() => setShowPwModal(false)}>Cancel</Button>
          <Button size="sm" style={{ backgroundColor: '#C0421A', borderColor: '#C0421A', borderRadius: '8px' }} onClick={savePw} disabled={pwSaving}>
            {pwSaving ? 'Saving…' : 'Update Password'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Profile;
