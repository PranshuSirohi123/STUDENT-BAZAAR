import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // This effect runs when the page loads. It checks if the URL contains a sign-in link.
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let savedEmail = window.localStorage.getItem('emailForSignIn');
      
      if (!savedEmail) {
        // If the user opened the link on a different device or browser, we need them to re-enter their email
        savedEmail = window.prompt('Please confirm your email to complete sign-in:');
      }
      
      if (savedEmail) {
        setLoading(true);
        setMessage('Verifying your login link...');
        
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then(async (result) => {
            // Clear email from storage.
            window.localStorage.removeItem('emailForSignIn');
            
            // Initialize user doc in Firestore if it doesn't exist
            const userRef = doc(db, 'users', result.user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                email: result.user.email,
                createdAt: serverTimestamp(),
                photoURL: '',
                backgroundUrl: '',
                age: ''
              });
            }

            // Redirect to home page
            navigate('/');
          })
          .catch((error) => {
            setLoading(false);
            setMessage('Error signing in with link: ' + error.message);
          });
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const actionCodeSettings = {
      // URL you want to redirect back to.
      url: window.location.origin + '/login',
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMessage('A sign-in link has been sent to your email! Please check your inbox and click the link.');
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper container" style={{ maxWidth: '400px', alignSelf: 'center', margin: 'auto' }}>
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2>Login / Register</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          We use passwordless authentication. Enter your email and we'll send you a login link.
        </p>
        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            className="glass-input" 
            placeholder="Enter your email" 
            style={{ marginBottom: '15px' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : 'Send Magic Link'}
          </button>
        </form>
        {message && <p style={{ marginTop: '15px', color: 'var(--secondary-color)', fontSize: '14px' }}>{message}</p>}
      </div>
    </div>
  );
}
