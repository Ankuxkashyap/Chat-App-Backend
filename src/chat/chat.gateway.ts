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

  private onlineUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;
    console.log('Connected - userId from auth:', userId);
    console.log('All handshake auth:', client.handshake.auth);
    if (userId) {
      this.onlineUsers.set(userId, client.id);
      this.server.emit('userOnline', { userId });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.onlineUsers.delete(userId);
      this.server.emit('userOffline', { userId });
      console.log(`User ${userId} disconnected`);
    }
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const users = this.getOnlineUsers();
    console.log('getOnlineUsers called, returning:', users);
    client.emit('onlineUsers', users);
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
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(conversationId);
  }

  emitNewMessage(conversationId: string, message: {
    id: string;
    content: string;
    senderId: string;
    conversationId: string;
    createdAt: string;
    updatedAt: string;
  }) {
    this.server.to(conversationId).emit('newMessage', message);
  }
}