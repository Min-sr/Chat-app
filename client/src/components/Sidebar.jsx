import { useState, useEffect, useRef } from 'react';
import {
  Search, UserPlus, Users, Check, X, MessageCircle, LogOut,
  MessageSquare, Zap, Archive, BarChart, Grid, CreditCard, Settings, Bell
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Avatar ──────────────────────────────────────────────────
function Avatar({ username = '', size = 'md', online }) {
  const initials = username.slice(0, 2).toUpperCase();
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
  const color = COLORS[(username.charCodeAt(0) || 0) % COLORS.length];
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-xs', lg: 'w-11 h-11 text-sm' }[size];
  const dot = size === 'sm' ? 'w-2 h-2 border' : 'w-2.5 h-2.5 border-2';
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none`}>
        {initials}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dot} rounded-full border-white ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
      )}
    </div>
  );
}

// ── Tab Button ───────────────────────────────────────────────
function Tab({ label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all
        ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
    >
      {label}
      {badge > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
          ${active ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Icon Bar (thanh đen bên trái) ────────────────────────────
function IconBar({ activePanel, onPanelChange, user, logout }) {
  const topMenu = [
    { icon: Users,         label: 'Bạn bè', panel: 'friends' },
    { icon: Zap,           label: 'Engage', panel: null },
    { icon: Archive,       label: 'Archives', panel: null },
    { icon: BarChart,      label: 'Reports', panel: null },
    { icon: Grid,          label: 'Apps', panel: null },
  ];
  const bottomMenu = [
    { icon: CreditCard, label: 'Billing' },
    { icon: Settings,   label: 'Settings' },
    { icon: Bell,       label: 'Thông báo' },
  ];

  return (
    <div className="h-screen w-16 bg-gray-900 flex flex-col items-center py-4 justify-between flex-shrink-0 border-r border-gray-800">
      {/* Logo */}
      <div className="flex flex-col items-center gap-6 w-full">
        <button
          onClick={() => onPanelChange('chat')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all ${activePanel === 'chat' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-blue-600'}`}
          title="Tin nhắn"
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>

        {/* Top menu */}
        {topMenu.map((item) => {
          const Icon = item.icon;
          const isActive = item.panel && activePanel === item.panel;
          return (
            <div key={item.label} className="group relative flex justify-center w-full px-2">
              <button
                onClick={() => item.panel && onPanelChange(item.panel)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
              >
                <Icon className="w-5 h-5" />
              </button>
              {/* Tooltip */}
              <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 shadow-lg">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom menu */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {bottomMenu.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="group relative flex justify-center w-full">
              <button className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition">
                <Icon className="w-5 h-5" />
              </button>
              <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 shadow-lg">
                {item.label}
              </span>
            </div>
          );
        })}

        {/* User avatar */}
        <div className="group relative flex justify-center w-full">
          <button
            onClick={logout}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-900/40 transition"
            title="Đăng xuất"
          >
            <Avatar username={user?.username || ''} size="sm" online={true} />
          </button>
          <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Đăng xuất
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Chat Panel (sidebar phải) ────────────────────────────────
function ChatPanel({ onSelectConversation, activeConversationId, socket, user }) {
  const [tab, setTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sentRequests, setSentRequests] = useState(new Set());
  const searchTimer = useRef(null);

  useEffect(() => {
    fetchConversations();
    fetchFriends();
    fetchFriendRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('user_online', ({ userId }) =>
      setOnlineUsers(prev => new Set([...prev, userId]))
    );
    socket.on('user_offline', ({ userId }) =>
      setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n; })
    );
    socket.on('new_message', ({ message, conversationId }) => {
      setConversations(prev =>
        prev.map(c => c._id === conversationId
          ? { ...c, lastMessage: message, updatedAt: message.createdAt }
          : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    });
    return () => {
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('new_message');
    };
  }, [socket]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.data?.users || data.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 500);
  }, [searchQuery]);

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/conversations`);
      setConversations(data.data?.conversations || data.data || []);
    } catch { }
  };

  const fetchFriends = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/friends`);
      setFriends(data.data?.friends || data.data || []);
    } catch { }
  };

  const fetchFriendRequests = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/friends/requests`);
      setRequests(data.data?.requests || data.data || []);
    } catch { }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await axios.post(`${API_URL}/friends/request/${userId}`);
      setSentRequests(prev => new Set([...prev, userId]));
      toast.success('Đã gửi lời mời kết bạn!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi lời mời');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.post(`${API_URL}/friends/accept/${requestId}`);
      setRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Đã kết bạn! 🎉');
      fetchFriends();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    }
  };

  const declineRequest = async (requestId) => {
    try {
      await axios.post(`${API_URL}/friends/reject/${requestId}`);
      setRequests(prev => prev.filter(r => r._id !== requestId));
      toast('Đã từ chối lời mời');
    } catch { }
  };

  const openDirectChat = async (friendId) => {
    try {
      const { data } = await axios.post(`${API_URL}/conversations`, { participantId: friendId });
      const conv = data.data?.conversation || data.data;
      await fetchConversations();
      onSelectConversation?.(conv);
      setTab('chats');
    } catch {
      toast.error('Không thể mở chat');
    }
  };

  const isFriend = (uid) => friends.some(f => (f._id || f) === uid);

  const getOtherParticipant = (conv) => {
    if (conv.isGroup) return { username: conv.name || 'Nhóm', _id: conv._id };
    return conv.participants?.find(p => (p._id || p) !== user?._id) || {};
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffH = (Date.now() - d) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="h-full w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

      {/* Search */}
      <div className="px-3 pt-4 pb-3 border-b border-gray-100">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setTab(e.target.value ? 'search' : 'chats');
            }}
            placeholder="Tìm kiếm hoặc thêm bạn..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 rounded-xl border border-transparent
              focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); setTab('chats'); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {!searchQuery && (
          <div className="flex gap-1">
            <Tab label="Tin nhắn" active={tab === 'chats'}   onClick={() => setTab('chats')} />
            <Tab label="Bạn bè"   active={tab === 'friends'} onClick={() => setTab('friends')} />
            <Tab label="Lời mời"  active={tab === 'requests'} badge={requests.length} onClick={() => setTab('requests')} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* SEARCH */}
        {tab === 'search' && (
          <div className="p-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2">
              {searching ? 'Đang tìm...' : `${searchResults.length} kết quả`}
            </p>
            {!searching && searchResults.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Không tìm thấy người dùng</p>
              </div>
            )}
            {searchResults.map(u => (
              <div key={u._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                <Avatar username={u.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.username}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                {u._id === user?._id ? null : isFriend(u._id) ? (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1 flex-shrink-0">
                    <Check className="w-3 h-3" /> Bạn bè
                  </span>
                ) : (
                  <button
                    onClick={() => sendFriendRequest(u._id)}
                    disabled={sentRequests.has(u._id)}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg
                      bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition flex-shrink-0"
                  >
                    <UserPlus className="w-3 h-3" />
                    {sentRequests.has(u._id) ? 'Đã gửi' : 'Kết bạn'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CONVERSATIONS */}
        {tab === 'chats' && (
          <div className="p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Chưa có cuộc trò chuyện</p>
                <p className="text-xs mt-1">Thêm bạn bè và bắt đầu chat!</p>
              </div>
            ) : conversations.map(conv => {
              const other = getOtherParticipant(conv);
              const isActive = conv._id === activeConversationId;
              return (
                <button
                  key={conv._id}
                  onClick={() => onSelectConversation?.(conv)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left
                    ${isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <Avatar username={other.username || '?'} size="lg" online={onlineUsers.has(other._id)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${isActive ? 'font-bold text-blue-700' : 'font-semibold text-gray-800'}`}>
                        {other.username || conv.name}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {conv.lastMessage?.content || 'Bắt đầu trò chuyện...'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* FRIENDS */}
        {tab === 'friends' && (
          <div className="p-2">
            {friends.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Chưa có bạn bè</p>
                <p className="text-xs mt-1">Dùng ô tìm kiếm để thêm bạn!</p>
              </div>
            ) : (
              <>
                {friends.filter(f => onlineUsers.has(f._id)).length > 0 && (
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                    Online · {friends.filter(f => onlineUsers.has(f._id)).length}
                  </p>
                )}
                {friends.map(friend => (
                  <div key={friend._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group">
                    <Avatar username={friend.username} size="md" online={onlineUsers.has(friend._id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{friend.username}</p>
                      <p className={`text-xs ${onlineUsers.has(friend._id) ? 'text-green-500' : 'text-gray-400'}`}>
                        {onlineUsers.has(friend._id) ? '● Online' : '● Offline'}
                      </p>
                    </div>
                    <button
                      onClick={() => openDirectChat(friend._id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* REQUESTS */}
        {tab === 'requests' && (
          <div className="p-2">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Không có lời mời nào</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  {requests.length} lời mời đang chờ
                </p>
                {requests.map(req => {
                  const sender = req.sender || req;
                  return (
                    <div key={req._id} className="px-3 py-3 rounded-xl hover:bg-gray-50 transition mb-1 border border-gray-100">
                      <div className="flex items-center gap-3 mb-2.5">
                        <Avatar username={sender.username} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{sender.username}</p>
                          <p className="text-xs text-gray-400 truncate">{sender.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptRequest(req._id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold
                            bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Chấp nhận
                        </button>
                        <button
                          onClick={() => declineRequest(req._id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold
                            bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <X className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export: cả 2 sidebar gộp lại ───────────────────────
export default function Sidebar({ onSelectConversation, activeConversationId, socket }) {
  const { user, logout } = useAuthStore();
  const [activePanel, setActivePanel] = useState('chat');

  return (
    <div className="flex h-screen flex-shrink-0">
      {/* Thanh icon đen */}
      <IconBar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        user={user}
        logout={logout}
      />

      {/* Panel chat/friends tùy tab đang chọn */}
      <ChatPanel
        onSelectConversation={onSelectConversation}
        activeConversationId={activeConversationId}
        socket={socket}
        user={user}
      />
    </div>
  );
}
