// src/components/ConversationList.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function ConversationList({ onSelect }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const res = await axios.get("/api/conversations");
    setConversations(res.data.data);
  };

  return (
    <div className="p-4">
      {conversations.map((conv) => (
        <div
          key={conv._id}
          onClick={() => onSelect(conv)}
          className="p-3 rounded hover:bg-gray-200 cursor-pointer mb-2"
        >
          <p className="font-semibold">
            {conv.type === "group"
              ? conv.name
              : conv.participants.map(p => p.username).join(", ")}
          </p>

          {conv.lastMessage && (
            <p className="text-sm text-gray-500 truncate">
              {conv.lastMessage.content}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}