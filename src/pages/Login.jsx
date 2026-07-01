import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect to home if already logged in on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // 1. Create user with Email & Password
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. Set public display name in Firebase Auth profile
        await updateProfile(result.user, {
          displayName: displayName || "Student"
        });

        // 3. Initialize user document in Firestore
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, {
          email: result.user.email,
          createdAt: serverTimestamp(),
          photoURL: '',
          backgroundUrl: '',
          age: ''
        });

        setMessage("Account created successfully!");
        navigate('/');
      } else {
        // Log in user with Email & Password
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      }
    } catch (error) {
      console.error("Auth error:", error);
      let errorMsg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "This email is already registered. Please log in instead.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMsg = "Incorrect email or password. Please try again.";
      } else if (error.code === 'auth/weak-password') {
        errorMsg = "Password should be at least 6 characters long.";
      }
      setMessage("Error: " + errorMsg);
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper container" style={{ maxWidth: '400px', alignSelf: 'center', margin: 'auto' }}>
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2>{isSignUp ? 'Create Account' : 'Log In'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          {isSignUp ? 'Sign up to sell items and chat with other students.' : 'Log in to access your profile and chats.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Full Name</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="E.g. John Doe" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Email Address</label>
            <input 
              type="email" 
              className="glass-input" 
              placeholder="E.g. student@university.edu" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Password</label>
            <input 
              type="password" 
              className="glass-input" 
              placeholder="Min 6 characters" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        {message && <p style={{ marginTop: '15px', color: 'var(--secondary-color)', fontSize: '14px' }}>{message}</p>}

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px', textAlign: 'center', fontSize: '14px' }}>
          {isSignUp ? (
            <p style={{ margin: 0 }}>
              Already have an account?{' '}
              <span 
                style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => { setIsSignUp(false); setMessage(''); }}
              >
                Log In
              </span>
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Don't have an account?{' '}
              <span 
                style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => { setIsSignUp(true); setMessage(''); }}
              >
                Sign Up
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
