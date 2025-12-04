import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getTokenPayload } from "../services/authService";
import API_BASE_URL from '../config';
import '../styles/auth.css';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const navigate = useNavigate();

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // register fields
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [file, setFile] = useState(null);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [message, setMessage] = useState('');

  const apiRoot = API_BASE_URL.replace(/\/api\/?$/, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await login(email, password);
      if (res && res.token) {
        const payload = getTokenPayload();
        if (payload && payload.role === 'admin') navigate('/admin');
        else navigate('/dashboard');
      } else {
        setError(res?.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Login failed");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('surname', surname);
      fd.append('email', regEmail);
      fd.append('password', regPassword);
      if (file) fd.append('profileImage', file);

      const res = await fetch(`${API_BASE_URL.replace(/\/api\/?$/, '')}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        const payload = getTokenPayload();
        if (payload && payload.role === 'admin') navigate('/admin');
        else navigate('/dashboard');
      } else {
        setMessage(data.message || 'Registered');
      }
    } catch (err) {
      console.error(err);
      setMessage('Registration failed');
    }
  };

  const startGoogle = () => {
    window.location.href = `${apiRoot}/auth/google`;
  };

  const startFacebook = () => {
    window.location.href = `${apiRoot}/auth/facebook`;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-sub">Please enter your details to sign in.</p>

        <div className="social-row">
          <button type="button" className="social-btn google" onClick={startGoogle} aria-label="Continue with Google">
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.9 0 7.1 1.4 9.4 3.3l7-7C35.6 2.6 30.2 0 24 0 14 0 5.6 5.4 2 13.1l8.2 6.4C12.9 14.1 18 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.6H24v9.1h12.7c-.6 3.3-2.5 6.1-5.4 8l8.5 6.6C44.6 38.2 46.5 31.8 46.5 24.5z"/>
              <path fill="#FBBC05" d="M10.2 29.5c-1.1-3.3-1.1-6.9 0-10.2L2 13.1C-.9 18.3-.9 25.6 2 30.9l8.2-1.4z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.6-2 15.5-5.5l-8.5-6.6c-2.4 1.6-5.5 2.6-8.9 2.6-6 0-11.1-4.6-12.8-10.8L2 34.9C5.6 42.6 14 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            <span className="social-label">Continue with Google</span>
          </button>
          <button type="button" className="social-btn facebook" onClick={startFacebook} aria-label="Continue with Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.019 10.125 11.877v-8.385H7.078v-3.492h3.047V9.413c0-3.016 1.792-4.684 4.533-4.684 1.313 0 2.686.235 2.686.235v2.953h-1.513c-1.492 0-1.954.927-1.954 1.879v2.25h3.328l-.532 3.492h-2.796v8.385C19.612 23.092 24 18.098 24 12.073z"/>
            </svg>
            <span className="social-label">Continue with Facebook</span>
          </button>
        </div>

        <div className="or-sep"><span>OR</span></div>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <input className="auth-input" placeholder="Enter your email..." value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="password-row">
              <input className="auth-input" placeholder="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>

            <div className="auth-helpers">
              <label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
              <a className="forgot" href="/forgot">Forgot password?</a>
            </div>

            <button type="submit" className="auth-submit">Sign in</button>
            {error ? <p className="auth-error">{error}</p> : null}
            <div className="auth-footer">Don't have an account yet? <button type="button" className="link-btn" onClick={() => setMode('register')}>Sign Up</button></div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="auth-input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <input className="auth-input" placeholder="Surname" value={surname} onChange={e => setSurname(e.target.value)} />
            </div>
            <input className="auth-input" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            <input className="auth-input" placeholder="Password" type={showPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} />
            <label className="file-label">Profile picture (optional)
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
            <button type="submit" className="auth-submit">Create account</button>
            <div className="auth-footer">Already have an account? <button type="button" className="link-btn" onClick={() => setMode('login')}>Sign in</button></div>
            <p className="auth-message">{message}</p>
          </form>
        )}
      </div>
    </div>
  );
}
