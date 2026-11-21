const io = require('socket.io')(3000);
const players = new Map(); // id -> {x, y, mass, nick}

io.on('connection', s => {
  s.on('join', d => players.set(s.id, { ...d }));
  s.on('input', (x, y) => { const p = players.get(s.id); if (p) { p.tx = x; p.ty = y; } });
  s.on('disconnect', () => { players.delete(s.id); io.emit('voice:bye', s.id); });

  // --- релей WebRTC-сигнализации ---
  s.on('voice:offer', (to, sdp) => io.to(to).emit('voice:offer', { from: s.id, sdp }));
  s.on('voice:answer', (to, sdp) => io.to(to).emit('voice:answer', { from: s.id, sdp }));
  s.on('voice:ice', (to, cand) => io.to(to).emit('voice:ice', { from: s.id, cand }));

  // --- игровой цикл 30 Гц: физика, поедание, broadcast состояний ---
  setInterval(() => {
    // (движение, столкновения, еда — как на клиенте, но авторитетно)
    io.emit('state', [...players.entries()].map(([id, p]) => ({ id, ...p })));
  }, 33);
});
