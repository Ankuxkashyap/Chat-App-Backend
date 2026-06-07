import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../modules/prisma/prisma.service';
import { MessageStatus } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, Set<string>>();

  constructor(private readonly prismaService: PrismaService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId as string | undefined;
    if (!userId) return;

    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(client.id);

    if (this.onlineUsers.get(userId)!.size === 1) {
      this.server.emit('userOnline', { userId });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId as string | undefined;
    if (!userId) return;

    const sockets = this.onlineUsers.get(userId);
    if (!sockets) return;

    sockets.delete(client.id);

    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
      this.server.emit('userOffline', { userId });
    }
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    client.emit('onlineUsers', this.getOnlineUsers());
  }

  @SubscribeMessage('joinConversation')
  handleJoin(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
  }

  @SubscribeMessage('leaveConversation')
  handleLeave(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.conversationId);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody()
    data: { conversationId: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.conversationId).emit('typing:start', {
      userId: data.userId,
      username: data.username,
      socketId: client.id,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.conversationId).emit('typing:stop', {
      userId: data.userId,
      socketId: client.id,
    });
  }

  @SubscribeMessage('messageDelivered')
  async handleMessageDelivered(
    @MessageBody() data: { messageId: string; senderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.prismaService.message.update({
      where: { id: data.messageId },
      data: { status: MessageStatus.DELIVERED },
    });

    const senderSockets = this.onlineUsers.get(data.senderId);
    if (senderSockets) {
      senderSockets.forEach((socketId) => {
        this.server.to(socketId).emit('messageStatusUpdated', message);
      });
    }

    return message;
  }
  @SubscribeMessage('markAsSeen')
  async handleMarkAsSeen(
    @MessageBody() data: { messageIds: string[]; senderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.messageIds?.length) return;

    const updated = await this.withRetry(() =>
      this.prismaService.message.updateMany({
        where: {
          id: { in: data.messageIds },
          status: { not: MessageStatus.SEEN }, // skip already-seen
        },
        data: { status: MessageStatus.SEEN },
      }),
    );

    // Notify the original sender once for all seen messages
    const senderSockets = this.onlineUsers.get(data.senderId);
    if (senderSockets) {
      senderSockets.forEach((socketId) => {
        this.server.to(socketId).emit('messagesSeenBatch', {
          messageIds: data.messageIds,
          status: MessageStatus.SEEN,
        });
      });
    }

    return updated;
  }

  // ── Add this private helper inside your ChatGateway class ─────────────────────
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 100,
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        const isDeadlock = err?.code === 'P2034';
        if (isDeadlock && attempt < retries) {
          await new Promise((res) => setTimeout(res, delay * 2 ** attempt));
          continue;
        }
        throw err;
      }
    }
    throw new Error('withRetry: unreachable');
  }
  emitNewMessage(
    conversationId: string,
    message: {
      id: string;
      content: string;
      senderId: string;
      conversationId: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    },
  ) {
    this.server.to(conversationId).emit('newMessage', message);
  }
  emitConversationUpdated(
    recipientUserIds: string[],
    payload: {
      conversationId: string;
      lastMessage: {
        id: string;
        content: string;
        senderId: string;
        conversationId: string;
        status: string;
        createdAt: string;
        updatedAt: string;
      };
      updatedAt: string;
    },
  ) {
    recipientUserIds.forEach((userId) => {
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('conversation_updated', payload);
        });
      }
    });
  }
}
