const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

// MIME 타입 정의
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

// HTTP 서버 생성
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // 파일 읽기
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Page Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

// Socket.io 서버 생성
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 현재 그림 데이터 저장
let drawingData = [];

// 클라이언트 연결 처리
io.on('connection', (socket) => {
  console.log(`사용자 연결됨: ${socket.id}`);
  
  // 현재 접속자 수 브로드캐스트
  io.emit('userCount', io.engine.clientsCount);
  
  // 새 사용자에게 현재 그림 데이터 전송
  socket.emit('loadDrawing', drawingData);
  
  // 그리기 데이터 수신
  socket.on('drawing', (data) => {
    // 그리기 데이터 저장
    drawingData.push(data);
    
    // 다른 모든 클라이언트에게 전송
    socket.broadcast.emit('drawing', data);
  });
  
  // 캔버스 지우기
  socket.on('clearCanvas', () => {
    drawingData = [];
    io.emit('clearCanvas');
  });
  
  // 사용자 연결 해제
  socket.on('disconnect', () => {
    console.log(`사용자 연결 해제됨: ${socket.id}`);
    io.emit('userCount', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`http://localhost:${PORT} 에서 확인하세요.`);
});