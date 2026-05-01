import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Batches() {
  const { supabase, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [availableBags, setAvailableBags] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBags, setSelectedBags] = useState([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: bData } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      if (bData) {
         setBatches(bData.map(b => ({ ...b, batchNumber: b.batch_number, bagCount: b.bag_count, totalWeight: b.total_weight, createdAt: b.created_at })));
      }
      const { data: bags } = await supabase.from('bags').select('*').eq('status', 'received');
      if (bags) setAvailableBags(bags);
    }
    load();
  }, [refresh, supabase]);

  const handleCreate = async () => {
    if (selectedBags.length === 0) return;
    const activeBags = availableBags.filter(b => selectedBags.includes(b.id));
    const totalWeight = activeBags.reduce((sum, b) => sum + (b.weight || 0), 0);
    const batchNumber = `BT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Insert batch
    const { data: newBatch, error } = await supabase.from('batches').insert({
        batch_number: batchNumber,
        bag_count: selectedBags.length,
        total_weight: totalWeight,
        status: 'pending'
    }).select().single();
    
    if (error || !newBatch) return;

    // Update bags status and link to batch
    await supabase.from('bags').update({ 
        status: 'in_batch',
        batch_id: newBatch.id 
    }).in('id', selectedBags);
    
    supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'BATCH_CREATED', entity: 'BATCH', entity_id: newBatch.id, details: `Created batch with ${selectedBags.length} bags` }).then();

    setShowCreate(false);
    setSelectedBags([]);
    setRefresh(r => r + 1);
  };

  const toggleBag = (id) => {
    setSelectedBags(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📦 Batch Management</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Batch</button>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Batch</th><th>Bags</th><th>Weight</th><th>Categories</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.batchNumber}</td>
                  <td>{b.bagCount}</td>
                  <td>{b.totalWeight} kg</td>
                  <td>{b.categories?.map(c => <span key={c} className={`badge badge-${c}`} style={{ marginRight: 4 }}>{c}</span>)}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {batches.length === 0 && <div className="empty-state"><div className="empty-state-icon">📦</div><p className="empty-state-text">No batches created yet</p></div>}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Create New Batch</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Select received bags to add to this batch ({selectedBags.length} selected)</p>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {availableBags.length === 0 ? (
                <div className="empty-state"><p className="empty-state-text">No received bags available</p></div>
              ) : (
                availableBags.map(bag => (
                  <label key={bag.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: selectedBags.includes(bag.id) ? 'var(--bg-hover)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4 }}>
                    <input type="checkbox" checked={selectedBags.includes(bag.id)} onChange={() => toggleBag(bag.id)} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 120 }}>{bag.barcode}</span>
                    <span className={`badge badge-${bag.category}`}>{bag.category}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>{bag.weight} kg</span>
                  </label>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={selectedBags.length === 0}>Create Batch ({selectedBags.length} bags)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
