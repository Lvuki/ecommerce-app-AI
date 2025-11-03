import { useState } from 'react';

export default function Register() {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('surname', surname);
      fd.append('email', email);
      fd.append('password', password);
      if (file) fd.append('profileImage', file);

      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (data.token) localStorage.setItem('token', data.token);
      setMessage(data.message || 'Registered');
    } catch (err) {
      console.error(err);
      setMessage('Registration failed');
    }
  };

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Surname" value={surname} onChange={e => setSurname(e.target.value)} />
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <label style={{ display: 'block', marginTop: 8 }}>
          Profile picture (optional)
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <button type="submit">Register</button>
      </form>
      <p>{message}</p>
    </div>
  );
}
