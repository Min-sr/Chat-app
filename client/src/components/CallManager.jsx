import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, RotateCcw, Clock,
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // { urls: 'turn:YOUR_TURN_IP:3478', username: 'chatapp', credential: 'chatapp123' },
  ],
};

function CallAvatar({ username = '', size = 'lg' }) {
  const initials = username.slice(0, 2).toUpperCase();
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500'];
  const color = COLORS[(username.charCodeAt(0) || 0) % COLORS.length];
  const sz = { sm: 'w-12 h-12 text-lg', lg: 'w-24 h-24 text-3xl', xl: 'w-32 h-32 text-4xl' }[size];
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0 ring-4 ring-white/20`}>
      {initials}
    </div>
  );
}

function CtrlBtn({ onClick, icon: Icon, label, variant = 'default', disabled }) {
  const variants = {
    default: 'bg-white/20 hover:bg-white/30 text-white',
    danger:  'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    muted:   'bg-gray-600 hover:bg-gray-700 text-white',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${variants[variant]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs text-white/70">{label}</span>
    </button>
  );
}

function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export default function CallManager({ socket, currentUser, otherUser, onStartCall }) {
  // idle | outgoing | incoming | active | ended | rejected
  const [callState, setCallState]         = useState('idle');
  const [callType, setCallType]           = useState('video');
  const [incomingData, setIncomingData]   = useState(null);
  const [callDuration, setCallDuration]   = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [micOn, setMicOn]                 = useState(true);
  const [camOn, setCamOn]                 = useState(true);
  const [facingMode, setFacingMode]       = useState('user');
  const [peerCamOn, setPeerCamOn]         = useState(true);
  const [peerMicOn, setPeerMicOn]         = useState(true);
  const [rejectedBy, setRejectedBy]       = useState(null); // 'me' | 'other'

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const durationTimer  = useRef(null);
  const autoCloseTimer = useRef(null);
  const callDurationRef = useRef(0);

  // Sync ref để dùng trong closure
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

  const cleanup = useCallback(() => {
    clearInterval(durationTimer.current);
    clearTimeout(autoCloseTimer.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setMicOn(true); setCamOn(true); setFacingMode('user');
    setPeerCamOn(true); setPeerMicOn(true);
  }, []);

  const resetToIdle = useCallback(() => {
    setCallState('idle');
    setIncomingData(null);
    setCallDuration(0);
    setFinalDuration(0);
    setRejectedBy(null);
  }, []);

  const startDurationTimer = useCallback(() => {
    clearInterval(durationTimer.current);
    durationTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const getLocalStream = async (type, facing = 'user') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720, facingMode: facing } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const createPC = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) socket.emit('ice_candidate', { to: targetUserId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        const dur = callDurationRef.current;
        setFinalDuration(dur);
        cleanup();
        setCallState('ended');
        autoCloseTimer.current = setTimeout(resetToIdle, 5000);
      }
    };

    return pc;
  }, [socket, cleanup, resetToIdle]);

  // ── Start call ───────────────────────────────────────────────
  const startCall = useCallback(async (type) => {
    if (!otherUser?._id || !socket) return;
    setCallType(type);
    setCallState('outgoing');
    try {
      const stream = await getLocalStream(type);
      const pc = createPC(otherUser._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_user', { to: otherUser._id, offer, callType: type });
    } catch (err) {
      console.error('Lỗi bắt đầu call:', err);
      cleanup();
      setCallState('idle');
    }
  }, [otherUser, socket, createPC, cleanup]);

  useEffect(() => {
    if (onStartCall) onStartCall(startCall);
  }, [startCall, onStartCall]);

  // ── Accept call ──────────────────────────────────────────────
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
      console.error('Lỗi chấp nhận call:', err);
      cleanup();
      setCallState('idle');
    }
  };

  // ── Reject call ── hiện màn hình từ chối thay vì tắt luôn ───
  const rejectCall = () => {
    if (!incomingData || !socket) return;
    socket.emit('reject_call', { to: incomingData.from, reason: 'User declined' });
    setRejectedBy('me');
    cleanup();
    setCallState('rejected');
    autoCloseTimer.current = setTimeout(resetToIdle, 3000);
  };

  // ── End call ─────────────────────────────────────────────────
  const endCall = () => {
    const dur = callDurationRef.current;
    const targetId = incomingData?.from || otherUser?._id;
    if (targetId && socket) socket.emit('end_call', { to: targetId });
    setFinalDuration(dur);
    cleanup();
    setCallState('ended');
    autoCloseTimer.current = setTimeout(resetToIdle, 5000);
  };

  // ── Toggle mic ───────────────────────────────────────────────
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicOn(next);
    const targetId = incomingData?.from || otherUser?._id;
    if (targetId && socket) socket.emit('toggle_audio', { to: targetId, enabled: next });
  };

  // ── Toggle cam ───────────────────────────────────────────────
  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const next = !camOn;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = next; });
    setCamOn(next);
    const targetId = incomingData?.from || otherUser?._id;
    if (targetId && socket) socket.emit('toggle_video', { to: targetId, enabled: next });
  };

  // ── Flip camera ──────────────────────────────────────────────
  const flipCamera = async () => {
    if (!localStreamRef.current || callType !== 'video') return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    localStreamRef.current.getVideoTracks().forEach(t => t.stop());
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: newFacing },
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
      }
      const audioTracks = localStreamRef.current.getAudioTracks();
      const combined = new MediaStream([...audioTracks, newTrack]);
      localStreamRef.current = combined;
      if (localVideoRef.current) localVideoRef.current.srcObject = combined;
    } catch (err) {
      console.error('Flip camera error:', err);
    }
  };

  // ── Socket events ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = (data) => {
      if (callState !== 'idle') { socket.emit('call_busy', { to: data.from }); return; }
      setIncomingData(data);
      setCallType(data.callType);
      setCallState('incoming');
    };

    const onCallAccepted = async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState('active');
      startDurationTimer();
    };

    const onCallRejected = () => {
      setRejectedBy('other');
      cleanup();
      setCallState('rejected');
      autoCloseTimer.current = setTimeout(resetToIdle, 3000);
    };

    const onCallEnded = () => {
      const dur = callDurationRef.current;
      setFinalDuration(dur);
      cleanup();
      setCallState('ended');
      autoCloseTimer.current = setTimeout(resetToIdle, 5000);
    };

    const onCallBusy = () => { cleanup(); setCallState('idle'); };

    const onIceCandidate = async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch { }
      }
    };

    socket.on('incoming_call',    onIncomingCall);
    socket.on('call_accepted',    onCallAccepted);
    socket.on('call_rejected',    onCallRejected);
    socket.on('call_ended',       onCallEnded);
    socket.on('call_busy',        onCallBusy);
    socket.on('ice_candidate',    onIceCandidate);
    socket.on('peer_video_toggle', ({ enabled }) => setPeerCamOn(enabled));
    socket.on('peer_audio_toggle', ({ enabled }) => setPeerMicOn(enabled));

    return () => {
      socket.off('incoming_call',    onIncomingCall);
      socket.off('call_accepted',    onCallAccepted);
      socket.off('call_rejected',    onCallRejected);
      socket.off('call_ended',       onCallEnded);
      socket.off('call_busy',        onCallBusy);
      socket.off('ice_candidate',    onIceCandidate);
      socket.off('peer_video_toggle');
      socket.off('peer_audio_toggle');
    };
  }, [socket, callState, cleanup, startDurationTimer, resetToIdle]);

  // ════════════════════════════════════════════════════════════
  // RENDERS
  // ════════════════════════════════════════════════════════════

  if (callState === 'idle') return null;

  // ── INCOMING ─────────────────────────────────────────────────
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl w-80">
          <div className="flex items-center gap-2">
            {callType === 'video'
              ? <><Video className="w-4 h-4 text-blue-400" /><span className="text-white/60 text-sm">Video call đến</span></>
              : <><Phone className="w-4 h-4 text-green-400" /><span className="text-white/60 text-sm">Cuộc gọi thoại đến</span></>
            }
          </div>
          <CallAvatar username={incomingData?.fromUser?.username || '?'} size="xl" />
          <div className="text-center">
            <p className="text-white text-xl font-bold">{incomingData?.fromUser?.username || '?'}</p>
            {incomingData?.fromUser?.email && (
              <p className="text-white/40 text-sm mt-1">{incomingData.fromUser.email}</p>
            )}
          </div>
          <div className="flex gap-1 items-end h-8">
            {[18,28,22,28,18].map((h, i) => (
              <div key={i} className="w-1.5 bg-green-400 rounded-full animate-bounce"
                style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <div className="flex gap-10">
            <CtrlBtn icon={PhoneOff} label="Từ chối"   variant="danger"  onClick={rejectCall} />
            <CtrlBtn icon={Phone}    label="Chấp nhận" variant="success" onClick={acceptCall} />
          </div>
        </div>
      </div>
    );
  }

  // ── OUTGOING ─────────────────────────────────────────────────
  if (callState === 'outgoing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/98">
        <div className="flex flex-col items-center gap-7">
          <div className="relative">
            <CallAvatar username={otherUser?.username || '?'} size="xl" />
            <span className="absolute inset-0 rounded-full ring-4 ring-blue-400/30 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-bold">{otherUser?.username}</p>
            <p className="text-white/50 text-sm mt-2 animate-pulse">
              {callType === 'video' ? '📹 Đang kết nối video...' : '📞 Đang gọi...'}
            </p>
          </div>
          <CtrlBtn icon={PhoneOff} label="Huỷ" variant="danger" onClick={endCall} />
        </div>
      </div>
    );
  }

  // ── REJECTED ── Màn hình từ chối (không tắt ngay) ─────────────
  if (callState === 'rejected') {
    const msg = rejectedBy === 'me'
      ? 'Bạn đã từ chối cuộc gọi'
      : `${incomingData?.fromUser?.username || otherUser?.username || '?'} đã từ chối`;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-3xl px-10 py-9 flex flex-col items-center gap-5 shadow-2xl w-72">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <PhoneOff className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Cuộc gọi bị từ chối</p>
            <p className="text-white/50 text-sm mt-1.5">{msg}</p>
          </div>
          <p className="text-white/30 text-xs">Tự đóng sau 3 giây...</p>
          <button onClick={resetToIdle}
            className="px-6 py-2 text-sm font-semibold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // ── ENDED ── Màn hình kết thúc cuộc gọi với thời gian ─────────
  if (callState === 'ended') {
    const dur = finalDuration || callDuration;
    const peerName = incomingData?.fromUser?.username || otherUser?.username || '?';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-3xl px-10 py-9 flex flex-col items-center gap-5 shadow-2xl w-72">
          <CallAvatar username={peerName} size="lg" />
          <div className="text-center">
            <p className="text-white font-bold text-lg">{peerName}</p>
            <p className="text-white/40 text-xs mt-1">
              {callType === 'video' ? 'Video call' : 'Cuộc gọi thoại'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 bg-gray-800 px-6 py-3 rounded-2xl">
            <Clock className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-mono font-bold text-xl">{formatDuration(dur)}</span>
          </div>
          <p className="text-white/40 text-sm">Cuộc gọi đã kết thúc</p>
          <p className="text-white/20 text-xs">Tự đóng sau 5 giây...</p>
          <button onClick={resetToIdle}
            className="px-6 py-2 text-sm font-semibold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────
  const peerName = incomingData?.fromUser?.username || otherUser?.username || '?';

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Remote video */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
        {callType === 'video' ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!peerCamOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <CallAvatar username={peerName} size="xl" />
                <p className="text-white/50 text-sm mt-4">Camera đã tắt</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <CallAvatar username={peerName} size="xl" />
            <p className="text-white text-2xl font-bold">{peerName}</p>
            {!peerMicOn && <p className="text-white/40 text-sm">🔇 Đã tắt mic</p>}
          </div>
        )}

        {/* Header: tên + đồng hồ */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <p className="text-white font-semibold text-lg drop-shadow">{peerName}</p>
          <p className="text-green-400 text-sm font-mono mt-1 drop-shadow">{formatDuration(callDuration)}</p>
        </div>

        {/* Local PiP */}
        {callType === 'video' && (
          <div className="absolute bottom-28 right-4 w-36 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-800">
            {camOn
              ? <video ref={localVideoRef} autoPlay playsInline muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
              : <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <VideoOff className="w-6 h-6 text-white/40" />
                </div>
            }
            <button onClick={flipCamera}
              className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition"
              title="Lật cam">
              <RotateCcw className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900/95 backdrop-blur px-8 py-6">
        <div className="flex items-center justify-center gap-8">
          <CtrlBtn
            icon={micOn ? Mic : MicOff} label={micOn ? 'Tắt mic' : 'Bật mic'}
            variant={micOn ? 'default' : 'muted'} onClick={toggleMic}
          />
          {callType === 'video' && (
            <>
              <CtrlBtn
                icon={camOn ? Video : VideoOff} label={camOn ? 'Tắt cam' : 'Bật cam'}
                variant={camOn ? 'default' : 'muted'} onClick={toggleCam}
              />
              <CtrlBtn icon={RotateCcw} label="Lật cam" variant="default" onClick={flipCamera} />
            </>
          )}
          <CtrlBtn icon={PhoneOff} label="Kết thúc" variant="danger" onClick={endCall} />
        </div>
      </div>
    </div>
  );
}
