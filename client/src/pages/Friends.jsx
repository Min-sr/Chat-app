// src/pages/Friends.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const fetchFriends = async () => {
    const res = await axios.get("/api/friends");
    setFriends(res.data.data);
  };

  const fetchRequests = async () => {
    const res = await axios.get("/api/friends/requests");
    setRequests(res.data.data);
  };

  const accept = async (id) => {
    await axios.post(`/api/friends/accept/${id}`);
    toast.success("Accepted");
    fetchFriends();
    fetchRequests();
  };

  const reject = async (id) => {
    await axios.post(`/api/friends/reject/${id}`);
    toast.success("Rejected");
    fetchRequests();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Friend Requests</h2>

      {requests.map((req) => (
        <div key={req._id} className="bg-white p-4 rounded shadow mb-3 flex justify-between">
          <span>{req.from.username}</span>
          <div className="flex gap-2">
            <button onClick={() => accept(req._id)} className="bg-green-500 text-white px-3 py-1 rounded">
              Accept
            </button>
            <button onClick={() => reject(req._id)} className="bg-red-500 text-white px-3 py-1 rounded">
              Reject
            </button>
          </div>
        </div>
      ))}

      <h2 className="text-xl font-bold mt-8 mb-4">My Friends</h2>

      {friends.map((friend) => (
        <div key={friend._id} className="bg-white p-4 rounded shadow mb-3">
          {friend.username}
        </div>
      ))}
    </div>
  );
}