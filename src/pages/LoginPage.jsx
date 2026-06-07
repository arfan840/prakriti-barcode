import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  isWebBluetoothSupported, 
  connectBluetoothScale, 
  disconnectActiveDevice, 
  isScaleConnected, 
  getConnectedDeviceName,
  simulateWeightFetch
} from '../lib/bluetoothScale';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleDeviceName, setScaleDeviceName] = useState('');
  const [scaleWeight, setScaleWeight] = useState('0.000');
  const [btLoading, setBtLoading] = useState(false);
  const [btStatus, setBtStatus] = useState('');
  const [btError, setBtError] = useState('');

  const resetConnection = () => {
    disconnectActiveDevice();
    setScaleConnected(false);
    setScaleDeviceName('');
    setScaleWeight('0.000');
    setBtStatus('');
    setBtError('');
  };

  useEffect(() => {
    const connected = isScaleConnected();
    setScaleConnected(connected);
    if (connected) {
      const name = getConnectedDeviceName();
      setScaleDeviceName(name);
      setBtStatus('Scale connected.');
      connectBluetoothScale(
        (val) => setScaleWeight(val),
        (err) => {
          setScaleConnected(false);
          setBtError(err.message || String(err));
        },
        (statusText) => setBtStatus(statusText)
      );
    }
  }, []);

  const handleConnectScale = async () => {
    setBtError('');
    if (!isWebBluetoothSupported()) {
      setBtError('Web Bluetooth is not supported in this browser. Localhost or HTTPS is required.');
      return;
    }
    setBtLoading(true);
    setBtStatus('Initializing Bluetooth...');
    connectBluetoothScale(
      (val) => {
        setScaleWeight(val);
        setBtStatus('✅ Weight received successfully!');
      },
      (err) => {
        setBtLoading(false);
        setBtStatus('');
        setBtError(err.message || String(err));
        setScaleConnected(false);
      },
      (statusText) => {
        setBtStatus(statusText);
        if (statusText.includes('Connected') || statusText.includes('Awaiting')) {
          setScaleConnected(true);
          setScaleDeviceName(getConnectedDeviceName());
          setBtLoading(false);
        }
      }
    );
  };

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
            let hospitalId = null;
            if (email.includes('driver')) autoRole = 'driver';
            else if (email.includes('manager')) autoRole = 'plant_manager';
            else if (email.includes('authority')) autoRole = 'regulatory';
            else if (email.includes('hcf')) {
              autoRole = 'hcf';
              const hcfMatch = email.match(/hcf(\d+)/i);
              if (hcfMatch) {
                const code = `HCF${hcfMatch[1].padStart(4, '0')}`;
                const { data: hosp } = await supabase.from('hospitals').select('id').eq('hcf_code', code).maybeSingle();
                if (hosp) hospitalId = hosp.id;
              }
              if (!hospitalId) {
                const { data: hosps } = await supabase.from('hospitals').select('id').limit(1);
                if (hosps && hosps.length > 0) hospitalId = hosps[0].id;
              }
            }

            await supabase.from('profiles').insert({
               id: signupData.user.id,
               name: email.split('@')[0],
               email: email,
               role: autoRole,
               phone: '1234567890',
               hospital_id: hospitalId
            });
            
            user = { role: autoRole, hospital_id: hospitalId };
         } else {
            throw err;
         }
      }

      if (user?.role === 'driver') navigate('/driver');
      else if (user?.role === 'plant_manager' || user?.role === 'manager') navigate('/plant');
      else if (user?.role === 'hcf') navigate('/hcf');
      else navigate('/admin');
      
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and Supabase settings.');
    } finally {
      setLoading(false);
    }
  };

  const showScaleSetup = email.toLowerCase().includes('driver') || email.toLowerCase().includes('hcf');

  return (
    <div className="login-page">
      <div className="login-card slide-up">
        <div className="login-logo">
          <div className="login-logo-icon">☣️</div>
          <h1>Prakriti<span>Track</span></h1>
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

        {showScaleSetup && (
          <>
            <div style={{ margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }}></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>📶 Weighing Scale Setup</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }}></div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              transition: 'all var(--transition-base)',
              marginBottom: 16
            }} className="scale-setup-panel">
              {scaleConnected ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--accent-success)', fontWeight: 600 }}>
                    <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block', boxShadow: '0 0 8px var(--accent-success)' }}></span>
                    Connected to {scaleDeviceName}
                  </div>
                  <div style={{ fontSize: '2rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0', textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>
                    {scaleWeight} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kg</span>
                  </div>
                  <button onClick={resetConnection} className="btn btn-secondary btn-sm" style={{ width: '100%', borderRadius: 12, justifyContent: 'center' }}>
                    ✕ Disconnect Scale
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button 
                    onClick={handleConnectScale} 
                    className="btn btn-secondary btn-sm" 
                    style={{ width: '100%', borderRadius: 12, justifyContent: 'center', border: '1px solid var(--border-color)' }}
                    disabled={btLoading}
                  >
                    {btLoading ? '⏳ Connecting...' : '📶 Pair & Connect Scale'}
                  </button>
                  {btStatus && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {btStatus}
                    </div>
                  )}
                  {btError && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', background: 'rgba(239, 68, 68, 0.05)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      {btError}
                    </div>
                  )}
                  {!isWebBluetoothSupported() && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-warning)', background: 'rgba(197, 151, 91, 0.05)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(197, 151, 91, 0.1)' }}>
                      ⚠️ Browser Web Bluetooth unsupported (requires HTTPS or localhost).
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}


      </div>
    </div>
  );
}
