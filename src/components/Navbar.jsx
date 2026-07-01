import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [pfpUrl, setPfpUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribePfp = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        // Listen to the user's Firestore profile doc in real-time to get the PFP
        const userRef = doc(db, 'users', u.uid);
        unsubscribePfp = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().photoURL) {
            setPfpUrl(docSnap.data().photoURL);
          } else {
            setPfpUrl('');
          }
        }, (error) => {
          console.error("Navbar profile listener error:", error);
        });
      } else {
        setPfpUrl('');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribePfp();
    };
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
        
        {/* Render Profile Picture instead of the word "Profile" */}
        {user && (
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            {pfpUrl ? (
              <img 
                src={pfpUrl} 
                alt="Profile" 
                style={{ 
                  width: '35px', 
                  height: '35px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '2px solid var(--primary-color)',
                  boxShadow: '0 0 5px rgba(79, 70, 229, 0.4)'
                }} 
              />
            ) : (
              <div style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                background: 'var(--primary-color)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '2px solid var(--primary-color)',
                boxShadow: '0 0 5px rgba(79, 70, 229, 0.4)'
              }}>
                {user.displayName ? user.displayName[0].toUpperCase() : 'S'}
              </div>
            )}
          </Link>
        )}
        
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
