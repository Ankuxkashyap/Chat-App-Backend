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
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
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
}
