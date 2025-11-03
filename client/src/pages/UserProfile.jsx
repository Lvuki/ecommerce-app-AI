import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API_BASE_URL from '../config';
import { isAdmin, getToken } from '../services/authService';

export default function UserProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', surname: '', email: '', role: '', password: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);

  // fetch server-backed roles
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL.replace(/\/api\/?$/,'')}/api/roles`);
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setRoles(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const inputStyle = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' };
  const labelStyle = { fontWeight: 600, paddingTop: 6 };
  const btnPrimary = { background: '#0366d6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' };
  const btnSecondary = { background: '#f6f8fa', color: '#24292e', border: '1px solid #e1e4e8', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' };

  const validateForm = () => {
    const e = {};
    if (!form.name || !form.name.trim()) e.name = 'Name is required';
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Valid email is required';
    if (form.password && form.password.length > 0 && form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.role || !form.role.trim()) e.role = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Pure validation (no state side-effects) for use during render
  const isFormValid = () => {
    if (!form.name || !form.name.trim()) return false;
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return false;
    if (form.password && form.password.length > 0 && form.password.length < 6) return false;
    if (!form.role || !form.role.trim()) return false;
    return true;
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/users/${id}`);
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          // initialize form for admin editing
          setForm({ name: data.name || '', surname: data.surname || '', email: data.email || '', role: data.role || '', password: '' });
          setPreview(data.profileImage ? (data.profileImage.startsWith('http') ? data.profileImage : `${API_BASE_URL.replace(/\/api\/?$/,'')}${data.profileImage}`) : null);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="page-container" style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <div className="page-container" style={{ padding: 20 }}>User not found</div>;

  return (
    <div className="page-container" style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 220 }}>
          <div style={{ width: 200, height: 200, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
            {user.profileImage ? (
              <img
                src={user.profileImage.startsWith('http') ? user.profileImage : `${API_BASE_URL.replace(/\/api\/?$/,'')}${user.profileImage}`}
                alt="profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ padding: 16, color: '#666' }}>{(user.name || '').charAt(0).toUpperCase()}</div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{user.name} {user.surname || ''}</span>
            {isAdmin() && (
              <button
                title="Edit profile"
                onClick={() => setEditMode(!editMode)}
                style={{ marginLeft: 8, padding: 6, cursor: 'pointer' }}
              >
                ✏️
              </button>
            )}
          </h2>

          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '150px 1fr', rowGap: 8, columnGap: 12 }}>
            {/* Explicit important fields */}
            <div style={{ fontWeight: 600 }}>ID:</div>
            <div>{user.id}</div>

            <div style={{ fontWeight: 600 }}>Email:</div>
            <div>{user.email || '—'}</div>

            <div style={{ fontWeight: 600 }}>Role:</div>
            <div>{user.role || '—'}</div>

            <div style={{ fontWeight: 600 }}>Name:</div>
            <div>{user.name || '—'}</div>

            <div style={{ fontWeight: 600 }}>Surname:</div>
            <div>{user.surname || '—'}</div>

            <div style={{ fontWeight: 600 }}>Joined:</div>
            <div>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</div>

            <div style={{ fontWeight: 600 }}>Last updated:</div>
            <div>{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '—'}</div>

            {/* Render any additional non-sensitive fields dynamically */}
            {Object.keys(user).filter(k => !['id','name','surname','profileImage','email','role','createdAt','updatedAt','password'].includes(k)).map((key) => (
              <React.Fragment key={key}>
                <div style={{ fontWeight: 600 }}>{key}:</div>
                <div>{typeof user[key] === 'object' ? JSON.stringify(user[key]) : String(user[key] ?? '—')}</div>
              </React.Fragment>
            ))}
          </div>

          {editMode && isAdmin() && (
            <div style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 6, background: '#fafafa' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8, columnGap: 12 }}>
                <div style={labelStyle}>Name</div>
                <div>
                  <input style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} onBlur={validateForm} />
                  {errors.name && <div style={{ color: '#b00020', marginTop: 6 }}>{errors.name}</div>}
                </div>

                <div style={labelStyle}>Surname</div>
                <div><input style={inputStyle} value={form.surname} onChange={e => setForm({...form, surname: e.target.value})} /></div>

                <div style={labelStyle}>Email</div>
                <div>
                  <input style={inputStyle} value={form.email} onChange={e => setForm({...form, email: e.target.value})} onBlur={validateForm} />
                  {errors.email && <div style={{ color: '#b00020', marginTop: 6 }}>{errors.email}</div>}
                </div>

                <div style={labelStyle}>Role</div>
                <div>
                  <select style={{ ...inputStyle, height: 36 }} value={form.role} onChange={e => setForm({...form, role: e.target.value})} onBlur={validateForm}>
                    {((roles && roles.length) ? roles : ['user','admin']).map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                  {errors.role && <div style={{ color: '#b00020', marginTop: 6 }}>{errors.role}</div>}
                </div>

                <div style={labelStyle}>Password</div>
                <div>
                  <input type="password" style={inputStyle} placeholder="(leave blank to keep)" value={form.password} onChange={e => setForm({...form, password: e.target.value})} onBlur={validateForm} />
                  {errors.password && <div style={{ color: '#b00020', marginTop: 6 }}>{errors.password}</div>}
                </div>

                <div style={labelStyle}>Profile image</div>
                <div>
                  <input type="file" accept="image/*" onChange={e => {
                    const f = e.target.files && e.target.files[0];
                    setFile(f);
                    if (f) setPreview(URL.createObjectURL(f));
                  }} />
                  {preview && <div style={{ marginTop: 8, width: 120, height: 120, overflow: 'hidden', borderRadius: 6 }}><img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, pointerEvents: saving ? 'none' : 'auto' }}
                  disabled={saving || !isFormValid()}
                  onClick={async () => {
                    if (!validateForm()) return;
                    setSaving(true);
                    try {
                      const fd = new FormData();
                      fd.append('name', form.name);
                      fd.append('surname', form.surname);
                      fd.append('email', form.email);
                      if (form.password) fd.append('password', form.password);
                      if (form.role) fd.append('role', form.role);
                      if (file) fd.append('profileImage', file);

                      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
                        method: 'PUT',
                        headers: {
                          Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
                        },
                        credentials: 'include',
                        body: fd,
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setUser(updated);
                        setEditMode(false);
                        setFile(null);
                        setErrors({});
                      } else {
                        const err = await res.json();
                        alert(err.message || 'Update failed');
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Failed to update');
                    } finally {
                      setSaving(false);
                    }
                }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>

                <button style={btnSecondary} onClick={() => { setEditMode(false); setFile(null); setForm({ name: user.name || '', surname: user.surname || '', email: user.email || '', role: user.role || '', password: '' }); setPreview(user.profileImage ? (user.profileImage.startsWith('http') ? user.profileImage : `${API_BASE_URL.replace(/\/api\/?$/,'')}${user.profileImage}`) : null); setErrors({}); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
