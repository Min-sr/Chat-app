// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get("/api/auth/me").then(res => {
      setUser(res.data.data);
    });
  }, []);

  if (!user) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Profile</h1>

      <div className="bg-white p-6 rounded shadow">
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Bio:</strong> {user.bio || "No bio"}</p>
        <p>
          <strong>Status:</strong>{" "}
          {user.isOnline ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
}