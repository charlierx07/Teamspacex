import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, CLIENT_URL } from '../config/constants.js';
import { User } from '../models/User.js';

export let io: SocketIOServer | null = null;

interface ActivePresence {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string;
  pageId?: string;
  workspaceId?: string;
  lastActive: Date;
}

// Map socketId -> ActivePresence
const presenceMap = new Map<string, ActivePresence>();

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (socket.handshake.headers?.cookie &&
          socket.handshake.headers.cookie
            .split(';')
            .find((c) => c.trim().startsWith('token='))
            ?.split('=')[1]);

      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }

      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('name email role status avatar workspaceId');

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('User account is inactive or not found'));
      }

      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error('Invalid socket credentials'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const userRoom = `user:${user._id.toString()}`;
    socket.join(userRoom);

    const wsId = user.workspaceId?.toString();
    if (wsId) {
      socket.join(`workspace:${wsId}`);
    }
    socket.join('workspace');

    presenceMap.set(socket.id, {
      socketId: socket.id,
      userId: user._id.toString(),
      name: user.name,
      avatar: user.avatar,
      workspaceId: wsId,
      lastActive: new Date()
    });

    broadcastWorkspacePresence(wsId);

    // Joining a specific page
    socket.on('join_page', (pageId: string) => {
      socket.join(`page:${pageId}`);
      const entry = presenceMap.get(socket.id);
      if (entry) {
        entry.pageId = pageId;
        entry.lastActive = new Date();
      }
      emitPagePresence(pageId);
    });

    // Leaving a specific page
    socket.on('leave_page', (pageId: string) => {
      socket.leave(`page:${pageId}`);
      const entry = presenceMap.get(socket.id);
      if (entry && entry.pageId === pageId) {
        entry.pageId = undefined;
      }
      emitPagePresence(pageId);
    });

    // User typing / editing indicator
    socket.on('page_editing_indicator', ({ pageId, isEditing }: { pageId: string; isEditing: boolean }) => {
      socket.to(`page:${pageId}`).emit('PAGE_USER_EDITING', {
        pageId,
        userId: user._id.toString(),
        name: user.name,
        isEditing
      });
    });

    socket.on('disconnect', () => {
      const entry = presenceMap.get(socket.id);
      const ws = entry?.workspaceId;
      if (entry && entry.pageId) {
        const pageId = entry.pageId;
        presenceMap.delete(socket.id);
        emitPagePresence(pageId);
      } else {
        presenceMap.delete(socket.id);
      }
      broadcastWorkspacePresence(ws);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
};

// Emit active editors/viewers on a specific page
export const emitPagePresence = (pageId: string): void => {
  if (!io) return;
  const activeUsersOnPage = Array.from(presenceMap.values())
    .filter((p) => p.pageId === pageId)
    .map((p) => ({ userId: p.userId, name: p.name, avatar: p.avatar }));

  io.to(`page:${pageId}`).emit('PAGE_PRESENCE_UPDATED', {
    pageId,
    activeUsers: activeUsersOnPage
  });
};

// Broadcast online users in workspace
export const broadcastWorkspacePresence = (workspaceId?: string): void => {
  if (!io) return;
  const onlineUsers = Array.from(
    new Map(
      Array.from(presenceMap.values())
        .filter((p) => !workspaceId || !p.workspaceId || p.workspaceId === workspaceId)
        .map((p) => [p.userId, { userId: p.userId, name: p.name, avatar: p.avatar }])
    ).values()
  );

  if (workspaceId) {
    io.to(`workspace:${workspaceId}`).emit('WORKSPACE_PRESENCE_UPDATED', { onlineUsers });
  }
  io.to('workspace').emit('WORKSPACE_PRESENCE_UPDATED', { onlineUsers });
};
