import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SocketModule } from './socket.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [SocketModule, UserModule, AuthModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService, SocketGateway],
})
export class AppModule {}
