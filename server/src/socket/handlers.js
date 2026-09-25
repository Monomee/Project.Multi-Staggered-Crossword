/**
 * socket/handlers.js
 * Quản lý các sự kiện Socket.io thời gian thực
 */
export function registerSocketHandlers(io, engine) {
  // Hàm helper broadcast game state tới tất cả client trong room
  const broadcastSync = (room = 'OLYMPIA') => {
    io.to(room).emit('sync_game_state', engine.getState());
  };

  io.on('connection', (socket) => {
    let currentRoom = 'OLYMPIA';
    let currentPlayerId = null;

    // 1. Tham gia phòng chơi (Host hoặc Player)
    socket.on('join_room', ({ roomCode = 'OLYMPIA', playerName, role = 'player', playerId }) => {
      currentRoom = roomCode || 'OLYMPIA';
      currentPlayerId = playerId;
      socket.join(currentRoom);

      if (role === 'player' && playerId) {
        // Cập nhật mapping playerId -> socket.id mới nhất và đưa socket mới vào room
        const player = engine.joinPlayer({
          playerId,
          playerName,
          socketId: socket.id
        });
        console.log(`[Socket] Thí sinh ${player?.name} (${playerId}) kết nối với socket.id: ${socket.id}`);
      } else if (role === 'host') {
        console.log(`[Socket] Host kết nối với socket.id: ${socket.id}`);
      }

      // Gửi snapshot trạng thái hiện tại về cho client vừa kết nối
      socket.emit('sync_game_state', engine.getState());

      // Thông báo cho các client khác trong room cập nhật danh sách người chơi
      socket.to(currentRoom).emit('sync_game_state', engine.getState());
    });

    // 2. Thí sinh bấm chuông (Row hoặc Vertical)
    socket.on('client:buzz', ({ type }) => {
      if (!currentPlayerId) {
        socket.emit('buzz:error', { message: 'Chưa xác thực danh tính thí sinh!' });
        return;
      }

      const result = engine.handleBuzz({ playerId: currentPlayerId, type });
      if (!result.success) {
        socket.emit('buzz:error', { message: result.error });
        return;
      }

      // Nếu bấm hàng dọc: còi báo động khẩn cấp
      if (type === 'VERTICAL') {
        io.to(currentRoom).emit('buzz:vertical_triggered', {
          playerId: result.entry.playerId,
          name: result.entry.name,
          deltaMs: result.entry.deltaMs
        });
      } else if (type === 'ROW') {
        // Cập nhật hàng đợi chuông hàng ngang
        io.to(currentRoom).emit('buzz:row_queue_updated', {
          queue: engine.buzzer.rowQueue
        });
      }

      broadcastSync(currentRoom);
    });

    // 3. Host chọn hàng ngang
    socket.on('host:select_row', ({ rowId }) => {
      const ok = engine.selectRow(rowId);
      if (ok) {
        io.to(currentRoom).emit('buzz:row_queue_updated', { queue: [] });
        broadcastSync(currentRoom);
      }
    });

    // 4. Host mở/khóa quyền bấm chuông hàng ngang
    socket.on('host:toggle_buzzer', ({ isOpen }) => {
      engine.toggleRowBuzzer(isOpen);
      broadcastSync(currentRoom);
    });

    // 5. Host chấm điểm kết quả (Đúng/Sai)
    socket.on('host:judge_result', ({ playerId, type, isCorrect }) => {
      const res = engine.judgeResult({ playerId, type, isCorrect });
      if (res.success) {
        if (type === 'VERTICAL' && !isCorrect) {
          // Bị loại khỏi cuộc chơi
          io.to(currentRoom).emit('game:player_eliminated', { playerId });
        } else if (type === 'ROW' && isCorrect && res.row) {
          // Mở đáp án hàng ngang
          io.to(currentRoom).emit('game:row_revealed', {
            rowId: res.row.id,
            answer: res.row.answer
          });
        }
        broadcastSync(currentRoom);
      }
    });

    // 6. Host bỏ qua lượt ấn nhầm (không phạt)
    socket.on('host:dismiss_buzz', ({ playerId, type }) => {
      engine.dismissBuzz(playerId, type);
      broadcastSync(currentRoom);
    });

    // 7. Host reset hàng đợi chuông
    socket.on('host:reset_buzzer', () => {
      engine.resetBuzzer('ALL');
      io.to(currentRoom).emit('buzz:row_queue_updated', { queue: [] });
      broadcastSync(currentRoom);
    });

    // 8. Host mở trực tiếp đáp án hàng ngang
    socket.on('host:reveal_row', ({ rowId }) => {
      const ok = engine.revealRow(rowId);
      if (ok) {
        const row = engine.rows.find(r => r.id === Number(rowId));
        if (row) {
          io.to(currentRoom).emit('game:row_revealed', {
            rowId: row.id,
            answer: row.answer
          });
        }
        broadcastSync(currentRoom);
      }
    });

    // 9. Host mở trực tiếp từ khóa hàng dọc
    socket.on('host:reveal_vertical', () => {
      engine.revealVertical();
      broadcastSync(currentRoom);
    });

    // 10. Host reset game mới
    socket.on('host:reset_game', () => {
      engine.resetGame();
      broadcastSync(currentRoom);
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', () => {
      const affectedPlayer = engine.disconnectPlayer(socket.id);
      if (affectedPlayer) {
        console.log(`[Socket] Thí sinh ${affectedPlayer.name} (${affectedPlayer.id}) vừa ngắt kết nối socket.`);
        broadcastSync(currentRoom);
      }
    });
  });
}
