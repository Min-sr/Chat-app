import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { Send, Phone, Video, MoreVertical, Smile, Image, X } from 'lucide-react';
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
  const [messages, setMessages]         = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers]   = useState(new Set());
  const [isTyping, setIsTyping]         = useState(false);
  const [onlineUsers, setOnlineUsers]   = useState(new Set());
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading]       = useState(false);

  const startCallRef   = useRef(null);
  const fileInputRef   = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);
  const inputRef       = useRef(null);
  const activeConvRef  = useRef(null);

  const handleStartCallReady = useCallback((fn) => { startCallRef.current = fn; }, []);

  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  const getOtherUser = (conv) => {
    if (!conv) return null;
    if (conv.isGroup) return { username: conv.name || 'Nhóm' };
    return conv.participants?.find(p => {
      const id = typeof p === 'object' ? p._id : p;
      return id !== user?._id;
    }) || null;
  };

  const otherUser = getOtherUser(activeConversation);

  // Load messages
  useEffect(() => {
    if (!activeConversation) return;
    loadMessages(activeConversation._id);
    if (socket) socket.emit('join_conversation', { conversationId: activeConversation._id });
    return () => {
      if (socket) socket.emit('leave_conversation', { conversationId: activeConversation._id });
    };
  }, [activeConversation?._id, socket]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ message, conversationId }) => {
      if (conversationId !== activeConvRef.current?._id) return;
      setMessages(prev => {
        const without = prev.filter(m => !m._id?.startsWith('temp-'));
        if (without.some(m => m._id === message._id)) return without;
        return [...without, message];
      });
      socket.emit('message_read', { messageId: message._id, conversationId });
    };

    const handleMessagesRead = ({ conversationId, readBy }) => {
      if (conversationId !== activeConvRef.current?._id) return;
      setMessages(prev => prev.map(m => {
        if ((m.sender?._id || m.sender) !== user?._id) return m;
        const alreadyRead = (m.readBy || []).some(id => (id?._id || id)?.toString() === readBy?.toString());
        if (alreadyRead) return m;
        return { ...m, readBy: [...(m.readBy || []), readBy] };
      }));
    };

    const handleTyping = ({ userId, conversationId }) => {
      if (conversationId === activeConvRef.current?._id && userId !== user?._id)
        setTypingUsers(prev => new Set([...prev, userId]));
    };
    const handleStopTyping = ({ userId }) =>
      setTypingUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });

    const handleOnline  = ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId]));
    const handleOffline = ({ userId }) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });

    socket.on('new_message',      handleNewMessage);
    socket.on('messages_read',    handleMessagesRead);
    socket.on('user_typing',      handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('user_online',      handleOnline);
    socket.on('user_offline',     handleOffline);

    return () => {
      socket.off('new_message',      handleNewMessage);
      socket.off('messages_read',    handleMessagesRead);
      socket.off('user_typing',      handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('user_online',      handleOnline);
      socket.off('user_offline',     handleOffline);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const loadMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`${API_URL}/messages/${conversationId}`);
      const msgs = data.data?.messages || data.data || [];
      setMessages(msgs);
      if (msgs.length && socket) {
        socket.emit('message_read', { messageId: msgs[msgs.length - 1]._id, conversationId });
      }
    } catch { toast.error('Không thể tải tin nhắn'); }
    finally { setLoadingMessages(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !imagePreview) || !activeConversation || !socket) return;
    if (imagePreview) { await handleSendImage(); return; }

    const content = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, {
      _id: `temp-${Date.now()}`, content, sender: user,
      createdAt: new Date().toISOString(), status: 'sending', readBy: [],
    }]);
    socket.emit('send_message', { conversationId: activeConversation._id, content, type: 'text' });
    stopTypingSignal();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Chỉ chấp nhận file ảnh');
    if (file.size > 10 * 1024 * 1024) return toast.error('Ảnh quá lớn (tối đa 10MB)');
    setImagePreview({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const handleSendImage = async () => {
    if (!imagePreview) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', imagePreview.file);
      const { data } = await axios.post(`${API_URL}/messages/upload`, formData);
      socket.emit('send_message', {
        conversationId: activeConversation._id,
        content: inputMessage.trim() || '',
        type: 'image',
        fileUrl: data.data.fileUrl,
        fileName: data.data.fileName,
        fileSize: data.data.fileSize,
      });
      setImagePreview(null);
      setInputMessage('');
    } catch { toast.error('Không thể gửi ảnh'); }
    finally { setUploading(false); }
  };

  const cancelImagePreview = () => {
    if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
  };

  const isMyMessage = (msg) => (msg.sender?._id || msg.sender) === user?._id;
  const isRead = (msg) => (msg.readBy || []).some(id => {
    const rid = id?._id || id;
    return rid && rid.toString() !== user?._id?.toString();
  });
  const formatMsgTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

  // Chỉ hiện "Đã xem" ở tin nhắn cuối cùng của mình được đọc
  const lastReadIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--)
      if (isMyMessage(messages[i]) && isRead(messages[i])) return i;
    return -1;
  })();

  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isSameSender = prev && (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender);
    const isRecent     = prev && (new Date(msg.createdAt) - new Date(prev.createdAt)) < 60000;
    acc.push({ ...msg, showAvatar: !isSameSender || !isRecent, isGrouped: isSameSender && isRecent });
    return acc;
  }, []);

  const isOtherOnline = otherUser?._id ? onlineUsers.has(otherUser._id) : false;
  const BASE_URL = API_URL.replace('/api', '');

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      <Sidebar
        onSelectConversation={(conv) => { setActiveConversation(conv); setMessages([]); }}
        activeConversationId={activeConversation?._id}
        socket={socket}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar username={otherUser?.username || '?'} size={10} />
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOtherOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{otherUser?.username}</p>
                  <p className={`text-xs ${isOtherOnline ? 'text-green-500' : 'text-gray-400'}`}>
                    {isOtherOnline ? '● Online' : '● Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startCallRef.current?.('audio')} disabled={!otherUser?._id}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-40" title="Gọi thoại">
                  <Phone className="w-5 h-5" />
                </button>
                <button onClick={() => startCallRef.current?.('video')} disabled={!otherUser?._id}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-40" title="Video call">
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
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                groupedMessages.map((msg, idx) => {
                  const mine     = isMyMessage(msg);
                  const showRead = mine && idx === lastReadIndex;
                  return (
                    <div key={msg._id}
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

                        {/* Nội dung */}
                        {msg.type === 'image' && msg.fileUrl ? (
                          <img
                            src={`${BASE_URL}${msg.fileUrl}`}
                            alt="Ảnh"
                            className={`max-w-[240px] rounded-2xl object-cover cursor-pointer hover:opacity-90 transition ${msg.status === 'sending' ? 'opacity-70' : ''}`}
                            onClick={() => window.open(`${BASE_URL}${msg.fileUrl}`, '_blank')}
                          />
                        ) : (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                            ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}
                            ${msg.status === 'sending' ? 'opacity-70' : ''}`}
                          >
                            {msg.content}
                          </div>
                        )}

                        {/* Thời gian + read status */}
                        {msg.showAvatar && (
                          <div className={`flex items-center gap-1 mt-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                            <p className="text-[10px] text-gray-400">{formatMsgTime(msg.createdAt)}</p>
                            {mine && (
                              <span className={`text-[10px] font-medium ${showRead ? 'text-blue-500' : 'text-gray-400'}`}>
                                {msg.status === 'sending' ? '○' : showRead ? '✓✓ Đã xem' : '✓✓'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsers.size > 0 && (
                <div className="flex items-end gap-2 mt-3">
                  <div className="w-8 flex-shrink-0">
                    <Avatar username={otherUser?.username || '?'} size={8} />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1 items-center">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="bg-white border-t border-gray-100 px-4 pt-3">
                <div className="flex items-end gap-3">
                  <div className="relative">
                    <img src={imagePreview.url} alt="Preview"
                      className="max-h-36 max-w-xs rounded-xl object-cover border border-gray-200" />
                    <button onClick={cancelImagePreview}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 pb-1">
                    <p className="font-medium truncate max-w-[140px]">{imagePreview.file.name}</p>
                    <p>{(imagePreview.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button"
                  className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition flex-shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition flex-shrink-0"
                  title="Gửi ảnh">
                  <Image className="w-5 h-5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={handleImageSelect} className="hidden" />
                <input ref={inputRef} type="text" value={inputMessage} onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder={imagePreview ? 'Thêm chú thích... (tuỳ chọn)' : 'Nhập tin nhắn... (Enter để gửi)'}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 border border-transparent
                    focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                />
                <button type="submit"
                  disabled={(!inputMessage.trim() && !imagePreview) || uploading}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                  {uploading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-5 h-5" />}
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

      <CallManager socket={socket} currentUser={user} otherUser={otherUser} onStartCall={handleStartCallReady} />
    </div>
  );
}
