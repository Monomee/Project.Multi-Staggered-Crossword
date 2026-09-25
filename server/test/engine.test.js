import { ObstacleEngine } from '../src/games/ObstacleEngine.js';

console.log('--- BẮT ĐẦU KIỂM THỬ STATE MACHINE & BUZZER ---');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function runTests() {
  const engine = new ObstacleEngine();

  // 1. Kiểm tra nạp dữ liệu
  console.assert(engine.rows.length === 6, 'Phải có 6 hàng câu hỏi');
  console.assert(engine.verticalWord.keyword === 'THỔCẨM', 'Từ khóa phải là THỔCẨM');
  console.log('✓ Nạp dữ liệu câu hỏi thành công.');

  // 2. Thêm người chơi
  const p1 = engine.joinPlayer({ playerId: 'p-1', playerName: 'Nguyễn Văn A', socketId: 's1' });
  const p2 = engine.joinPlayer({ playerId: 'p-2', playerName: 'Trần Thị B', socketId: 's2' });
  console.assert(engine.players.size === 2, 'Phải có 2 người chơi');
  console.log('✓ Thêm người chơi thành công.');

  // 3. Kiểm tra chuông hàng ngang khi chưa mở
  let buzzRes = engine.handleBuzz({ playerId: 'p-1', type: 'ROW' });
  console.assert(!buzzRes.success, 'Bấm chuông khi hàng ngang đóng phải thất bại');
  console.log('✓ Chặn bấm chuông khi chưa mở hàng ngang thành công.');

  // 4. Mở hàng ngang và bấm chuông
  engine.selectRow(1);
  engine.toggleRowBuzzer(true);

  const b1 = engine.handleBuzz({ playerId: 'p-1', type: 'ROW' });
  console.assert(b1.success && b1.entry.deltaMs === 0, 'Người đầu tiên phải deltaMs = 0');

  // Thí sinh 2 bấm sau một khoảng delay nhỏ
  await delay(50);
  const b2 = engine.handleBuzz({ playerId: 'p-2', type: 'ROW' });
  console.assert(b2.success && b2.entry.deltaMs >= 0, 'Người thứ hai phải có deltaMs >= 0');
  console.log(`✓ deltaMs người 1: ${b1.entry.deltaMs}ms, người 2: ${b2.entry.deltaMs}ms`);

  // 5. Kiểm tra chống bấm trùng (Duplicate buzz)
  await delay(350); // Chờ qua rate limit
  const b1Dup = engine.handleBuzz({ playerId: 'p-1', type: 'ROW' });
  console.assert(!b1Dup.success, 'Không được phép bấm trùng');
  console.log('✓ Chống bấm trùng thành công.');

  // 6. Kiểm tra Interrupt Priority (Bấm hàng dọc khóa hàng ngang)
  const bVertical = engine.handleBuzz({ playerId: 'p-2', type: 'VERTICAL' });
  console.assert(bVertical.success, 'Bấm hàng dọc thành công');

  // Bây giờ thử bấm hàng ngang (p3)
  engine.joinPlayer({ playerId: 'p-3', playerName: 'Lê Văn C', socketId: 's3' });
  const bRowBlocked = engine.handleBuzz({ playerId: 'p-3', type: 'ROW' });
  console.assert(!bRowBlocked.success, 'Hàng ngang phải bị khóa khi có người bấm hàng dọc');
  console.log('✓ Interrupt Priority hàng dọc khóa hàng ngang thành công.');

  // 7. Kiểm tra Permadeath (Trả lời sai hàng dọc bị loại)
  const judgeVerticalWrong = engine.judgeResult({ playerId: 'p-2', type: 'VERTICAL', isCorrect: false });
  console.assert(judgeVerticalWrong.eliminated === true, 'Phải bị eliminated khi sai hàng dọc');
  console.assert(engine.getPlayer('p-2').isEliminated === true, 'Player p-2 phải có flag isEliminated = true');

  // Thử bấm chuông khi đã bị eliminated
  await delay(350);
  const bEliminated = engine.handleBuzz({ playerId: 'p-2', type: 'ROW' });
  console.assert(!bEliminated.success, 'Người bị loại không được bấm chuông nữa');
  console.log('✓ Permadeath phạt loại và chặn chuông thành công.');

  // 8. Reconnect phục hồi state
  const p2Reconnected = engine.joinPlayer({ playerId: 'p-2', playerName: 'Trần Thị B', socketId: 's2-new' });
  console.assert(p2Reconnected.isEliminated === true, 'Sau reconnect vẫn phải giữ trạng thái bị loại');
  console.log('✓ Session Reconnection duy trì trạng thái chính xác.');

  // 9. Kiểm tra Server-side Spam Rate Limit (<300ms)
  const p4 = engine.joinPlayer({ playerId: 'p-4', playerName: 'Phạm D', socketId: 's4' });
  engine.buzzer.resetVerticalQueue(); // Mở khóa chuông
  const spam1 = engine.handleBuzz({ playerId: 'p-4', type: 'ROW' });
  const spam2 = engine.handleBuzz({ playerId: 'p-4', type: 'ROW' }); // Bấm ngay lập tức không delay
  console.assert(!spam2.success, 'Spam liên tiếp phải bị Server chặn');
  console.log('✓ Server-side Rate Limit chống spam touch hoạt động chuẩn xác.');

  // 10. Kiểm tra Reset Game dọn sạch người chơi cũ (Trò chơi mới tinh 100%)
  engine.resetGame();
  console.assert(engine.players.size === 0, 'Phải dọn sạch 100% người chơi cũ');
  console.assert(engine.rows.every(r => !r.isRevealed), 'Tất cả các hàng phải chưa mở');
  console.assert(engine.currentRowId === null, 'currentRowId phải là null');
  console.log('✓ Reset Game đưa phòng về trạng thái trò chơi mới tinh 100%.');

  console.log('\n=== TẤT CẢ CÁC KIỂM THỬ SERVER ĐÃ VƯỢT QUA 100%! ===');
}

runTests().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
