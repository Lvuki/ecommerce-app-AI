// client/src/pages/AdminUsers.js
import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import axios from "axios";

// Helper to get JWT token from localStorage
const getToken = () => localStorage.getItem("token");

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState({ name: "", surname: "", email: "", password: "", role: "user" });
  const [file, setFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", surname: "", email: "", role: "user", password: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [roleEditIndex, setRoleEditIndex] = useState(-1);
  const [roleEditValue, setRoleEditValue] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  const API_URL = "http://localhost:4000/api/users";
  const token = getToken();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        setError("No token found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
  setUsers(res.data);
        // fetch server roles
        try {
          const rolesRes = await axios.get('http://localhost:4000/api/roles');
          let serverRoles = rolesRes.data || [];
          // ensure any roles present on users are added to server
          const unique = Array.from(new Set((res.data || []).map(u => u.role || 'user')));
          for (const r of unique) {
            if (!serverRoles.includes(r)) {
              try {
                await axios.post('http://localhost:4000/api/roles', { name: r }, { headers: { Authorization: `Bearer ${token}` } });
              } catch (_) {}
            }
          }
          // re-fetch roles after potential adds
          const rolesRefetch = await axios.get('http://localhost:4000/api/roles');
          serverRoles = rolesRefetch.data || [];
          setRoles(serverRoles);
        } catch (err) {
          // fallback to roles derived from users
          const unique = Array.from(new Set((res.data || []).map(u => u.role || 'user')));
          setRoles(unique.length ? unique : ['user','admin']);
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          setError("Unauthorized. Please log in as admin.");
        } else {
          setError("Failed to fetch users");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  // keep roles in sync when users change elsewhere
  useEffect(() => {
    // keep server roles in sync locally (if users changed elsewhere, ensure server has those roles)
    const syncRoles = async () => {
      try {
        const rolesRes = await axios.get('http://localhost:4000/api/roles');
        const serverRoles = rolesRes.data || [];
        const fromUsers = Array.from(new Set((users || []).map(u => u.role || 'user')));
        for (const r of fromUsers) {
          if (!serverRoles.includes(r)) {
            try { await axios.post('http://localhost:4000/api/roles', { name: r }, { headers: { Authorization: `Bearer ${token}` } }); } catch (_) {}
          }
        }
        const refetch = await axios.get('http://localhost:4000/api/roles');
        setRoles(refetch.data || []);
      } catch (e) {
        // ignore
      }
    };
    syncRoles();
  }, [users]);

  // persist roles to localStorage so added roles survive refetches/reloads
  // roles are now server-backed; no localStorage persistence here

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('name', newUser.name);
      fd.append('surname', newUser.surname || '');
      fd.append('email', newUser.email);
      fd.append('password', newUser.password);
      fd.append('role', newUser.role || 'user');
      if (file) fd.append('profileImage', file);

      const res = await axios.post(
        API_URL,
        fd,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers([...users, res.data]);
      setNewUser({ name: "", surname: "", email: "", password: "", role: "user" });
      setFile(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Error creating user");
    }
  };

  const startEdit = (user) => {
    setEditId(user.id);
    setEditForm({ name: user.name || '', surname: user.surname || '', email: user.email || '', role: user.role || 'user', password: "" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ name: "", surname: "", email: "", role: "user", password: "" });
  };

  const saveEdit = async (id) => {
    try {
      const payload = { name: editForm.name, surname: editForm.surname, email: editForm.email, role: editForm.role };
      if (editForm.password) payload.password = editForm.password;
      const res = await axios.put(
        `${API_URL}/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => (u.id === id ? res.data : u)));
      cancelEdit();
    } catch (err) {
      alert(err?.response?.data?.message || "Error saving user");
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await axios.put(
        `${API_URL}/${id}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(
        users.map((user) =>
          user.id === id ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      alert("Error updating role");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((user) => user.id !== id));
    } catch (err) {
      alert("Error deleting user");
    }
  };

  if (loading) return <p className="text-center mt-10">Loading users...</p>;
  if (error) return <p className="text-red-500 text-center mt-10">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 className="text-2xl font-bold">User Management</h1>
        <div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded">Add User</button>
          <button onClick={() => setShowRolesModal(true)} style={{ marginLeft: 8 }} className="bg-gray-200 px-3 py-1 rounded">Manage Roles</button>
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: '90%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', background: '#fff', borderRadius: 8, padding: 18, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', position: 'relative' }}>
            {/* sticky header so close button stays visible */}
            <div style={{ position: 'sticky', top: 0, background: '#fff', paddingBottom: 12, marginBottom: 12, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Add User</h3>
              <button aria-label="Close modal" onClick={() => { setShowAddModal(false); setNewUser({ name: '', surname: '', email: '', password: '', role: 'user' }); setFile(null); }}
                style={{ width: 32, height: 32, borderRadius: 16, border: '1px solid #ddd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                ×
              </button>
            </div>
            <form onSubmit={async (e) => { await handleAddUser(e); setShowAddModal(false); }} style={{ display: 'grid', gap: 8 }}>
              <input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="border px-2 py-1" />
              <input placeholder="Surname" value={newUser.surname} onChange={(e) => setNewUser({ ...newUser, surname: e.target.value })} className="border px-2 py-1" />
              <input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="border px-2 py-1" />
              <input placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="border px-2 py-1" />
              <label style={{ fontSize: 13 }}>
                Profile picture (optional)
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="border px-2 py-1">
                {((roles && roles.length) ? roles : ['user','admin']).map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Create</button>
                <button type="button" onClick={() => { setShowAddModal(false); setNewUser({ name: '', surname: '', email: '', password: '', role: 'user' }); }} className="bg-gray-400 text-white px-3 py-1 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Roles management modal */}
      {showRolesModal ? (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 80 }}>
          <div style={{ width: '92%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', background: '#fff', padding: 18, borderRadius: 8, position: 'relative' }}>
            {/* sticky header so close button stays visible */}
            <div style={{ position: 'sticky', top: 0, background: '#fff', paddingBottom: 12, marginBottom: 12, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Manage Roles</h3>
              <button aria-label="Close modal" onClick={() => { setShowRolesModal(false); setRoleEditIndex(-1); setRoleEditValue(''); setNewRoleName(''); }}
                style={{ width: 32, height: 32, borderRadius: 16, border: '1px solid #ddd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                <h4 style={{ marginTop: 0 }}>Existing Roles</h4>
                {roles.length === 0 ? <div style={{ color: '#666' }}>No roles found.</div> : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {roles.map((r, idx) => (
                      <div key={r} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 6, padding: 8, background: '#fafafa' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {roleEditIndex === idx ? (
                            <input value={roleEditValue} onChange={(e) => setRoleEditValue(e.target.value)} className="border px-2 py-1" />
                          ) : (
                            <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{r}</div>
                          )}
                          <div style={{ color: '#666' }}>
                            {users.filter(u => (u.role || 'user') === r).length} users
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {roleEditIndex === idx ? (
                            <>
                              <button onClick={async () => {
                                const old = roles[idx];
                                const renamed = roleEditValue.trim();
                                if (!renamed) return alert('Role name cannot be empty');
                                // update all users who have the old role
                                const affected = users.filter(u => (u.role || 'user') === old);
                                for (const a of affected) {
                                  try { await handleRoleChange(a.id, renamed); } catch (err) { console.error(err); }
                                }
                                // update server roles
                                try {
                                  const resp = await axios.put(`http://localhost:4000/api/roles/${encodeURIComponent(old)}`, { name: renamed }, { headers: { Authorization: `Bearer ${token}` } });
                                  setRoles(resp.data || []);
                                } catch (err) {
                                  console.error('Failed to rename role on server', err);
                                  // fallback: update locally
                                  setRoles((prev) => (prev || []).map(r => (r === old ? renamed : r)));
                                }
                                setUsers(users.map(u => (u.role === old ? { ...u, role: renamed } : u)));
                                setRoleEditIndex(-1);
                                setRoleEditValue('');
                              }}>Save</button>
                              <button onClick={() => { setRoleEditIndex(-1); setRoleEditValue(''); }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setRoleEditIndex(idx); setRoleEditValue(r); }}>Edit</button>
                              <button onClick={async () => {
                                if (!window.confirm(`Delete role "${r}" and set affected users to 'user'?`)) return;
                                const affected = users.filter(u => (u.role || 'user') === r);
                                for (const a of affected) {
                                  try { await handleRoleChange(a.id, 'user'); } catch (err) { console.error(err); }
                                }
                                try {
                                  const resp = await axios.delete(`http://localhost:4000/api/roles/${encodeURIComponent(r)}`, { headers: { Authorization: `Bearer ${token}` } });
                                  setRoles(resp.data || []);
                                } catch (err) {
                                  console.error('Failed to delete role on server', err);
                                  setRoles(roles.filter(role => role !== r));
                                }
                                setUsers(users.map(u => ((u.role || 'user') === r ? { ...u, role: 'user' } : u)));
                              }} style={{ color: 'red' }}>Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ border: '1px dashed #ddd', padding: 12, borderRadius: 8 }}>
                <h4 style={{ marginTop: 0 }}>Add Role</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="Role name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="border px-2 py-1" />
                  <button onClick={async () => {
                    const name = newRoleName.trim();
                    if (!name) return alert('Role name cannot be empty');
                    if (roles.includes(name)) return alert('Role already exists');
                    try {
                      const resp = await axios.post('http://localhost:4000/api/roles', { name }, { headers: { Authorization: `Bearer ${token}` } });
                      setRoles(resp.data || []);
                      setNewRoleName('');
                    } catch (err) {
                      alert(err?.response?.data?.message || 'Failed to add role');
                    }
                  }} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
                </div>
                <div style={{ marginTop: 8, color: '#666', fontSize: 13 }}>Adding a role makes it available to assign when editing users. Deleting a role will set affected users to 'user'.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
  <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {users.map((user) => (
          <div key={user.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
                {user.profileImage ? (
                  <Link to={`/users/${user.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                    <img src={user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:4000${user.profileImage}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Link>
                ) : (
                  <Link to={`/users/${user.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textDecoration: 'none' }}>
                    <div style={{ padding: 12, color: '#666', fontWeight: 700 }}>{(user.name || '').charAt(0) || '?'}</div>
                  </Link>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>
                  <Link to={`/users/${user.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{user.name} {user.surname ? user.surname : ''}</Link>
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>{user.email}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
                  Role: <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{user.role}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => startEdit(user)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Edit</button>
              <button onClick={() => handleDelete(user.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
            </div>
            {editId === user.id ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="border px-2 py-1" />
                  <input value={editForm.surname} onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })} className="border px-2 py-1" />
                  <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="border px-2 py-1" />
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="border px-2 py-1">
                    {((roles && roles.length) ? roles : ['user','admin']).map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                  <input placeholder="New password (optional)" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="border px-2 py-1" />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => saveEdit(user.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Save</button>
                    <button onClick={cancelEdit} className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500">Cancel</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers
