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

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;
    console.log('[ChatGateway] handleConnection - clientId:', client.id, '| userId:', userId);

    if (!userId) {
      console.warn('[ChatGateway] handleConnection - no userId in auth, skipping');
      return;
    }

    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }

    this.onlineUsers.get(userId)!.add(client.id);
    console.log('[ChatGateway] handleConnection - sockets for user', userId, ':', [...this.onlineUsers.get(userId)!]);

    if (this.onlineUsers.get(userId)!.size === 1) {
      console.log('[ChatGateway] handleConnection - emitting userOnline for:', userId);
      this.server.emit('userOnline', { userId });
    } else {
      console.log('[ChatGateway] handleConnection - user already online, not re-emitting userOnline');
    }

    console.log('[ChatGateway] current onlineUsers:', Array.from(this.onlineUsers.keys()));
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId;
    console.log('[ChatGateway] handleDisconnect - clientId:', client.id, '| userId:', userId);

    if (!userId) {
      console.warn('[ChatGateway] handleDisconnect - no userId in auth, skipping');
      return;
    }

    const sockets = this.onlineUsers.get(userId);
    if (!sockets) {
      console.warn('[ChatGateway] handleDisconnect - no socket set found for userId:', userId);
      return;
    }

    sockets.delete(client.id);
    console.log('[ChatGateway] handleDisconnect - remaining sockets for user', userId, ':', [...sockets]);

    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
      console.log('[ChatGateway] handleDisconnect - emitting userOffline for:', userId);
      this.server.emit('userOffline', { userId });
    } else {
      console.log('[ChatGateway] handleDisconnect - user still has active sockets, not emitting userOffline');
    }

    console.log('[ChatGateway] current onlineUsers:', Array.from(this.onlineUsers.keys()));
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const users = this.getOnlineUsers();
    console.log('[ChatGateway] getOnlineUsers - clientId:', client.id, '| returning:', users);
    client.emit('onlineUsers', users);
  }

  @SubscribeMessage('joinConversation')
  handleJoin(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[ChatGateway] joinConversation - clientId:', client.id, '| conversationId:', conversationId);
    client.join(conversationId);
  }

  @SubscribeMessage('leaveConversation')
  handleLeave(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[ChatGateway] leaveConversation - clientId:', client.id, '| conversationId:', conversationId);
    client.leave(conversationId);
  }

  emitNewMessage(
    conversationId: string,
    message: {
      id: string;
      content: string;
      senderId: string;
      conversationId: string;
      createdAt: string;
      updatedAt: string;
    },
  ) {
    console.log('[ChatGateway] emitNewMessage - conversationId:', conversationId, '| messageId:', message.id);
    this.server.to(conversationId).emit('newMessage', message);
  }
}