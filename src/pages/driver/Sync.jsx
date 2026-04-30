import React, { useState, useEffect } from 'react';

export default function DriverSync() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('biotrack_sync_queue') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const addDemoItem = () => {
    const item = {
      id: Date.now(),
      type: ['scan', 'checkin', 'weigh'][Math.floor(Math.random() * 3)],
      data: `BMW${Date.now().toString().slice(-8)}`,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    const newQueue = [item, ...queue];
    setQueue(newQueue);
    localStorage.setItem('biotrack_sync_queue', JSON.stringify(newQueue));
  };

  const syncAll = () => {
    const synced = queue.map(q => ({ ...q, status: 'synced' }));
    setQueue(synced);
    localStorage.setItem('biotrack_sync_queue', JSON.stringify(synced));
  };

  const clearQueue = () => {
    setQueue([]);
    localStorage.removeItem('biotrack_sync_queue');
  };

  const pendingCount = queue.filter(q => q.status === 'pending').length;

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>☁️ Sync Queue</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`sync-item-status ${online ? 'synced' : 'failed'}`} />
          <span style={{ fontSize: '0.85rem' }}>{online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {!online && <div className="offline-banner" style={{ borderRadius: 'var(--radius-md)', marginBottom: 16 }}>📡 You are offline. Data will sync when connection is restored.</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-card-value">{pendingCount}</div>
          <div className="stat-card-label">Pending</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-card-value">{queue.filter(q => q.status === 'synced').length}</div>
          <div className="stat-card-label">Synced</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-card-value">{queue.length}</div>
          <div className="stat-card-label">Total</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-success" onClick={syncAll} disabled={pendingCount === 0} style={{ flex: 1 }}>
          ☁️ Sync All ({pendingCount})
        </button>
        <button className="btn btn-secondary" onClick={addDemoItem}>+ Demo Item</button>
        {queue.length > 0 && <button className="btn btn-danger btn-sm" onClick={clearQueue}>Clear</button>}
      </div>

      <div className="card">
        {queue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">☁️</div>
            <p className="empty-state-text">Sync queue is empty</p>
          </div>
        ) : (
          queue.map(q => (
            <div key={q.id} className="sync-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className={`sync-item-status ${q.status}`} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.type === 'scan' ? '📱 Scan' : q.type === 'checkin' ? '📍 Check-in' : '⚖️ Weigh'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.data}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge badge-${q.status === 'pending' ? 'pending' : 'treated'}`}>{q.status}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(q.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
