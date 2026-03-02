import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SocketModule } from './socket.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SocketGateway } from './socket.gateway';
import { UserController } from './modules/user/user.controller';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { FriendshipModule } from './modules/friendship/friendship.module';
import { ConversationModule } from './modules/conversation/conversation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    SocketModule,
    UserModule,
    AuthModule,
    FriendshipModule,
    PrismaModule,
    ConversationModule,
  ],
  controllers: [AppController, UserController],
  providers: [AppService, SocketGateway],
})
export class AppModule {}
