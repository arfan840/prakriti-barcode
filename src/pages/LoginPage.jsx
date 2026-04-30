import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'driver') navigate('/driver');
      else if (user.role === 'plant_manager') navigate('/plant');
      else navigate('/admin');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email, password) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="login-page">
      <div className="login-card slide-up">
        <div className="login-logo">
          <div className="login-logo-icon">☣️</div>
          <h1>Bio<span>Track</span></h1>
          <p>Biomedical Waste Management System</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              id="login-email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              id="login-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading} id="login-submit">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-demo">
          <strong>Demo Credentials (click to fill):</strong>
          <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
            <span onClick={() => quickLogin('admin@biotrack.in', 'admin123')} style={{ cursor: 'pointer' }}>
              🔑 Plant Head: <code>admin@biotrack.in</code> / <code>admin123</code>
            </span>
            <span onClick={() => quickLogin('manager@biotrack.in', 'manager123')} style={{ cursor: 'pointer' }}>
              🔑 Manager: <code>manager@biotrack.in</code> / <code>manager123</code>
            </span>
            <span onClick={() => quickLogin('driver1@biotrack.in', 'driver123')} style={{ cursor: 'pointer' }}>
              🔑 Driver: <code>driver1@biotrack.in</code> / <code>driver123</code>
            </span>
            <span onClick={() => quickLogin('authority@biotrack.in', 'authority123')} style={{ cursor: 'pointer' }}>
              🔑 Regulatory: <code>authority@biotrack.in</code> / <code>authority123</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
