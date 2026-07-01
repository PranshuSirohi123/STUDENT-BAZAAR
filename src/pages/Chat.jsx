import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Chat() {
  const { chatId } = useParams(); // composite ID: buyerId_sellerId
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUserEmail, setOtherUserEmail] = useState('');
  const [otherUserName, setOtherUserName] = useState('');
  
  // Profile card of the chat partner
  const [partnerProfile, setPartnerProfile] = useState(null);

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // 1. Manage auth state and set user React state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (!u) {
        navigate('/login');
      } else {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Fetch active chats for the inbox sidebar (runs when user state is loaded)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeChats = [];
      snapshot.forEach(doc => {
        activeChats.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side to prevent Firestore composite index errors
      activeChats.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      setChats(activeChats);
    }, (error) => {
      console.error("Inbox listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch messages and partner details for the selected chat room
  useEffect(() => {
    if (!chatId || !user) return;

    // Determine the other user's info for the header
    const currentChat = chats.find(c => c.id === chatId);
    if (currentChat) {
      const isBuyer = currentChat.buyerEmail === user.email;
      setOtherUserEmail(isBuyer ? currentChat.sellerEmail : currentChat.buyerEmail);
      setOtherUserName(isBuyer 
        ? (currentChat.sellerName || "Student") 
        : (currentChat.buyerName || "Student")
      );
    } else {
      setOtherUserEmail('');
      setOtherUserName('Chat Room');
    }

    // Load partner profile card in real-time
    const otherUserId = chatId.split('_').find(id => id !== user.uid);
    let unsubscribePartner = () => {};
    if (otherUserId) {
      const partnerRef = doc(db, 'users', otherUserId);
      unsubscribePartner = onSnapshot(partnerRef, (docSnap) => {
        if (docSnap.exists()) {
          setPartnerProfile(docSnap.data());
        } else {
          setPartnerProfile(null);
        }
      });
    }

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Messages listener error:", error);
    });

    return () => {
      unsubscribePartner();
      unsubscribeMessages();
    };
  }, [chatId, user, chats]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !user) return;

    const msg = newMessage;
    setNewMessage('');

    try {
      // 1. Save message to subcollection
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text: msg,
        senderId: user.uid,
        senderEmail: user.email,
        createdAt: serverTimestamp()
      });

      // 2. Update the parent chat room with last message info to update inbox order
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: msg,
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatMemberSince = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (!user) return (
    <div className="page-wrapper container" style={{ textAlign: 'center' }}>
      <h2>Loading Chat System...</h2>
    </div>
  );

  // Responsive logic
  const isMobile = window.innerWidth <= 768;
  const showSidebar = !isMobile || !chatId;
  const showChatRoom = !isMobile || !!chatId;
  const showPartnerCard = !isMobile && !!chatId && !!partnerProfile;

  return (
    <div className="page-wrapper container" style={{ paddingBottom: '0' }}>
      <div style={{ display: 'flex', height: '80vh', gap: '20px' }}>
        
        {/* Inbox Sidebar */}
        {showSidebar && (
          <div className="glass-panel" style={{ width: isMobile ? '100%' : '300px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3 style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', margin: 0 }}>Inbox</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chats.length === 0 ? (
                <p style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No active chats.</p>
              ) : (
                chats.map(chat => {
                  const isSelected = chat.id === chatId;
                  const isBuyer = chat.buyerEmail === user.email;
                  const chatPartnerName = isBuyer 
                    ? (chat.sellerName || "Student") 
                    : (chat.buyerName || "Student");
                  
                  return (
                    <div 
                      key={chat.id} 
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      style={{
                        padding: '15px 20px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary-color)' : 'transparent',
                        borderBottom: '1px solid var(--glass-border)',
                        transition: 'var(--transition)'
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chatPartnerName}
                      </strong>
                      <span style={{ fontSize: '12px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', marginTop: '4px' }}>
                        {chat.lastMessage || 'No messages yet'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Chat Room */}
        {showChatRoom && (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {chatId ? (
              <>
                <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {isMobile && (
                    <button onClick={() => navigate('/chat')} className="btn" style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', fontSize: '14px' }}>
                      ← Back
                    </button>
                  )}
                  <h3 style={{ margin: 0, fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {otherUserName}
                  </h3>
                </div>

                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {messages.map(msg => {
                    const isMe = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} style={{ 
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        background: isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                        padding: '10px 15px',
                        borderRadius: '12px',
                        maxWidth: '70%',
                        wordBreak: 'break-word'
                      }}>
                        <div>{msg.text}</div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} style={{ padding: '15px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>Send</button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
                <h2>No chat selected</h2>
                <p>Select an active conversation or contact a seller from a listing.</p>
              </div>
            )}
          </div>
        )}

        {/* Partner Profile Card (Desktop Only Sidebar) */}
        {showPartnerCard && (
          <div className="glass-panel" style={{ width: '250px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', overflowY: 'auto' }}>
            <h4 style={{ margin: 0, alignSelf: 'flex-start', borderBottom: '1px solid var(--glass-border)', width: '100%', paddingBottom: '10px' }}>
              About Seller
            </h4>
            
            {/* PFP */}
            <div style={{
              width: '100px', height: '100px', borderRadius: '50px',
              background: partnerProfile.photoURL ? `url(${partnerProfile.photoURL}) center/cover` : 'var(--primary-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', fontWeight: 'bold'
            }}>
              {!partnerProfile.photoURL && otherUserName[0].toUpperCase()}
            </div>

            {/* Details */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>{otherUserName}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  📅 <strong>Member since:</strong> 
                  <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                    {formatMemberSince(partnerProfile.createdAt)}
                  </div>
                </div>
                {partnerProfile.age && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    🎂 <strong>Age:</strong> 
                    <span style={{ color: 'var(--text-main)', marginLeft: '6px' }}>{partnerProfile.age} years old</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
