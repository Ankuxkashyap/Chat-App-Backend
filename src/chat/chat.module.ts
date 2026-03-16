import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
