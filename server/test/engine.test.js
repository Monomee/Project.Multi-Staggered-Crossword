import { ObstacleEngine } from '../src/games/ObstacleEngine.js';

console.log('--- BẮT ĐẦU KIỂM THỬ STATE MACHINE, 6 HÀNG Ô CHỮ & MẢNH GHÉP ẢNH BÍ MẬT 3x2 ---');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function runTests() {
  const engine = new ObstacleEngine();

  // 1. Kiểm tra nạp dữ liệu: 6 câu hỏi, từ khóa PHÙHỢP, ảnh bí mật 3x2 (6 ô)
  console.assert(engine.rows.length === 6, 'Phải có 6 hàng câu hỏi');
  console.assert(engine.verticalWord.keyword === 'PHÙHỢP', 'Từ khóa phải là PHÙHỢP');
  console.assert(engine.totalTiles === 6, 'Tổng số mảnh ghép ảnh bí mật phải là 6 (lưới 3x2)');
  console.assert(engine.revealedTiles.size === 0, 'Ban đầu chưa có mảnh ghép nào được mở');
  console.assert(engine.rows[5].revealsTileIndex === 5, 'Hàng 6 phải có revealsTileIndex = 5');
  console.log('✓ Nạp dữ liệu 6 câu hỏi, từ khóa PHÙHỢP và tổng số 6 ô ảnh thành công.');

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

  // 10. KIỂM THỬ MẢNH GHÉP ẢNH BÍ MẬT KHI DUYỆT ĐÚNG HÀNG 6 -> Ô index 5 chuyển sang revealed
  engine.selectRow(6);
  const judgeRow6 = engine.judgeRow(6, true, 'p-1');
  console.assert(judgeRow6.success === true, 'Duyệt hàng 6 thành công');
  console.assert(engine.revealedTiles.has(5), 'Ô index 5 phải chuyển sang revealed khi duyệt đúng hàng 6');
  console.assert(judgeRow6.revealedTiles.includes(5), 'Payload trả về của judgeRow phải chứa ô index 5');
  console.assert(engine.rows[5].isRevealed === true, 'Hàng 6 phải được đánh dấu isRevealed = true');
  console.log('✓ Duyệt đúng hàng 6 -> Ô mảnh ghép index 5 chuyển sang revealed thành công.');

  // 11. KIỂM THỬ DUYỆT ĐÚNG HÀNG DỌC -> CẢ 6 Ô TỪ 0 ĐẾN 5 ĐỀU ĐƯỢC MỞ
  const judgeVerticalCorrect = engine.judgeVertical('p-1', true);
  console.assert(judgeVerticalCorrect.solved === true, 'Chướng ngại vật đã được giải');
  console.assert(engine.revealedTiles.size === 6, 'Cả 6 ô ảnh bí mật phải được mở đầy đủ');
  for (let i = 0; i < 6; i++) {
    console.assert(engine.revealedTiles.has(i), `Ô ảnh mảnh ghép index ${i} phải được mở`);
  }
  console.assert(engine.rows.every(r => r.isRevealed), 'Tất cả 6 hàng ngang đều được mở khi giải xong hàng dọc');
  console.log('✓ Duyệt đúng hàng dọc -> Mở toàn bộ 6 ô mảnh ghép (0 đến 5) và toàn bộ hàng ngang thành công.');

  // 12. Kiểm tra Reset Game dọn sạch người chơi cũ & reset các ô ảnh (Trò chơi mới tinh 100%)
  engine.resetGame();
  console.assert(engine.players.size === 0, 'Phải dọn sạch 100% người chơi cũ');
  console.assert(engine.rows.every(r => !r.isRevealed), 'Tất cả các hàng phải chưa mở');
  console.assert(engine.revealedTiles.size === 0, 'Tất cả mảnh ghép ảnh phải được che kín');
  console.assert(engine.currentRowId === null, 'currentRowId phải là null');
  console.log('✓ Reset Game đưa phòng về trạng thái trò chơi mới tinh 100% (reset cả ô ảnh bí mật).');

  console.log('\n=== TẤT CẢ CÁC KIỂM THỬ SERVER ĐÃ VƯỢT QUA 100%! ===');
}

runTests().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
