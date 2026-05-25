import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navConfig = {
  admin: {
    title: 'Prakriti Track — Admin',
    sections: [
      {
        title: 'Overview',
        items: [
          { path: '/admin', icon: '📊', label: 'Dashboard', end: true },
          { path: '/admin/bags', icon: '🏷️', label: 'Bag Tracker' },
        ]
      },
      {
        title: 'Management',
        items: [
          { path: '/admin/hospitals', icon: '🏥', label: 'HCF Registry' },
          { path: '/admin/vehicles', icon: '🚛', label: 'Vehicles' },
          { path: '/admin/users', icon: '👥', label: 'Users' },
          { path: '/admin/discrepancies', icon: '⚠️', label: 'Discrepancies' },
        ]
      },
      {
        title: 'Reports & Compliance',
        items: [
          { path: '/admin/reports', icon: '📈', label: 'Reports' },
          { path: '/admin/certificates', icon: '📜', label: 'Certificates' },
          { path: '/admin/audit', icon: '🔒', label: 'Audit Logs' },
        ]
      }
    ]
  },
  plant: {
    title: 'Plant Module',
    sections: [
      {
        title: 'Operations',
        items: [
          { path: '/plant', icon: '📊', label: 'Dashboard', end: true },
          { path: '/plant/gate-scan', icon: '📷', label: 'Gate Scan' },
          { path: '/plant/reconciliation', icon: '🔄', label: 'Reconciliation' },
        ]
      },
      {
        title: 'Processing',
        items: [
          { path: '/plant/batches', icon: '📦', label: 'Batches' },
          { path: '/plant/treatment', icon: '♻️', label: 'Treatment & Certs' },
        ]
      }
    ]
  },
  driver: {
    title: 'Driver App',
    sections: [
      {
        title: 'Driver Operations',
        items: [
          { path: '/driver', icon: '📱', label: 'Scanner & Route', end: true },
        ]
      }
    ]
  },
  hcf: {
    title: 'HCF Portal',
    sections: [
      {
        title: 'HCF Operations',
        items: [
          { path: '/hcf', icon: '🏥', label: 'Dashboard', end: true },
          { path: '/hcf/scan', icon: '📷', label: 'Dispatch Waste' },
        ]
      }
    ]
  }
};

export default function AppLayout({ module }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const config = navConfig[module];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const moduleLinks = [
    { path: '/admin', label: 'Admin', roles: ['plant_head', 'plant_manager', 'regulatory'] },
    { path: '/plant', label: 'Plant', roles: ['plant_head', 'plant_manager'] },
    { path: '/driver', label: 'Driver', roles: ['driver'] },
    { path: '/hcf', label: 'HCF Portal', roles: ['hcf'] },
  ].filter(m => m.roles.includes(user?.role));

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">☣️</div>
          <div className="sidebar-brand-text">Prakriti<span>Track</span></div>
        </div>

        {config.sections.map((section, si) => (
          <div className="sidebar-section" key={si}>
            <div className="sidebar-section-title">{section.title}</div>
            <ul className="sidebar-nav">
              {section.items.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {moduleLinks.length > 1 && (
          <div className="sidebar-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <div className="sidebar-section-title">Switch Module</div>
            <ul className="sidebar-nav">
              {moduleLinks.filter(m => m.path !== `/${module}`).map(m => (
                <li key={m.path}>
                  <NavLink to={m.path} className="sidebar-nav-item" onClick={() => setSidebarOpen(false)}>
                    <span className="nav-icon">↗️</span>{m.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <div className="main-content">
        <header className="top-header">
          <div className="top-header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <h1>{config.title}</h1>
          </div>
          <div className="top-header-right">
            <div className="user-info" onClick={handleLogout} title="Click to logout" style={{ cursor: 'pointer' }}>
              <div className="user-info-text">
                <div className="user-info-name">{user?.name}</div>
                <div className="user-info-role">{user?.role?.replace(/_/g, ' ')}</div>
              </div>
              <div className="user-avatar">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <main className="page-content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
