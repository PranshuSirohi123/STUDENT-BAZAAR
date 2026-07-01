import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [pfpFile, setPfpFile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  
  // Currently saved URLs in database
  const [currentPfp, setCurrentPfp] = useState('');
  const [currentBg, setCurrentBg] = useState('');
  
  // User's active listings
  const [myListings, setMyListings] = useState([]);

  // Temporary previews for selected files
  const [pfpPreview, setPfpPreview] = useState('');
  const [bgPreview, setBgPreview] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // 1. Manage auth state, load details, and load user's listings
  useEffect(() => {
    let unsubscribeListings = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setDisplayName(user.displayName || '');
        
        // Fetch profile picture, background URL, and age from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setCurrentPfp(data.photoURL || '');
          setCurrentBg(data.backgroundUrl || '');
          setAge(data.age || '');
        }

        // Listen to user's listings in real-time
        const q = query(
          collection(db, 'listings'),
          where('sellerId', '==', user.uid)
        );
        
        unsubscribeListings = onSnapshot(q, (snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          setMyListings(items);
        }, (error) => {
          console.error("Error listening to user listings:", error);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeListings();
    };
  }, [navigate]);

  // Handle local image file selections to show previews
  const handlePfpChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPfpFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPfpPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBgChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackgroundFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBgPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Compress and convert image to Base64 to bypass Firebase Storage paid plan requirement
  const compressImage = (file, maxDim = 400, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updates = {
        age: age
      };

      // 1. Profile Picture
      if (pfpFile) {
        const pfpBase64 = await compressImage(pfpFile, 150, 0.6);
        updates.photoURL = pfpBase64;
        setCurrentPfp(pfpBase64);
        setPfpPreview('');
        setPfpFile(null);
      }

      // 2. Custom Background
      if (backgroundFile) {
        const bgBase64 = await compressImage(backgroundFile, 800, 0.4);
        updates.backgroundUrl = bgBase64;
        setCurrentBg(bgBase64);
        setBgPreview('');
        setBackgroundFile(null);
        document.body.style.backgroundImage = `url(${bgBase64})`;
      }

      // Save to Firestore (includes age)
      await setDoc(userRef, updates, { merge: true });

      // 3. Update Display Name
      if (displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: displayName
        });
      }

      setMessage("Profile updated successfully!");
    } catch (error) {
      setMessage("Error updating profile: " + error.message);
    }
    setLoading(false);
  };

  // Remove options
  const handleRemovePfp = async () => {
    if (window.confirm("Are you sure you want to remove your profile picture?")) {
      setLoading(true);
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { photoURL: "" }, { merge: true });
        setCurrentPfp('');
        setPfpPreview('');
        setPfpFile(null);
        setMessage("Profile picture removed!");
      } catch (error) {
        setMessage("Error removing picture: " + error.message);
      }
      setLoading(false);
    }
  };

  const handleRemoveBg = async () => {
    if (window.confirm("Are you sure you want to remove your custom background?")) {
      setLoading(true);
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { backgroundUrl: "" }, { merge: true });
        setCurrentBg('');
        setBgPreview('');
        setBackgroundFile(null);
        document.body.style.backgroundImage = 'none';
        setMessage("Custom background removed!");
      } catch (error) {
        setMessage("Error removing background: " + error.message);
      }
      setLoading(false);
    }
  };

  // Delete a listing directly from the Profile list
  const handleDeleteListing = async (listingId) => {
    if (window.confirm("Are you sure you want to delete this listing from STUDENT BAZAAR?")) {
      try {
        await deleteDoc(doc(db, 'listings', listingId));
        setMessage("Listing deleted successfully!");
      } catch (error) {
        setMessage("Error deleting listing: " + error.message);
      }
    }
  };

  const handleLogout = () => {
    auth.signOut();
    document.body.style.backgroundImage = 'none';
    navigate('/login');
  };

  if (!auth.currentUser) return null;

  return (
    <div className="page-wrapper container">
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 900 ? '1fr 1fr' : '1fr', gap: '30px' }}>
        
        {/* Left Side: Profile Edit Form */}
        <div className="glass-panel" style={{ padding: '30px', height: 'fit-content' }}>
          
          {/* Profile Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '40px',
              background: currentPfp ? `url(${currentPfp}) center/cover` : 'var(--primary-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '30px', fontWeight: 'bold'
            }}>
              {!currentPfp && (displayName ? displayName[0].toUpperCase() : 'S')}
            </div>
            <div>
              <h2 style={{ marginBottom: '5px' }}>{auth.currentUser.displayName || "Student"}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{auth.currentUser.email}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3>Edit Profile Settings</h3>
            
            {/* Display Name */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Public Display Name</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="E.g. John Doe" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Age */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Age</label>
              <input 
                type="number" 
                className="glass-input" 
                placeholder="E.g. 21" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            {/* Profile Picture */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>Profile Picture</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '30px',
                  background: `url(${pfpPreview || currentPfp || ''}) center/cover`,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  display: (pfpPreview || currentPfp) ? 'block' : 'none'
                }}></div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(currentPfp || pfpPreview) && (
                    <button type="button" onClick={handleRemovePfp} className="btn" style={{ padding: '6px 12px', background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', fontSize: '12px' }}>
                      Remove Picture
                    </button>
                  )}
                  {pfpPreview && (
                    <button type="button" onClick={() => { setPfpFile(null); setPfpPreview(''); }} className="btn" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', fontSize: '12px' }}>
                      Cancel Swap
                    </button>
                  )}
                </div>
              </div>
              
              <input 
                type="file" 
                className="glass-input" 
                accept="image/*"
                onChange={handlePfpChange}
              />
            </div>

            {/* Custom Background */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>Custom App Background</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                {bgPreview && (
                  <div style={{
                    width: '100px', height: '60px', borderRadius: '6px',
                    background: `url(${bgPreview}) center/cover`,
                  }}></div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(currentBg || bgPreview) && (
                    <button type="button" onClick={handleRemoveBg} className="btn" style={{ padding: '6px 12px', background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', fontSize: '12px' }}>
                      Remove Background
                    </button>
                  )}
                  {bgPreview && (
                    <button type="button" onClick={() => { setBackgroundFile(null); setBgPreview(''); }} className="btn" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', fontSize: '12px' }}>
                      Cancel Swap
                    </button>
                  )}
                </div>
              </div>

              <input 
                type="file" 
                className="glass-input" 
                accept="image/*"
                onChange={handleBgChange}
              />
            </div>

            <button type="submit" className="btn btn-secondary" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
            {message && <p style={{ marginTop: '10px', color: 'var(--secondary-color)', fontSize: '14px' }}>{message}</p>}
          </form>

          <button onClick={handleLogout} className="btn" style={{ background: 'rgba(255,50,50,0.2)', color: '#ff6b6b', width: '100%' }}>
            Log Out
          </button>
        </div>

        {/* Right Side: My Listings Dashboard */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', height: '80vh', overflow: 'hidden' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            My Active Listings ({myListings.length})
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {myListings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                You haven't posted any items yet.
              </p>
            ) : (
              myListings.map(item => (
                <div 
                  key={item.id} 
                  style={{
                    display: 'flex', gap: '15px', alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)', padding: '12px',
                    borderRadius: '8px', border: '1px solid var(--glass-border)'
                  }}
                >
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '6px',
                    background: `url(${item.imageUrl}) center/cover no-repeat`,
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  }}></div>
                  
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </h4>
                    <span style={{ color: 'var(--secondary-color)', fontSize: '14px', fontWeight: 'bold' }}>
                      ₹{item.price}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => navigate(`/listing/${item.id}`)}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleDeleteListing(item.id)}
                      className="btn"
                      style={{ padding: '6px 12px', background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
