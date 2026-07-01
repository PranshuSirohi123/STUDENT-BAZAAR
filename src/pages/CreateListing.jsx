import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function CreateListing() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Compress and convert image to Base64 to bypass Firebase Storage paid plan requirement
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 500; // Limit image dimensions to 500px
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
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress quality to 60%
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      alert("You must be logged in to post an item.");
      return;
    }

    if (!image) {
      alert("Please upload an image.");
      return;
    }

    setLoading(true);
    
    try {
      // Convert and compress image to base64 string
      const base64Image = await compressImage(image);

      // 2. Save Listing Data directly in Firestore (no Firebase Storage needed!)
      await addDoc(collection(db, 'listings'), {
        title,
        description,
        price: parseFloat(price),
        category,
        imageUrl: base64Image, // Save compressed base64 directly
        sellerId: auth.currentUser.uid,
        sellerName: auth.currentUser.displayName || "Student",
        sellerEmail: auth.currentUser.email,
        createdAt: serverTimestamp()
      });

      alert("Listing posted successfully!");
      navigate('/');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to post listing: " + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="page-wrapper container">
      <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '20px' }}>Post a new item for sale</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Item Title</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="What are you selling?" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Declared Selling Price ($)</label>
            <input 
              type="number" 
              className="glass-input" 
              placeholder="0.00" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Category</label>
            <select 
              className="glass-input" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ background: 'rgba(30, 41, 59, 0.9)' }}
            >
              <option value="Electronics">Electronics</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Property">Property</option>
              <option value="Furniture">Furniture</option>
              <option value="Fashion">Fashion</option>
              <option value="Services">Services</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea 
              className="glass-input" 
              placeholder="Describe your item in detail..." 
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Upload Image</label>
            <input 
              type="file" 
              className="glass-input" 
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
            {loading ? 'Posting...' : 'Post Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
