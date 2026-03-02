import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationService {
    constructor(private readonly prismaService: PrismaService) {}

    async createConversation(userOneId: string, userTwoId: string) {
        // // Normalize order to prevent duplicates
        // const [firstUser, secondUser] =
        //   userOneId < userTwoId
        //     ? [userOneId, userTwoId]
        //     : [userTwoId, userOneId];
      
        const existing = await this.prismaService.conversation.findFirst({
          where: {
            userOneId: userOneId,
            userTwoId: userTwoId,
          },
        });
      
        if (existing) {
            throw new ConflictException('Conversation already exists');
        }
      
        return this.prismaService.conversation.create({
          data: {
            userOneId: userOneId,
            userTwoId: userTwoId,
          },
        });
      }
      async getConversations(userId: string) {
        const conversations = await this.prismaService.conversation.findMany({
          where: {
            OR: [{ userOneId: userId }, { userTwoId: userId }],
          },
          include: {
            userOne: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            userTwo: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });
      
        return conversations.map((conversation) => {
          const otherUser =
            conversation.userOneId === userId
              ? conversation.userTwo
              : conversation.userOne;
      
          return {
            conversationId: conversation.id,
            user: otherUser,
            lastMessage: conversation.messages[0] || null,
            updatedAt: conversation.updatedAt,
          };
        });
      }

}
