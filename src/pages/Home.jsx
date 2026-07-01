import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

const CATEGORIES = [
  "All", "Electronics", "Vehicles", "Property", "Furniture", "Fashion", "Services"
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [listings, setListings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all listings without orderBy to avoid index errors
    const q = query(collection(db, 'listings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side by createdAt safely
      items.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setListings(items);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleContact = (sellerId) => {
    if (!auth.currentUser) {
      alert("Please login to contact the seller.");
      navigate('/login');
      return;
    }
    // Simple navigation to chat, passing the sellerId
    navigate(`/chat/${sellerId}`);
  };

  const filteredListings = listings.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.title?.toLowerCase().includes(search.toLowerCase()) || 
                          item.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="page-wrapper container">
      
      {/* Search & Filter Section */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px' }}>
        <input 
          type="text" 
          className="glass-input" 
          placeholder="Search for items, brands, or keywords..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: '18px', padding: '15px' }}
        />
        
        {/* Categories under search bar */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : ''}`}
              style={{ 
                background: selectedCategory === cat ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', 
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                whiteSpace: 'nowrap',
                padding: '8px 16px',
                borderRadius: '20px'
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Feed */}
      <h2 style={{ marginBottom: '20px' }}>{selectedCategory === "All" ? "Latest Listings" : selectedCategory}</h2>
      
      {filteredListings.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No items found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {filteredListings.map(item => (
            <div 
              key={item.id} 
              className="glass-panel" 
              style={{ padding: '15px', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => navigate(`/listing/${item.id}`)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ 
                height: '200px', 
                background: `url(${item.imageUrl}) center/cover no-repeat`, 
                borderRadius: '8px', 
                marginBottom: '15px',
                backgroundColor: 'rgba(255,255,255,0.05)'
              }}></div>
              <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>{item.title}</h3>
              <p style={{ color: 'var(--secondary-color)', fontWeight: 'bold', fontSize: '20px', marginBottom: '10px' }}>${item.price}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {item.description}
              </p>
              
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '15px' }}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
