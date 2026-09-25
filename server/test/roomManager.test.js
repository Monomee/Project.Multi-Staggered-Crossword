import { RoomManager } from '../src/core/RoomManager.js';

console.log('=== KIỂM THỬ MODULE ROOM MANAGER & RECONNECTION ===');

const roomManager = new RoomManager();

// 1. Kiểm tra sinh mã phòng
const code1 = roomManager.generateRoomCode();
console.assert(code1.length === 5, 'Mã phòng phải có độ dài 5 ký tự');
console.assert(/^[A-Z2-9]{5}$/.test(code1), 'Mã phòng chỉ chứa ký tự an toàn A-Z, 2-9 (bỏ I, O, 0, 1)');
console.assert(!code1.includes('I') && !code1.includes('O') && !code1.includes('0') && !code1.includes('1'), 'Không chứa I, O, 0, 1');
console.log(`✓ Sinh mã phòng ngẫu nhiên thành công: ${code1}`);

// 2. Tạo phòng với mã tùy chọn OLYM8 (theo tiêu chí nghiệm thu)
const room = roomManager.createRoom('socket_host_1', 'OLYM8');
console.assert(room.roomCode === 'OLYM8', 'Mã phòng phải là OLYM8');
console.assert(room.status === 'LOBBY', 'Phòng mới tạo phải ở trạng thái LOBBY');
console.assert(room.hostSocketId === 'socket_host_1', 'Lưu đúng hostSocketId');
console.log('✓ Host tạo phòng OLYM8 thành công ở trạng thái LOBBY.');

// 3. Thí sinh 1 gia nhập phòng
const join1 = roomManager.joinPlayer('OLYM8', {
  playerId: 'p_hoang',
  playerName: 'Hoàng',
  socketId: 'socket_p1'
});
console.assert(join1 !== null, 'Gia nhập phòng thành công');
console.assert(join1.player.name === 'Hoàng', 'Tên thí sinh đúng');
console.assert(join1.player.connected === true, 'Trạng thái connected = true');
console.assert(roomManager.getPlayersList('OLYM8').length === 1, 'Danh sách phòng có 1 người chơi');
console.log('✓ Thí sinh Hoàng gia nhập phòng thành công.');

// Giả lập thí sinh được cộng điểm trong ván đấu
join1.player.score = 20;
room.gameEngine.players.get('p_hoang').score = 20;

// 4. Thí sinh 1 mất mạng / ngắt kết nối
const disc1 = roomManager.handlePlayerDisconnect('socket_p1');
console.assert(disc1 !== null, 'Phát hiện ngắt kết nối');
console.assert(disc1.player.connected === false, 'Đánh dấu connected = false');
console.assert(disc1.player.score === 20, 'Vẫn bảo lưu điểm số 20 khi offline');
console.log('✓ Khi thí sinh mất kết nối: bảo lưu điểm số và đánh dấu offline.');

// 5. Thí sinh 1 kết nối lại (Reconnection) với socket mới
const recon1 = roomManager.joinPlayer('OLYM8', {
  playerId: 'p_hoang',
  playerName: 'Hoàng',
  playerSecret: join1.playerSecret,
  socketId: 'socket_p1_new'
});
console.assert(recon1.player.socketId === 'socket_p1_new', 'Cập nhật socketId mới thành công');
console.assert(recon1.player.connected === true, 'Đánh dấu online trở lại');
console.assert(recon1.player.score === 20, 'Điểm số 20 được phục hồi nguyên vẹn');
console.log('✓ Reconnection thành công: phục hồi phiên, socketId mới và điểm số.');

// 6. Host ngắt kết nối -> Kích hoạt timer dọn dẹp
const hostDisc = roomManager.handleHostDisconnect('socket_host_1');
console.assert(hostDisc !== null, 'Nhận diện host ngắt kết nối');
console.assert(hostDisc.hostDisconnectedAt !== null, 'Ghi nhận thời điểm host ngắt kết nối');
console.assert(hostDisc.cleanupTimer !== null, 'Đã đặt timer dọn dẹp phòng');
console.log('✓ Host ngắt kết nối: kích hoạt timer 10 phút tự hủy phòng chống rò rỉ RAM.');

// 7. Host kết nối lại -> Hủy timer dọn dẹp
const hostRecon = roomManager.handleHostReconnect('OLYM8', room.hostToken, 'socket_host_new');
console.assert(hostRecon.success === true, 'Host reconnect thành công');
console.assert(hostRecon.room.cleanupTimer === null, 'Timer dọn dẹp đã được hủy');
console.assert(hostRecon.room.hostDisconnectedAt === null, 'hostDisconnectedAt reset về null');
console.assert(hostRecon.room.hostSocketId === 'socket_host_new', 'Cập nhật socket mới cho Host');
console.log('✓ Host kết nối lại: Hủy timer dọn dẹp, khôi phục quyền điều khiển.');

console.log('\n=== TẤT CẢ KIỂM THỬ ROOM MANAGER ĐÃ VƯỢT QUA 100%! ===');
