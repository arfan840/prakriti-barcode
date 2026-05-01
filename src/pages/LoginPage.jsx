import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

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
      let user = null;
      try {
        user = await login(email, password);
      } catch (err) {
        if (err.message.includes('Invalid login') || err.message.includes('credentials')) {
           // Auto-signup for demo purposes
           const { data: signupData, error: signUpError } = await supabase.auth.signUp({ email, password });
           if (signUpError || !signupData?.user) throw err;

           let autoRole = 'plant_head';
           if (email.includes('driver')) autoRole = 'driver';
           else if (email.includes('manager')) autoRole = 'plant_manager';
           else if (email.includes('authority')) autoRole = 'regulatory';

           await supabase.from('profiles').insert({
              id: signupData.user.id,
              name: email.split('@')[0],
              email: email,
              role: autoRole,
              phone: '1234567890'
           });
           
           user = { role: autoRole };
        } else {
           throw err;
        }
      }

      if (user?.role === 'driver') navigate('/driver');
      else if (user?.role === 'plant_manager' || user?.role === 'manager') navigate('/plant');
      else navigate('/admin');
      
    } catch (err) {
      setError('Login failed. Please ensure "Confirm Email" is disabled in Supabase Auth settings!');
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
