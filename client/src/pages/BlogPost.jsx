import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPostById } from '../services/blogService';
import { addItem } from '../services/cartService';

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPostById(id).then(p => {
      if (p?.error) setError(p.error);
      else setPost(p);
    }).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>{error}</div>;
  if (!post) return null;

  return (
    <div className="page-container" style={{ padding: 12 }}>
      {post.image ? <img src={post.image} alt={post.title} style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 8 }} /> : null}
      <h1>{post.title}</h1>
      <div style={{ color: '#666' }}>{post.category} • {new Date(post.createdAt).toLocaleDateString()}</div>
      <p style={{ marginTop: 12 }}>{post.content}</p>
    </div>
  );
}
