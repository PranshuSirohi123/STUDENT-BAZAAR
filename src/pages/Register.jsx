import React from 'react';

export default function Register() {
  return (
    <div className="page-wrapper container" style={{ maxWidth: '400px', alignSelf: 'center', margin: 'auto' }}>
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2>Register</h2>
        <input type="text" className="glass-input" placeholder="Full Name" style={{ marginBottom: '15px' }} />
        <input type="email" className="glass-input" placeholder="Email" style={{ marginBottom: '15px' }} />
        <button className="btn btn-primary" style={{ width: '100%' }}>Send OTP</button>
      </div>
    </div>
  );
}
