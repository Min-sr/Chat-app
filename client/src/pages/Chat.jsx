import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { Send, Phone, Video, MoreVertical, Smile } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import CallManager from '../components/CallManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Avatar({ username = '', size = 8 }) {
  const initials = username.slice(0, 2).toUpperCase();
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
  const color = COLORS[(username.charCodeAt(0) || 0) % COLORS.length];
  return (
    <div className={`w-${size} h-${size} ${color} rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0 select-none`}>
      {initials}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!activeConversation) return;
    loadMessages(activeConversation._id);
    if (socket) {
      socket.emit('join_conversation', { conversationId: activeConversation._id });
    }
    return () => {
      if (socket) socket.emit('leave_conversation', { conversationId: activeConversation._id });
    };
  }, [activeConversation?._id]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', ({ message, conversationId }) => {
      if (conversationId === activeConversation?._id) {
        setMessages(prev => [...prev, message]);
        socket.emit('message_read', { messageId: message._id, conversationId });
      }
    });
    socket.on('user_typing', ({ userId, conversationId }) => {
      if (conversationId === activeConversation?._id && userId !== user?._id) {
        setTypingUsers(prev => new Set([...prev, userId]));
      }
    });
    socket.on('user_stop_typing', ({ userId }) => {
      setTypingUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    });
    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, activeConversation?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const loadMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`${API_URL}/messages/${conversationId}`);
      setMessages(data.data?.messages || data.data || []);
    } catch {
      toast.error('Không thể tải tin nhắn');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversation || !socket) return;
    const content = inputMessage.trim();
    setInputMessage('');
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      content,
      sender: user,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);
    socket.emit('send_message', { conversationId: activeConversation._id, content, type: 'text' });
    stopTypingSignal();
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    if (!socket || !activeConversation) return;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { conversationId: activeConversation._id });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTypingSignal, 2000);
  };

  const stopTypingSignal = () => {
    if (isTyping && socket && activeConversation) {
      setIsTyping(false);
      socket.emit('typing_stop', { conversationId: activeConversation._id });
    }
    clearTimeout(typingTimer.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const getOtherUser = (conv) => {
    if (!conv) return null;
    if (conv.isGroup) return { username: conv.name || 'Nhóm' };
    return conv.participants?.find(p => (p._id || p) !== user?._id) || {};
  };

  const otherUser = getOtherUser(activeConversation);

  const isMyMessage = (msg) => (msg.sender?._id || msg.sender) === user?._id;

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isSameSender = prev && (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender);
    const isRecent = prev && (new Date(msg.createdAt) - new Date(prev.createdAt)) < 60000;
    acc.push({ ...msg, showAvatar: !isSameSender || !isRecent, isGrouped: isSameSender && isRecent });
    return acc;
  }, []);

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">

      {/* Sidebar */}
      <Sidebar
        onSelectConversation={(conv) => { setActiveConversation(conv); setMessages([]); }}
        activeConversationId={activeConversation?._id}
        socket={socket}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar username={otherUser?.username || '?'} size={10} />
                <div>
                  <p className="font-semibold text-gray-800">{otherUser?.username}</p>
                  <p className="text-xs text-green-500">● Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* ── Nút gọi thoại ── */}
                <button
                  onClick={() => window.__startCall?.('audio')}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                  title="Gọi thoại"
                >
                  <Phone className="w-5 h-5" />
                </button>
                {/* ── Nút video call ── */}
                <button
                  onClick={() => window.__startCall?.('video')}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                  title="Video call"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Đang tải...</p>
                  </div>
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="text-5xl mb-3">👋</div>
                    <p className="font-medium">Bắt đầu cuộc trò chuyện!</p>
                    <p className="text-sm mt-1">Gửi tin nhắn đầu tiên cho {otherUser?.username}</p>
                  </div>
                </div>
              ) : (
                groupedMessages.map((msg) => {
                  const mine = isMyMessage(msg);
                  return (
                    <div
                      key={msg._id}
                      className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'} ${msg.isGrouped ? 'mt-0.5' : 'mt-3'}`}
                    >
                      {!mine && (
                        <div className="w-8 flex-shrink-0">
                          {msg.showAvatar && <Avatar username={msg.sender?.username || '?'} size={8} />}
                        </div>
                      )}
                      <div className={`max-w-[65%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        {!mine && msg.showAvatar && activeConversation?.isGroup && (
                          <p className="text-xs text-gray-500 mb-1 px-1">{msg.sender?.username}</p>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                          ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}
                          ${msg.status === 'sending' ? 'opacity-70' : ''}`}
                        >
                          {msg.content}
                        </div>
                        {msg.showAvatar && (
                          <p className="text-[10px] text-gray-400 mt-1 px-1">
                            {formatMsgTime(msg.createdAt)}
                            {mine && msg.status !== 'sending' && <span className="ml-1 text-blue-400">✓✓</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {typingUsers.size > 0 && (
                <div className="flex items-end gap-2 mt-3">
                  <div className="w-8 flex-shrink-0" />
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button" className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition flex-shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn... (Enter để gửi)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 border border-transparent
                    focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 select-none">
            <div className="text-7xl mb-4">💬</div>
            <p className="text-xl font-semibold text-gray-600">Chào mừng, {user?.username}!</p>
            <p className="text-sm mt-2 text-center max-w-xs">
              Chọn một cuộc trò chuyện bên trái hoặc thêm bạn bè mới để bắt đầu nhắn tin
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className={isConnected ? 'text-green-600' : 'text-red-500'}>
                {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── CallManager: xử lý toàn bộ WebRTC ── */}
      <CallManager
        socket={socket}
        currentUser={user}
        otherUser={otherUser}
      />
    </div>
  );
}
