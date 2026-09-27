/**
 * socket/handlers.js
 * Quản lý các sự kiện Socket.io thời gian thực kết nối với RoomManager
 * Sử dụng Higher-Order Guard Wrapper xác thực HostToken và PlayerSecret chuẩn mực
 */
export function registerSocketHandlers(io, roomManager) {
  // Helper broadcast game state tới tất cả client trong room
  const broadcastSync = (roomCode) => {
    if (!roomCode) return;
    const fullState = roomManager.getFullRoomState(roomCode);
    if (fullState) {
      io.to(roomCode).emit('sync_game_state', fullState);
      io.to(roomCode).emit('room:players_updated', {
        players: roomManager.getPlayersList(roomCode)
      });
    }
  };

  io.on('connection', (socket) => {
    /**
     * Higher-Order Function (Guard Wrapper):
     * Tự động validate quyền Host dựa trên roomCode và hostToken trước khi cho phép chạy handler nghiệp vụ
     */
    const withHostAuth = (handler, autoBroadcast = true) => (data = {}) => {
      const code = (data.roomCode || socket.data.roomCode || '').toUpperCase();
      const token = data.hostToken || socket.data.hostToken;
      const room = roomManager.getRoom(code);

      if (!room) {
        socket.emit('action_error', { message: `Phòng ${code} không tồn tại!` });
        return;
      }

      if (!roomManager.verifyHost(code, token)) {
        socket.emit('action_error', { message: 'Quyền điều khiển bị từ chối: Token Host không hợp lệ!' });
        return;
      }

      // Thực thi handler nghiệp vụ đã được bảo vệ
      handler(room, data);

      if (autoBroadcast) {
        broadcastSync(code);
      }
    };

    // 1. Host tạo phòng chơi mới (Trả về cả roomCode lẫn hostToken bí mật)
    socket.on('host:create_room', ({ customRoomCode } = {}) => {
      const room = roomManager.createRoom(socket.id, customRoomCode);
      socket.data.roomCode = room.roomCode;
      socket.data.role = 'host';
      socket.data.hostToken = room.hostToken;
      socket.join(room.roomCode);

      socket.emit('room_created', {
        roomCode: room.roomCode,
        hostToken: room.hostToken
      });
      socket.emit('sync_game_state', roomManager.getFullRoomState(room.roomCode));
      console.log(`[Socket] Host tạo phòng ${room.roomCode} với hostToken an toàn.`);
    });

    // 2. Tham gia phòng chơi (Host reconnect xác thực HostToken, Player join/reconnect xác thực PlayerSecret)
    socket.on('join_room', ({ roomCode, playerName, role = 'player', playerId, playerSecret, hostToken }) => {
      const code = (roomCode || socket.data.roomCode || '').trim().toUpperCase();
      if (!code) {
        socket.emit('join_error', { message: 'Vui lòng nhập mã phòng!' });
        return;
      }

      const room = roomManager.getRoom(code);
      if (!room) {
        socket.emit('join_error', { message: `Phòng thi đấu "${code}" không tồn tại hoặc đã hết hạn!` });
        return;
      }

      socket.data.roomCode = code;
      socket.data.role = role;

      if (role === 'host') {
        const tokenToVerify = hostToken || socket.data.hostToken;
        const reconnectRes = roomManager.handleHostReconnect(code, tokenToVerify, socket.id);
        if (!reconnectRes.success) {
          socket.emit('join_error', { message: reconnectRes.error });
          return;
        }

        socket.data.hostToken = tokenToVerify;
        socket.join(code);
        socket.emit('sync_game_state', roomManager.getFullRoomState(code));
        console.log(`[Socket] Host xác thực thành công và kết nối phòng ${code}`);
      } else {
        // Thí sinh gia nhập hoặc phục hồi phiên
        if (!playerId) {
          socket.emit('join_error', { message: 'Thiếu định danh thí sinh (playerId)!' });
          return;
        }

        const joinResult = roomManager.joinPlayer(code, {
          playerId,
          playerName,
          playerSecret,
          socketId: socket.id
        });

        if (joinResult.error) {
          socket.emit('join_error', { message: joinResult.error });
          return;
        }

        socket.data.playerId = playerId;
        socket.data.playerSecret = joinResult.playerSecret;
        socket.join(code);

        // Gửi trả playerSecret để Client lưu vào localStorage theo mã phòng
        socket.emit('player_authenticated', {
          roomCode: code,
          playerId: joinResult.player.id,
          playerSecret: joinResult.playerSecret
        });

        socket.emit('sync_game_state', roomManager.getFullRoomState(code));
        broadcastSync(code);
        console.log(`[Socket] Thí sinh ${joinResult.player.name} (${playerId}) xác thực thành công vào room ${code}`);
      }
    });

    // 3. Thí sinh bấm chuông (Row hoặc Vertical)
    socket.on('client:buzz', ({ type, roomCode }) => {
      const code = (roomCode || socket.data.roomCode || '').toUpperCase();
      const playerId = socket.data.playerId;
      const room = roomManager.getRoom(code);

      if (!room || !playerId) {
        socket.emit('buzz:error', { message: 'Phiên thi đấu không hợp lệ!' });
        return;
      }

      const result = room.gameEngine.handleBuzz({ playerId, type });
      if (!result.success) {
        socket.emit('buzz:error', { message: result.error });
        return;
      }

      if (type === 'VERTICAL') {
        io.to(code).emit('buzz:vertical_triggered', {
          playerId: result.entry.playerId,
          name: result.entry.name,
          deltaMs: result.entry.deltaMs
        });
      } else if (type === 'ROW') {
        io.to(code).emit('buzz:row_queue_updated', {
          queue: room.gameEngine.buzzer.rowQueue
        });
      }

      broadcastSync(code);
    });

    // 4. Các sự kiện điều khiển của Host (Được bảo vệ 100% bằng withHostAuth Guard Wrapper)
    socket.on('host:start_game', withHostAuth((room) => {
      room.status = 'PLAYING';
      console.log(`[Socket] Trận đấu phòng ${room.roomCode} chính thức bắt đầu (status: PLAYING)`);
    }));

    socket.on('host:select_row', withHostAuth((room, { rowId }) => {
      const ok = room.gameEngine.selectRow(rowId);
      if (ok) {
        io.to(room.roomCode).emit('buzz:row_queue_updated', { queue: [] });
      }
    }));

    socket.on('host:toggle_buzzer', withHostAuth((room, { isOpen }) => {
      room.gameEngine.toggleRowBuzzer(isOpen);
    }));

    socket.on('host:judge_result', withHostAuth((room, { playerId, type, isCorrect, rowId }) => {
      const res = room.gameEngine.judgeResult({ playerId, type, isCorrect, rowId });
      if (res.success) {
        if (type === 'VERTICAL' && !isCorrect) {
          io.to(room.roomCode).emit('game:player_eliminated', { playerId });
        } else if (type === 'ROW' && isCorrect && res.row) {
          io.to(room.roomCode).emit('game:row_revealed', {
            rowId: res.row.id,
            answer: res.row.answer
          });
        }
        // Phát sự kiện cập nhật các ô mảnh ghép hình ảnh bí mật
        io.to(room.roomCode).emit('game:tiles_updated', {
          revealedTiles: Array.from(room.gameEngine.revealedTiles)
        });
      }
    }));

    socket.on('host:dismiss_buzz', withHostAuth((room, { playerId, type }) => {
      room.gameEngine.dismissBuzz(playerId, type);
    }));

    socket.on('host:reset_buzzer', withHostAuth((room) => {
      room.gameEngine.resetBuzzer('ALL');
      io.to(room.roomCode).emit('buzz:row_queue_updated', { queue: [] });
    }));

    socket.on('host:reveal_row', withHostAuth((room, { rowId }) => {
      const ok = room.gameEngine.revealRow(rowId);
      if (ok) {
        const row = room.gameEngine.rows.find(r => r.id === Number(rowId));
        if (row) {
          io.to(room.roomCode).emit('game:row_revealed', {
            rowId: row.id,
            answer: row.answer
          });
        }
        io.to(room.roomCode).emit('game:tiles_updated', {
          revealedTiles: Array.from(room.gameEngine.revealedTiles)
        });
      }
    }));

    socket.on('host:reveal_vertical', withHostAuth((room) => {
      room.gameEngine.revealVertical();
      io.to(room.roomCode).emit('game:tiles_updated', {
        revealedTiles: Array.from(room.gameEngine.revealedTiles)
      });
    }));

    socket.on('host:reset_game', withHostAuth((room) => {
      room.gameEngine.resetGame();
      room.status = 'LOBBY';
      io.to(room.roomCode).emit('game:tiles_updated', {
        revealedTiles: []
      });
    }));

    // 5. Xử lý ngắt kết nối (Disconnect)
    socket.on('disconnect', () => {
      if (socket.data.role === 'host') {
        const room = roomManager.handleHostDisconnect(socket.id);
        if (room) {
          console.log(`[Socket] Host phòng ${room.roomCode} đã ngắt kết nối.`);
        }
      } else {
        const res = roomManager.handlePlayerDisconnect(socket.id);
        if (res) {
          broadcastSync(res.room.roomCode);
        }
      }
    });
  });
}
