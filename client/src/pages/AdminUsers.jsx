// client/src/pages/AdminUsers.js
import React, { useEffect, useState } from "react";
import axios from "axios";

// Helper to get JWT token from localStorage
const getToken = () => localStorage.getItem("token");

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "user", password: "" });

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

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        API_URL,
        newUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers([...users, res.data]);
      setNewUser({ name: "", email: "", password: "", role: "user" });
    } catch (err) {
      alert(err?.response?.data?.message || "Error creating user");
    }
  };

  const startEdit = (user) => {
    setEditId(user.id);
    setEditForm({ name: user.name, email: user.email, role: user.role, password: "" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ name: "", email: "", role: "user", password: "" });
  };

  const saveEdit = async (id) => {
    try {
      const payload = { name: editForm.name, email: editForm.email, role: editForm.role };
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
      <h1 className="text-2xl font-bold mb-6 text-center">User Management</h1>
      <form onSubmit={handleAddUser} className="mb-6" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          className="border px-2 py-1"
        />
        <input
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          className="border px-2 py-1"
        />
        <input
          placeholder="Password"
          type="password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          className="border px-2 py-1"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="border px-2 py-1"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add User</button>
      </form>
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="text-center">
              <td className="p-2 border">{user.id}</td>
              <td className="p-2 border">
                {editId === user.id ? (
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="border px-2 py-1"
                  />
                ) : (
                  user.name
                )}
              </td>
              <td className="p-2 border">
                {editId === user.id ? (
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="border px-2 py-1"
                  />
                ) : (
                  user.email
                )}
              </td>
              <td className="p-2 border">
                {editId === user.id ? (
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="border px-2 py-1 rounded"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="border px-2 py-1 rounded"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                {editId === user.id ? (
                  <div style={{ marginTop: 8 }}>
                    <input
                      placeholder="New password (optional)"
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="border px-2 py-1"
                    />
                  </div>
                ) : null}
              </td>
              <td className="p-2 border" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {editId === user.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(user.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(user)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsers
