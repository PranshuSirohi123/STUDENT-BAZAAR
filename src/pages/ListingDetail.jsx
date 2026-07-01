import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setListing({ id: docSnap.id, ...docSnap.data() });
        } else {
          alert("Listing not found!");
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
      }
      setLoading(false);
    };
    fetchListing();
  }, [id, navigate]);

  const handleContact = async () => {
    if (!auth.currentUser) {
      alert("Please login to contact the seller.");
      navigate('/login');
      return;
    }
    
    // Generate private composite chat ID
    const chatRoomId = [auth.currentUser.uid, listing.sellerId].sort().join('_');

    try {
      // Create/Update parent chat document to trigger inbox sidebar lists
      await setDoc(doc(db, 'chats', chatRoomId), {
        id: chatRoomId,
        participants: [auth.currentUser.uid, listing.sellerId],
        buyerEmail: auth.currentUser.email,
        buyerName: auth.currentUser.displayName || "Student",
        sellerEmail: listing.sellerEmail,
        sellerName: listing.sellerName || "Student",
        updatedAt: serverTimestamp()
      }, { merge: true });

      navigate(`/chat/${chatRoomId}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Could not start chat: " + error.message);
    }
  };

  const handleZoomToggle = () => {
    setIsZoomed(!isZoomed);
    setZoomScale(1); // reset scale on close/open
  };

  const increaseZoom = (e) => {
    e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.5, 3));
  };

  const decreaseZoom = (e) => {
    e.stopPropagation();
    setZoomScale(prev => Math.max(prev - 0.5, 1));
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this listing from STUDENT BAZAAR?")) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'listings', id));
        alert("Listing deleted successfully!");
        navigate('/');
      } catch (error) {
        console.error("Error deleting listing:", error);
        alert("Failed to delete listing: " + error.message);
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper container" style={{ textAlign: 'center' }}>
        <h2>Loading listing details...</h2>
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="page-wrapper container">
      <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.1)' }}>
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'window.innerWidth > 768 ? "1fr 1fr" : "1fr"', gap: '30px', alignItems: 'start' }} className="detail-grid">
        
        {/* Left Side: Interactive Image */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'center', cursor: 'zoom-in' }} onClick={handleZoomToggle}>
          <img 
            src={listing.imageUrl} 
            alt={listing.title} 
            style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }}
          />
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px', width: '100%' }}>
            🔍 Click image to zoom in
          </p>
        </div>

        {/* Right Side: Details */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span style={{ background: 'var(--primary-color)', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: '600' }}>
              {listing.category}
            </span>
            <h1 style={{ marginTop: '15px', fontSize: '32px' }}>{listing.title}</h1>
            <p style={{ color: 'var(--secondary-color)', fontSize: '28px', fontWeight: 'bold' }}>
              ${listing.price}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <h3>Description</h3>
            <p style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {listing.description}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Listed by: <strong>{listing.sellerName || "Student"}</strong>
            </p>
            {auth.currentUser && auth.currentUser.uid === listing.sellerId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <div style={{ 
                  padding: '10px', 
                  background: 'rgba(255,255,255,0.05)', borderRadius: '8px', 
                  textAlign: 'center', color: 'var(--text-muted)' 
                }}>
                  This is your own listing
                </div>
                <button 
                  onClick={handleDelete} 
                  className="btn" 
                  style={{ background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', fontWeight: '600' }}
                >
                  Delete Listing
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={handleContact} style={{ width: '100%', marginTop: '10px' }}>
                Message Seller
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Lightbox / Zoom Overlay */}
      {isZoomed && (
        <div 
          onClick={handleZoomToggle}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out'
          }}
        >
          {/* Zoom Controls */}
          <div style={{ position: 'absolute', top: '20px', display: 'flex', gap: '10px', zIndex: 10000 }}>
            <button className="btn btn-primary" onClick={increaseZoom} style={{ padding: '8px 15px' }}>Zoom +</button>
            <button className="btn btn-primary" onClick={decreaseZoom} style={{ padding: '8px 15px' }}>Zoom -</button>
            <button className="btn" onClick={handleZoomToggle} style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.1)' }}>Close</button>
          </div>

          {/* Interactive Image Container */}
          <div style={{ overflow: 'auto', maxWidth: '90%', maxHeight: '90%' }}>
            <img 
              src={listing.imageUrl} 
              alt={listing.title} 
              style={{
                transform: `scale(${zoomScale})`,
                transition: 'transform 0.2s ease-in-out',
                maxHeight: '80vh',
                maxWidth: '80vw',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
