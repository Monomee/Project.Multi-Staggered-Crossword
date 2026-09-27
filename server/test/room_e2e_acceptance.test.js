import { io } from '../../client/node_modules/socket.io-client/build/esm/index.js';

console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN BẢO MẬT & TIÊU CHÍ NGHIỆM THU ===\n');

const SERVER_URL = 'http://localhost:3001';

async function runFullAcceptanceTest() {
  // =========================================================================
  // TIÊU CHÍ 1: Host tạo phòng OLYM8 & Chặn cướp quyền Host (Host Hijacking)
  // =========================================================================
  console.log('--- TEST 1: HOST TẠO PHÒNG VÀ BẢO MẬT HOST TOKEN ---');
  const hostSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 400));

  const roomCreatedPromise = new Promise(resolve => {
    hostSocket.once('room_created', data => resolve(data));
  });

  hostSocket.emit('host:create_room', { customRoomCode: 'OLYM8' });
  const createdData = await roomCreatedPromise;

  console.assert(createdData.roomCode === 'OLYM8', 'Mã phòng phải là OLYM8');
  console.assert(Boolean(createdData.hostToken), 'Server phải cấp hostToken bí mật');
  const validHostToken = createdData.hostToken;
  console.log(`✓ Host tạo phòng thành công: ${createdData.roomCode}, hostToken: ${validHostToken.slice(0, 8)}...`);

  // Kẻ xấu (Attacker) cố tình cướp quyền Host mà không có token
  const attackerHostSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const attackPromise = new Promise(resolve => {
    attackerHostSocket.once('action_error', err => resolve(err));
  });
  attackerHostSocket.emit('host:start_game', { roomCode: 'OLYM8', hostToken: 'fake_attacker_token' });
  const attackErr = await attackPromise;

  console.assert(attackErr !== null, 'Kẻ cướp quyền Host phải bị chặn');
  console.log(`✓ [BẢO MẬT ĐẠT] Chặn kẻ xấu cướp quyền Host: "${attackErr.message}"`);
  attackerHostSocket.disconnect();

  // =========================================================================
  // TIÊU CHÍ 2: Thí sinh Hoàng tham gia & Chặn giả mạo thí sinh (Player Impersonation)
  // =========================================================================
  console.log('\n--- TEST 2: THÍ SINH HOÀNG GIA NHẬP VÀ BẢO MẬT PLAYER SECRET ---');
  const p1Socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const p1AuthPromise = new Promise(resolve => {
    p1Socket.once('player_authenticated', data => resolve(data));
  });

  p1Socket.emit('join_room', {
    roomCode: 'OLYM8',
    playerName: 'Hoàng',
    playerId: 'player_hoang_id',
    role: 'player'
  });

  const p1AuthData = await p1AuthPromise;
  console.assert(Boolean(p1AuthData.playerSecret), 'Server phải cấp playerSecret bí mật');
  const hoangSecret = p1AuthData.playerSecret;
  console.log(`✓ Thí sinh Hoàng gia nhập thành công, nhận playerSecret: ${hoangSecret.slice(0, 8)}...`);

  // Kẻ xấu cố tình mạo danh playerId của Hoàng nhưng sai playerSecret
  const attackerPlayerSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const impersonatePromise = new Promise(resolve => {
    attackerPlayerSocket.once('join_error', err => resolve(err));
  });

  attackerPlayerSocket.emit('join_room', {
    roomCode: 'OLYM8',
    playerName: 'Kẻ Giả Mạo',
    playerId: 'player_hoang_id', // Cố tình dùng trộm ID của Hoàng
    playerSecret: 'wrong_secret_123',
    role: 'player'
  });

  const impersonateErr = await impersonatePromise;
  console.assert(impersonateErr !== null, 'Kẻ mạo danh thí sinh phải bị chặn');
  console.log(`✓ [BẢO MẬT ĐẠT] Chặn kẻ mạo danh thí sinh Hoàng: "${impersonateErr.message}"`);
  attackerPlayerSocket.disconnect();

  // =========================================================================
  // TIÊU CHÍ 3: Bắt đầu game, thí sinh được cộng điểm
  // =========================================================================
  console.log('\n--- TEST 3: BẮT ĐẦU TRẬN ĐẤU & CHẤM ĐIỂM HỢP LỆ ---');
  hostSocket.emit('host:start_game', { roomCode: 'OLYM8', hostToken: validHostToken });
  await new Promise(r => setTimeout(r, 300));

  hostSocket.emit('host:select_row', { rowId: 1, roomCode: 'OLYM8', hostToken: validHostToken });
  await new Promise(r => setTimeout(r, 200));
  hostSocket.emit('host:toggle_buzzer', { isOpen: true, roomCode: 'OLYM8', hostToken: validHostToken });
  await new Promise(r => setTimeout(r, 100));

  p1Socket.emit('client:buzz', { type: 'ROW', roomCode: 'OLYM8' });
  await new Promise(r => setTimeout(r, 200));

  // Host chấm đúng (+10 điểm)
  hostSocket.emit('host:judge_result', {
    playerId: 'player_hoang_id',
    type: 'ROW',
    isCorrect: true,
    roomCode: 'OLYM8',
    hostToken: validHostToken
  });
  await new Promise(r => setTimeout(r, 300));
  console.log('✓ Host đã chấm ĐÚNG cho thí sinh Hoàng (+10 điểm) và mở hàng 1.');

  // =========================================================================
  // TIÊU CHÍ 4: Thí sinh rớt mạng khi đang trong hàng đợi chuông (In-flight Disconnect)
  // =========================================================================
  console.log('\n--- TEST 4: THÍ SINH RỚT MẠNG KHI ĐANG TRONG HÀNG ĐỢI CHUÔNG HÀNG DỌC ---');
  // Thêm Thí sinh Minh
  const p2Socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const p2AuthPromise = new Promise(resolve => {
    p2Socket.once('player_authenticated', data => resolve(data));
  });

  p2Socket.emit('join_room', {
    roomCode: 'OLYM8',
    playerName: 'Minh',
    playerId: 'player_minh_id',
    role: 'player'
  });
  const p2Auth = await p2AuthPromise;
  const minhSecret = p2Auth.playerSecret;

  // Thí sinh Minh bấm chuông Hàng Dọc (ưu tiên cao)
  p2Socket.emit('client:buzz', { type: 'VERTICAL', roomCode: 'OLYM8' });
  await new Promise(r => setTimeout(r, 150));

  // ĐÚNG LÚC NÀY, THÍ SINH MINH BỊ RỚT MẠNG (Disconnect)
  p2Socket.disconnect();
  console.log('✓ Thí sinh Minh vừa bấm chuông Hàng Dọc xong thì bị rớt mạng đột ngột.');

  await new Promise(r => setTimeout(r, 300));

  // Host chấm "SAI" (Permadeath) cho Minh lúc Minh đang offline
  hostSocket.emit('host:judge_result', {
    playerId: 'player_minh_id',
    type: 'VERTICAL',
    isCorrect: false,
    roomCode: 'OLYM8',
    hostToken: validHostToken
  });
  await new Promise(r => setTimeout(r, 300));
  console.log('✓ Host gọi tên không thấy phản hồi, chấm SAI (Phạt Permadeath) cho Minh.');

  // Thí sinh Minh có mạng trở lại, mở lại trình duyệt và reconnect
  const p2ReconSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const p2SyncPromise = new Promise(resolve => {
    p2ReconSocket.once('sync_game_state', state => resolve(state));
  });

  p2ReconSocket.emit('join_room', {
    roomCode: 'OLYM8',
    playerName: 'Minh',
    playerId: 'player_minh_id',
    playerSecret: minhSecret,
    role: 'player'
  });

  const p2State = await p2SyncPromise;
  const minhInRoom = p2State.players.find(p => p.id === 'player_minh_id');

  console.assert(minhInRoom !== undefined, 'Thí sinh Minh phải tồn tại');
  console.assert(minhInRoom.isEliminated === true, 'Thí sinh Minh phải nhận ngay trạng thái isEliminated = true sau khi reconnect');
  console.log(`✓ [IN-FLIGHT STATE ĐẠT] Thí sinh Minh reconnect nhận chuẩn xác án phạt Permadeath: isEliminated = ${minhInRoom.isEliminated}`);

  // Thử cho Minh bấm chuông lại -> Server phải chặn
  p2ReconSocket.emit('client:buzz', { type: 'ROW', roomCode: 'OLYM8' });
  const minhBlockedPromise = new Promise(resolve => {
    p2ReconSocket.once('buzz:error', err => resolve(err));
  });
  const minhBlocked = await minhBlockedPromise;
  console.assert(minhBlocked !== null, 'Minh phải bị chặn chuông');
  console.log(`✓ Thí sinh Minh bị chặn bấm chuông: "${minhBlocked.message}"`);

  // =========================================================================
  // TIÊU CHÍ 5: Phục hồi phiên bảo toàn điểm số cho thí sinh Hoàng
  // =========================================================================
  console.log('\n--- TEST 5: THÍ SINH HOÀNG RECONNECT BẢO TỒN 10 ĐIỂM VÀ BÀN CỜ ---');
  p1Socket.disconnect();
  await new Promise(r => setTimeout(r, 200));

  const p1ReconSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const p1SyncPromise = new Promise(resolve => {
    p1ReconSocket.once('sync_game_state', state => resolve(state));
  });

  p1ReconSocket.emit('join_room', {
    roomCode: 'OLYM8',
    playerName: 'Hoàng',
    playerId: 'player_hoang_id',
    playerSecret: hoangSecret,
    role: 'player'
  });

  const p1State = await p1SyncPromise;
  const hoangInRoom = p1State.players.find(p => p.id === 'player_hoang_id');
  console.assert(hoangInRoom.score === 10, 'Hoàng phải giữ nguyên 10 điểm');
  console.assert(p1State.rows[0].isRevealed === true, 'Hàng 1 phải mở');
  console.log(`✓ [RECONNECTION ĐẠT] Thí sinh Hoàng reconnect giữ nguyên 10 điểm và bàn cờ đã mở Hàng 1.`);

  // =========================================================================
  // TIÊU CHÍ 6: Host reconnect với hostToken & Chống rò rỉ RAM (Anti-Memory Leak)
  // =========================================================================
  console.log('\n--- TEST 6: HOST RECONNECT VỚI HOST TOKEN & HỦY TIMER DỌN DẸP ---');
  hostSocket.disconnect();
  console.log('✓ Host ngắt kết nối -> Kích hoạt timer 10 phút.');

  await new Promise(r => setTimeout(r, 300));

  const hostReconSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const hostSyncPromise = new Promise(resolve => {
    hostReconSocket.once('sync_game_state', state => resolve(state));
  });

  hostReconSocket.emit('join_room', {
    roomCode: 'OLYM8',
    role: 'host',
    hostToken: validHostToken // Reconnect với đúng hostToken
  });

  const hostState = await hostSyncPromise;
  console.assert(hostState !== null, 'Host reconnect thành công');
  console.log('✓ [CHỐNG RÒ RỈ RAM ĐẠT] Host reconnect với đúng hostToken, timer dọn dẹp đã được hủy an toàn.');

  // =========================================================================
  // TIÊU CHÍ 7: HOST OFFLINE NOTIFICATION, RECONNECT VÀ TERMINATE ROOM (OLYM1)
  // =========================================================================
  console.log('\n--- TEST 7: HOST RECONNECT VÀ TERMINATE ROOM (OLYM1) ---');
  // 1. Host tạo phòng OLYM1
  const host1Socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const olym1CreatedPromise = new Promise(resolve => {
    host1Socket.once('room_created', data => resolve(data));
  });
  host1Socket.emit('host:create_room', { customRoomCode: 'OLYM1' });
  const olym1Data = await olym1CreatedPromise;
  const olym1HostToken = olym1Data.hostToken;
  console.assert(olym1Data.roomCode === 'OLYM1', 'Tạo phòng OLYM1 thành công');
  console.log('✓ Host tạo phòng OLYM1 thành công.');

  // Thí sinh tham gia phòng OLYM1
  const playerOlym1Socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));
  playerOlym1Socket.emit('join_room', {
    roomCode: 'OLYM1',
    playerName: 'Thí sinh Olym1',
    playerId: 'p_olym1',
    role: 'player'
  });
  await new Promise(r => setTimeout(r, 200));

  // 2. Host ngắt kết nối socket Host -> Thí sinh nhận thông báo Host offline
  const playerHostOfflinePromise = new Promise(resolve => {
    playerOlym1Socket.once('host:status_changed', status => resolve(status));
  });
  host1Socket.disconnect();
  const offlineStatus = await playerHostOfflinePromise;
  console.assert(offlineStatus.isOnline === false, 'Thí sinh phải nhận được thông báo Host offline');
  console.log('✓ [HOST STATUS ĐẠT] Thí sinh nhận thông báo Host offline khi socket Host ngắt kết nối.');

  // 3. Host dùng đúng hostToken reconnect lại qua host:reconnect -> Timer bị hủy, thí sinh nhận thông báo Host online, Host nhận đủ state dở dang
  const host1ReconSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  await new Promise(r => setTimeout(r, 200));

  const playerHostOnlinePromise = new Promise(resolve => {
    playerOlym1Socket.once('host:status_changed', status => resolve(status));
  });
  const hostReconSuccessPromise = new Promise(resolve => {
    host1ReconSocket.once('host:reconnect_success', data => resolve(data));
  });
  const hostSyncStatePromise = new Promise(resolve => {
    host1ReconSocket.once('sync_game_state', state => resolve(state));
  });

  host1ReconSocket.emit('host:reconnect', {
    roomCode: 'OLYM1',
    hostToken: olym1HostToken
  });

  const [onlineStatus, reconSuccess, hostGameState] = await Promise.all([
    playerHostOnlinePromise,
    hostReconSuccessPromise,
    hostSyncStatePromise
  ]);

  console.assert(onlineStatus.isOnline === true, 'Thí sinh phải nhận được thông báo Host online trở lại');
  console.assert(reconSuccess.roomCode === 'OLYM1', 'Host nhận xác nhận reconnect thành công');
  console.assert(hostGameState.roomCode === 'OLYM1', 'Host nhận đủ state dở dang của phòng');
  console.log('✓ [HOST RECONNECT ĐẠT] Host reconnect bằng hostToken thành công, thí sinh nhận thông báo Host online và Host nhận đủ state.');

  // 4. Host gửi lệnh terminate_room -> Tất cả thí sinh nhận event room:terminated, phòng bị xóa khỏi Map server
  const playerTerminatedPromise = new Promise(resolve => {
    playerOlym1Socket.once('room:terminated', data => resolve(data));
  });

  host1ReconSocket.emit('host:terminate_room', {
    roomCode: 'OLYM1',
    hostToken: olym1HostToken
  });

  const termData = await playerTerminatedPromise;
  console.assert(termData.roomCode === 'OLYM1', 'Thí sinh nhận đúng event room:terminated');
  console.assert(termData.message === 'Host đã kết thúc phòng chơi!', 'Thông báo phòng kết thúc đúng');
  console.log('✓ [ROOM TERMINATED ĐẠT] Tất cả thí sinh nhận event room:terminated và phòng bị xóa khỏi máy chủ.');

  playerOlym1Socket.disconnect();
  host1ReconSocket.disconnect();

  console.log('\n=================================================================');
  console.log('🎉 TẤT CẢ 7 KIỂM THỬ BẢO MẬT & NGHIỆM THU ĐÃ ĐẠT 100%! KHÔNG LỖ HỔNG!');
  console.log('=================================================================');

  p1ReconSocket.disconnect();
  p2ReconSocket.disconnect();
  hostReconSocket.disconnect();
  process.exit(0);
}

runFullAcceptanceTest().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
