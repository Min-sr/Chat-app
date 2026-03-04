import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  PhoneIncoming, PhoneMissed
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ── Avatar nhỏ dùng trong call UI ───────────────────────────
function CallAvatar({ username = '', size = 'lg' }) {
  const initials = username.slice(0, 2).toUpperCase();
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500'];
  const color = COLORS[(username.charCodeAt(0) || 0) % COLORS.length];
  const sz = { sm: 'w-12 h-12 text-lg', lg: 'w-24 h-24 text-3xl', xl: 'w-32 h-32 text-4xl' }[size];
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Control Button ───────────────────────────────────────────
function CtrlBtn({ onClick, icon: Icon, label, variant = 'default', disabled }) {
  const variants = {
    default:  'bg-white/20 hover:bg-white/30 text-white',
    danger:   'bg-red-500 hover:bg-red-600 text-white',
    success:  'bg-green-500 hover:bg-green-600 text-white',
    muted:    'bg-gray-600 hover:bg-gray-700 text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${variants[variant]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs text-white/70">{label}</span>
    </button>
  );
}

// ── Main CallManager ─────────────────────────────────────────
export default function CallManager({ socket, currentUser, otherUser }) {
  // call states: idle | outgoing | incoming | active
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('video'); // 'audio' | 'video'
  const [incomingData, setIncomingData] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  // media states
  const [micOn, setMicOn]     = useState(true);
  const [camOn, setCamOn]     = useState(true);
  const [peerCamOn, setPeerCamOn] = useState(true);
  const [peerMicOn, setPeerMicOn] = useState(true);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);   // RTCPeerConnection
  const localStreamRef = useRef(null);
  const durationTimer  = useRef(null);
  const ringAudioRef   = useRef(null);

  // ── Cleanup ────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationTimer.current);
    setCallDuration(0);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (ringAudioRef.current) {
      ringAudioRef.current.pause();
      ringAudioRef.current = null;
    }

    setCallState('idle');
    setIncomingData(null);
    setMicOn(true); setCamOn(true);
    setPeerCamOn(true); setPeerMicOn(true);
  }, []);

  // ── Get local media ────────────────────────────────────────
  const getLocalStream = async (type) => {
    const constraints = {
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720 } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  // ── Create PeerConnection ──────────────────────────────────
  const createPC = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Send ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('ice_candidate', { to: targetUserId, candidate });
      }
    };

    // Receive remote stream
    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanup();
      }
    };

    return pc;
  }, [socket, cleanup]);

  // ── Start call (caller side) ───────────────────────────────
  const startCall = async (type) => {
    if (!otherUser?._id || !socket) return;
    setCallType(type);
    setCallState('outgoing');

    try {
      const stream = await getLocalStream(type);
      const pc = createPC(otherUser._id);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        to: otherUser._id,
        offer,
        callType: type,
      });
    } catch (err) {
      console.error('Error starting call:', err);
      cleanup();
    }
  };

  // ── Accept incoming call ───────────────────────────────────
  const acceptCall = async () => {
    if (!incomingData || !socket) return;
    setCallState('active');

    try {
      const stream = await getLocalStream(incomingData.callType);
      const pc = createPC(incomingData.from);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('accept_call', { to: incomingData.from, answer });

      startDurationTimer();
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanup();
    }
  };

  // ── Reject incoming call ───────────────────────────────────
  const rejectCall = () => {
    if (!incomingData || !socket) return;
    socket.emit('reject_call', { to: incomingData.from, reason: 'User declined' });
    cleanup();
  };

  // ── End active call ────────────────────────────────────────
  const endCall = () => {
    const targetId = incomingData?.from || otherUser?._id;
    if (targetId && socket) {
      socket.emit('end_call', { to: targetId });
    }
    cleanup();
  };

  // ── Toggle mic ─────────────────────────────────────────────
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const newState = !micOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = newState; });
    setMicOn(newState);
    const targetId = incomingData?.from || otherUser?._id;
    if (targetId && socket) socket.emit('toggle_audio', { to: targetId, enabled: newState });
  };

  // ── Toggle camera ──────────────────────────────────────────
  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const newState = !camOn;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = newState; });
    setCamOn(newState);
    const targetId = incomingData?.from || otherUser?._id;
    if (targetId && socket) socket.emit('toggle_video', { to: targetId, enabled: newState });
  };

  // ── Duration timer ─────────────────────────────────────────
  const startDurationTimer = () => {
    durationTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Socket event listeners ─────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Nhận cuộc gọi đến
    socket.on('incoming_call', (data) => {
      if (callState !== 'idle') {
        socket.emit('call_busy', { to: data.from });
        return;
      }
      setIncomingData(data);
      setCallType(data.callType);
      setCallState('incoming');
    });

    // Caller: call được chấp nhận
    socket.on('call_accepted', async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState('active');
      startDurationTimer();
    });

    // Call bị từ chối
    socket.on('call_rejected', () => {
      cleanup();
    });

    // Đầu kia kết thúc call
    socket.on('call_ended', () => {
      cleanup();
    });

    // ICE candidate từ peer
    socket.on('ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch { /* silent */ }
      }
    });

    // Peer toggle video/audio
    socket.on('peer_video_toggle', ({ enabled }) => setPeerCamOn(enabled));
    socket.on('peer_audio_toggle', ({ enabled }) => setPeerMicOn(enabled));

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('ice_candidate');
      socket.off('peer_video_toggle');
      socket.off('peer_audio_toggle');
    };
  }, [socket, callState, cleanup]);

  // ── Expose startCall ra ngoài qua window (để Chat.jsx gọi) ─
  useEffect(() => {
    window.__startCall = startCall;
    return () => { delete window.__startCall; };
  }, [startCall, otherUser]);

  // ── Không render gì nếu idle ───────────────────────────────
  if (callState === 'idle') return null;

  // ── INCOMING CALL popup ────────────────────────────────────
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl w-72 animate-pulse-once">
          <div className="text-white/60 text-sm font-medium">
            {callType === 'video' ? '📹 Video call đến...' : '📞 Cuộc gọi thoại đến...'}
          </div>
          <CallAvatar username={incomingData?.fromUser?.username || '?'} size="xl" />
          <div className="text-center">
            <p className="text-white text-xl font-bold">{incomingData?.fromUser?.username}</p>
            <p className="text-white/50 text-sm mt-1">{incomingData?.fromUser?.email}</p>
          </div>

          {/* Ringing animation */}
          <div className="flex gap-1">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className="w-1.5 h-6 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          <div className="flex gap-8">
            <CtrlBtn icon={PhoneOff} label="Từ chối"   variant="danger"   onClick={rejectCall} />
            <CtrlBtn icon={Phone}    label="Chấp nhận" variant="success"  onClick={acceptCall} />
          </div>
        </div>
      </div>
    );
  }

  // ── OUTGOING CALL (waiting) ────────────────────────────────
  if (callState === 'outgoing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95">
        <div className="flex flex-col items-center gap-6">
          <CallAvatar username={otherUser?.username || '?'} size="xl" />
          <div className="text-center">
            <p className="text-white text-xl font-bold">{otherUser?.username}</p>
            <p className="text-white/50 text-sm mt-1 animate-pulse">Đang gọi...</p>
          </div>
          <CtrlBtn icon={PhoneOff} label="Huỷ" variant="danger" onClick={endCall} />
        </div>
      </div>
    );
  }

  // ── ACTIVE CALL ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">

      {/* Remote video (full screen) */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        {callType === 'video' ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!peerCamOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <CallAvatar username={incomingData?.fromUser?.username || otherUser?.username || '?'} size="xl" />
                <p className="text-white/50 text-sm mt-4">Camera đã tắt</p>
              </div>
            )}
          </>
        ) : (
          /* Audio call — hiện avatar lớn */
          <div className="flex flex-col items-center gap-4">
            <CallAvatar username={incomingData?.fromUser?.username || otherUser?.username || '?'} size="xl" />
            <p className="text-white text-xl font-bold">
              {incomingData?.fromUser?.username || otherUser?.username}
            </p>
            {!peerMicOn && <p className="text-white/40 text-sm">🔇 Đã tắt mic</p>}
          </div>
        )}

        {/* Caller info + duration */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
          <p className="text-white font-semibold text-lg drop-shadow">
            {incomingData?.fromUser?.username || otherUser?.username}
          </p>
          <p className="text-green-400 text-sm font-mono mt-1">{formatDuration(callDuration)}</p>
        </div>

        {/* Local video (picture-in-picture) */}
        {callType === 'video' && (
          <div className="absolute bottom-28 right-4 w-36 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-800">
            {camOn ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <VideoOff className="w-6 h-6 text-white/40" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gray-900/95 backdrop-blur px-8 py-6 flex items-center justify-center gap-8">
        <CtrlBtn
          icon={micOn ? Mic : MicOff}
          label={micOn ? 'Tắt mic' : 'Bật mic'}
          variant={micOn ? 'default' : 'muted'}
          onClick={toggleMic}
        />
        {callType === 'video' && (
          <CtrlBtn
            icon={camOn ? Video : VideoOff}
            label={camOn ? 'Tắt cam' : 'Bật cam'}
            variant={camOn ? 'default' : 'muted'}
            onClick={toggleCam}
          />
        )}
        <CtrlBtn icon={PhoneOff} label="Kết thúc" variant="danger" onClick={endCall} />
      </div>
    </div>
  );
}
