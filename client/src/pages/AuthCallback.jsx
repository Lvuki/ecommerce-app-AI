import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setToken, getTokenPayload } from '../services/authService';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const error = params.get('error');
    if (error) {
      // send to login with error
      navigate('/login');
      return;
    }
    if (token) {
      try {
        // store token (both cookie also set by server)
        localStorage.setItem('token', token);
        setToken(token);
        const payload = getTokenPayload();
        if (payload && payload.role === 'admin') navigate('/admin');
        else navigate('/dashboard');
      } catch (err) {
        console.error('Auth callback store failed', err);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [search, navigate]);

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
      <h3>Signing you in…</h3>
      <p>If you are not redirected automatically, <a href="/login">return to login</a>.</p>
    </div>
  );
}
