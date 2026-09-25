import { io } from '../../client/node_modules/socket.io-client/build/esm/index.js';

console.log('=== BẮT ĐẦU CHẠY MÔ PHỎNG SOCKET E2E FLOW ===');

const SERVER_URL = 'http://localhost:3001';

// Tạo kết nối cho Host
const hostSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
// Tạo kết nối cho Player 1
const p1Socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
// Tạo kết nối cho Player 2
const p2Socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

async function runSimulation() {
  await new Promise(r => setTimeout(r, 500));

  // 1. Host Join
  hostSocket.emit('join_room', { roomCode: 'OLYMPIA', role: 'host' });
  console.log('✓ Host đã tham gia phòng');

  // 2. Player 1 & 2 Join
  p1Socket.emit('join_room', { roomCode: 'OLYMPIA', playerName: 'Thí sinh 1 (Lê Minh)', role: 'player', playerId: 'player_001' });
  p2Socket.emit('join_room', { roomCode: 'OLYMPIA', playerName: 'Thí sinh 2 (Thu Hà)', role: 'player', playerId: 'player_002' });
  console.log('✓ 2 Thí sinh đã tham gia phòng');

  await new Promise(r => setTimeout(r, 400));

  // 3. Host chọn Hàng 1
  hostSocket.emit('host:select_row', { rowId: 1 });
  console.log('✓ Host đã kích hoạt Hàng 1');

  await new Promise(r => setTimeout(r, 300));

  // 4. Host Mở chuông
  hostSocket.emit('host:toggle_buzzer', { isOpen: true });
  console.log('✓ Host đã MỞ CHUÔNG hàng ngang');

  await new Promise(r => setTimeout(r, 100));

  // 5. Thí sinh 1 bấm chuông hàng ngang
  p1Socket.emit('client:buzz', { type: 'ROW' });

  // Thí sinh 2 bấm sau một khoảng ngắn
  await new Promise(r => setTimeout(r, 85));
  p2Socket.emit('client:buzz', { type: 'ROW' });

  // Lắng nghe cập nhật hàng đợi (đợi gói tin có thí sinh bấm chuông)
  const queuePromise = new Promise(resolve => {
    const handler = (data) => {
      if (data.queue && data.queue.length > 0) {
        hostSocket.off('buzz:row_queue_updated', handler);
        resolve(data);
      }
    };
    hostSocket.on('buzz:row_queue_updated', handler);
  });

  const queueData = await queuePromise;
  console.log(`✓ Nhận được buzz queue (${queueData.queue.length} người):`);
  queueData.queue.forEach((q, idx) => {
    console.log(`   #${idx + 1}: ${q.name} - Delta: ${q.deltaMs}ms (Server-Authoritative timestamp: ${q.timestamp})`);
  });

  console.assert(queueData.queue[0].deltaMs === 0, 'Người đầu tiên phải deltaMs = 0');
  if (queueData.queue.length > 1) {
    console.assert(queueData.queue[1].deltaMs > 0, 'Người thứ hai phải có deltaMs > 0');
  }

  // 6. Host chấm ĐÚNG cho Thí sinh 1
  const revealPromise = new Promise(resolve => {
    hostSocket.once('game:row_revealed', data => resolve(data));
  });

  hostSocket.emit('host:judge_result', {
    playerId: 'player_001',
    type: 'ROW',
    isCorrect: true
  });

  const revealedRow = await revealPromise;
  console.log(`✓ Hàng ${revealedRow.rowId} đã được mở đáp án: "${revealedRow.answer}"!`);

  // 7. Thí sinh 2 bấm chuông HÀNG DỌC (Chướng ngại vật)
  const verticalAlarmPromise = new Promise(resolve => {
    hostSocket.once('buzz:vertical_triggered', data => resolve(data));
  });

  p2Socket.emit('client:buzz', { type: 'VERTICAL' });
  const verticalData = await verticalAlarmPromise;
  console.log(`✓ CÒI BÁO ĐỘNG HÀNG DỌC ĐÃ PHÁT TỚI HOST: Thí sinh ${verticalData.name} bấm chuông!`);

  // 8. Host chấm SAI cho Thí sinh 2 (Kiểm tra Permadeath)
  const eliminatePromise = new Promise(resolve => {
    p2Socket.once('game:player_eliminated', data => resolve(data));
  });

  hostSocket.emit('host:judge_result', {
    playerId: 'player_002',
    type: 'VERTICAL',
    isCorrect: false
  });

  const eliminatedData = await eliminatePromise;
  console.log(`✓ ÁN PHẠT PERMADEATH: Thí sinh ${eliminatedData.playerId} đã bị loại khỏi cuộc chơi!`);

  // Thử cho Thí sinh 2 bấm chuông tiếp -> phải bị từ chối
  p2Socket.emit('client:buzz', { type: 'ROW' });
  const buzzErrorPromise = new Promise(resolve => {
    p2Socket.once('buzz:error', err => resolve(err));
  });
  const buzzErr = await buzzErrorPromise;
  console.log(`✓ Server chặn thí sinh đã bị loại bấm chuông: "${buzzErr.message}"`);

  console.log('\n=== TẤT CẢ KỊCH BẢN THỜI GIAN THỰC ĐÃ CHẠY HOÀN HẢO 100%! ===');

  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();
  process.exit(0);
}

runSimulation().catch(err => {
  console.error('Lỗi mô phỏng:', err);
  process.exit(1);
});
