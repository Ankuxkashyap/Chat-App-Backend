import {
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  
  @Injectable()
  export class MessagesService {
    constructor(private readonly prismaService: PrismaService) {}
  
    async createMessage(
      senderId: string,
      conversationId: string,
      content: string,
    ) {
      const conversation =
        await this.prismaService.conversation.findUnique({
          where: { id: conversationId },
        });
  
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      if (
        conversation.userOneId !== senderId &&
        conversation.userTwoId !== senderId
      ) {
        throw new ForbiddenException(
          'You are not part of this conversation',
        );
      }
      const message = await this.prismaService.message.create({
        data: {
          content,
          senderId,
          conversationId,
        },
      });
      await this.prismaService.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
  
      return message;
    }
    async getMessages(
        userId: string,
        conversationId: string,
      ) {
        const conversation =
          await this.prismaService.conversation.findUnique({
            where: { id: conversationId },
          });
      
        if (!conversation) {
          throw new NotFoundException('Conversation not found');
        }
        if (
          conversation.userOneId !== userId &&
          conversation.userTwoId !== userId
        ) {
          throw new ForbiddenException(
            'You are not part of this conversation',
          );
        }
        return this.prismaService.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
        });
      }
  }