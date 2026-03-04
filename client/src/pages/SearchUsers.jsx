// src/pages/SearchUsers.jsx
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function SearchUsers() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);

  const handleSearch = async () => {
    if (query.trim().length < 2) {
      toast.error("Enter at least 2 characters");
      return;
    }

    try {
      const res = await axios.get(`/api/users/search?q=${query}`);
      setUsers(res.data.data);
    } catch (err) {
      toast.error("Search failed");
    }
  };

  const sendRequest = async (id) => {
    try {
      await axios.post(`/api/friends/request/${id}`);
      toast.success("Friend request sent");
    } catch {
      toast.error("Request failed");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Search Users</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="border px-3 py-2 rounded w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or email"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Search
        </button>
      </div>

      {users.map((user) => (
        <div key={user._id} className="bg-white p-4 rounded shadow mb-3 flex justify-between">
          <div>
            <p className="font-semibold">{user.username}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          <button
            onClick={() => sendRequest(user._id)}
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            Add Friend
          </button>
        </div>
      ))}
    </div>
  );
}