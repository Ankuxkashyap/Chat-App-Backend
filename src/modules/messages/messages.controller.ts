import {
    Body,
    Controller,
    Get,
    Post,
    Param,
    Req,
    UseGuards,
    Patch,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from 'src/types/auth';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus } from '@prisma/client';

@Controller('messages')
@UseGuards(AuthGuard)
export class MessagesController {
    constructor(
        private readonly messagesService: MessagesService,
    ) { }

    @Post()
    async sendMessage(
        @Req() req: AuthenticatedRequest,
        @Body() CreateMessageDto: CreateMessageDto
    ) {
        return this.messagesService.createMessage(
            req.user.id,
            CreateMessageDto.conversationId,
            CreateMessageDto.message,
        );
    }
    @Get(':conversationId')
    async getMessages(
        @Req() req: AuthenticatedRequest,
        @Param('conversationId') conversationId: string,
    ) {
        return this.messagesService.getMessages(
            req.user.id,
            conversationId,
        );
    }
    @Patch(':messageId')
    async updateStatus(
        @Req() req: AuthenticatedRequest,
        @Param('messageId') msgId: string,
        @Body('status') status:MessageStatus
    ) {
        return this.messagesService.updateMessages(req.user.id,status,msgId)
    }
}