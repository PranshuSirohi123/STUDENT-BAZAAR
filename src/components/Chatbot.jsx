import React, { useState } from 'react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm the Student Bazaar Support Bot. How can I help you?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      let reply = "I'm sorry, I don't understand.";
      const lower = userMsg.toLowerCase();
      if (lower.includes('post') || lower.includes('sell')) {
        reply = "To post an item, click the 'Sell' button in the navigation bar. You can upload an image and declare your selling price!";
      } else if (lower.includes('background') || lower.includes('theme')) {
        reply = "You can customize your app background by going to the Profile page and uploading an image.";
      } else if (lower.includes('hello') || lower.includes('hi')) {
        reply = "Hello there! Need help navigating the app?";
      } else {
        reply = "Thanks for asking! As a simple bot, I only know about posting items and changing backgrounds right now.";
      }
      setMessages(prev => [...prev, { text: reply, sender: 'bot' }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px',
          width: '60px', height: '60px', borderRadius: '30px',
          background: 'var(--primary-color)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000, fontSize: '24px'
        }}
      >
        💬
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="glass-panel" style={{
          position: 'fixed', bottom: '90px', right: '20px',
          width: '300px', height: '400px', zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(30, 41, 59, 0.95)'
        }}>
          <div style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', fontWeight: 'bold' }}>
            App Support
          </div>
          
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                background: msg.sender === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                padding: '8px 12px', borderRadius: '8px', fontSize: '14px', maxWidth: '80%'
              }}>
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} style={{ padding: '10px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '5px' }}>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Ask a question..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ padding: '8px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>&gt;</button>
          </form>
        </div>
      )}
    </>
  );
}
