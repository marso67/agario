const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Раздача статики из папки, где лежит server.js
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const players = new Map();

io.on('connection', s => {
  console.log('[+] подключился:', s.id);

  s.on('join', data => {
    players.set(s.id, {
      id: s.id,
      x: 7071 + (Math.random() - 0.5) * 200,
      y: 7071 + (Math.random() - 0.5) * 200,
      mass: 20,
      nick: data.nick || 'anon',
      color: data.color || '#ff4757',
      tx: 7071,
      ty: 7071
    });
    s.emit('welcome', { id: s.id });
  });

  s.on('input', (tx, ty) => {
    const p = players.get(s.id);
    if (p) { p.tx = tx; p.ty = ty; }
  });

  // WebRTC сигнализация для голосового чата
  s.on('voice:offer',  (to, sdp) => io.to(to).emit('voice:offer',  { from: s.id, sdp }));
  s.on('voice:answer', (to, sdp) => io.to(to).emit('voice:answer', { from: s.id, sdp }));
  s.on('voice:ice',    (to, cand) => io.to(to).emit('voice:ice',    { from: s.id, cand }));
  s.on('voice:bye',    () => io.emit('voice:bye', s.id));

  s.on('disconnect', () => {
    players.delete(s.id);
    io.emit('player:left', s.id);
    console.log('[-] отключился:', s.id);
  });
});

// Игровой цикл 30 Гц
const WORLD = 14142;
setInterval(() => {
  for (const p of players.values()) {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      const sp = 6.5 * Math.pow(20 / p.mass, 0.32);
      p.x += (dx / d) * sp;
      p.y += (dy / d) * sp;
    }
    p.x = Math.max(0, Math.min(WORLD, p.x));
    p.y = Math.max(0, Math.min(WORLD, p.y));
  }

  const state = [...players.values()];
  io.emit('state', state);
}, 33);

server.listen(3000, () => console.log('🚀 http://localhost:3000'));
