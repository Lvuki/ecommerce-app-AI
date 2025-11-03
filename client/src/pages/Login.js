import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getTokenPayload } from "../services/authService";
import API_BASE_URL from '../config';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const navigate = useNavigate();

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <div style={{ maxWidth: "520px", margin: "24px auto", padding: "20px" }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode('login')} style={{ flex: 1, padding: 8, background: mode==='login' ? '#ddd' : '#fff' }}>Login</button>
        <button onClick={() => setMode('register')} style={{ flex: 1, padding: 8, background: mode==='register' ? '#ddd' : '#fff' }}>Register</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startGoogle} style={{ flex: 1 }}>Continue with Google</button>
          <button onClick={startFacebook} style={{ flex: 1 }}>Continue with Facebook</button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Sign in</button>
            {error ? <p style={{ color: 'red' }}>{error}</p> : null}
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input placeholder="Surname" value={surname} onChange={e => setSurname(e.target.value)} />
            <input placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            <input placeholder="Password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
            <label style={{ display: 'block' }}>
              Profile picture (optional)
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
            <button type="submit">Register</button>
            <p>{message}</p>
          </form>
        )}
      </div>
    </div>
  );
}
