import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../../chat/chat.gateway'

@Injectable()
export class MessagesService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly chatGateway: ChatGateway,
    ) { }

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

        this.chatGateway.emitNewMessage(conversationId, {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            conversationId: message.conversationId,
            createdAt: message.createdAt.toISOString(),
            updatedAt: message.updatedAt.toISOString(),
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