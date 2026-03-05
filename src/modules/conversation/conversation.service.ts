import { ConflictException, Injectable,ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationService {
  constructor(private readonly prismaService: PrismaService) { }

  async createConversation(userOneId: string, targetUserId: string) {
    if (userOneId === targetUserId) {
      throw new ConflictException('Cannot chat with yourself');
    }
    const friendship = await this.prismaService.friendship.findFirst({
      where: {
        OR: [
          { userOneId: userOneId, userTwoId: targetUserId },
          { userOneId: targetUserId, userTwoId: userOneId },
        ],
      },
    });
  
    if (!friendship) {
      throw new ForbiddenException('You are not friends');
    }
    const [firstUser, secondUser] = [userOneId, targetUserId].sort();

    const existing = await this.prismaService.conversation.findFirst({
      where: {
        userOneId: firstUser,
        userTwoId: secondUser,
      },
    });

    if (existing){
      throw new ConflictException("Conversation Already exists")
    };

    return this.prismaService.conversation.create({
      data: {
        userOneId: firstUser,
        userTwoId: secondUser,
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
  async getConversationById(
    userId: string,
    conversationId: string,
  ) {
    const conversation =
      await this.prismaService.conversation.findUnique({
        where: { id: conversationId },
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
            orderBy: { createdAt: 'asc' },
          },
        },
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
  
    const otherUser =
      conversation.userOneId === userId
        ? conversation.userTwo
        : conversation.userOne;
  
    return {
      conversationId: conversation.id,
      user: otherUser,
      messages: conversation.messages,
    };
  }

}
