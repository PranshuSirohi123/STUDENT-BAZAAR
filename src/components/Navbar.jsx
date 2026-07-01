import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out of STUDENT BAZAAR?")) {
      auth.signOut();
      document.body.style.backgroundImage = 'none'; // reset background on logout
      navigate('/login');
    }
  };

  return (
    <nav className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderRadius: '0', borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/" className="navbar-brand">
          STUDENT BAZAAR
        </Link>
      </div>
      <div className="navbar-links">
        {user && <Link to="/create-listing" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sell</Link>}
        {user && <Link to="/chat" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>Chat</Link>}
        {user && <Link to="/profile" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>Profile</Link>}
        
        {user ? (
          <button onClick={handleLogout} className="btn" style={{ padding: '8px 16px', background: 'rgba(255,50,50,0.1)', color: '#ff6b6b', fontWeight: '600' }}>
            Logout
          </button>
        ) : (
          <Link to="/login" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>Login</Link>
        )}
      </div>
    </nav>
  );
}
