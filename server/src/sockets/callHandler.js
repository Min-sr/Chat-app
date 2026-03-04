// WebRTC Signaling Handler for Audio/Video Calls (Level 3)

export const setupCallHandlers = (io, socket) => {
  
  // Initiate a call
  socket.on('call_user', ({ to, offer, callType }) => {
    console.log(`Call initiated from ${socket.userId} to ${to} (${callType})`);
    
    io.to(`user:${to}`).emit('incoming_call', {
      from: socket.userId,
      fromUser: socket.user,
      offer,
      callType, // 'audio' or 'video'
      timestamp: new Date()
    });
  });

  // Accept call
  socket.on('accept_call', ({ to, answer }) => {
    console.log(`Call accepted by ${socket.userId} to ${to}`);
    
    io.to(`user:${to}`).emit('call_accepted', {
      from: socket.userId,
      answer,
      timestamp: new Date()
    });
  });

  // Reject call
  socket.on('reject_call', ({ to, reason }) => {
    console.log(`Call rejected by ${socket.userId} to ${to}`);
    
    io.to(`user:${to}`).emit('call_rejected', {
      from: socket.userId,
      reason: reason || 'User declined the call',
      timestamp: new Date()
    });
  });

  // End call
  socket.on('end_call', ({ to }) => {
    console.log(`Call ended by ${socket.userId} to ${to}`);
    
    io.to(`user:${to}`).emit('call_ended', {
      from: socket.userId,
      timestamp: new Date()
    });
  });

  // ICE candidate exchange
  socket.on('ice_candidate', ({ to, candidate }) => {
    io.to(`user:${to}`).emit('ice_candidate', {
      from: socket.userId,
      candidate
    });
  });

  // Toggle video
  socket.on('toggle_video', ({ to, enabled }) => {
    io.to(`user:${to}`).emit('peer_video_toggle', {
      from: socket.userId,
      enabled
    });
  });

  // Toggle audio
  socket.on('toggle_audio', ({ to, enabled }) => {
    io.to(`user:${to}`).emit('peer_audio_toggle', {
      from: socket.userId,
      enabled
    });
  });

  // Call busy (user already in another call)
  socket.on('call_busy', ({ to }) => {
    io.to(`user:${to}`).emit('call_busy', {
      from: socket.userId,
      message: 'User is currently in another call'
    });
  });
};
