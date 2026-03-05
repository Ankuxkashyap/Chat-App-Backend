import {
    Controller,
    Get,
    Post,
    Param,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from 'src/types/auth';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationController {
    constructor(
        private readonly conversationService: ConversationService,
    ) { }

    @Get()
    async getConversations(@Req() req: AuthenticatedRequest) {
        const userId = req.user.id;
        return this.conversationService.getConversations(userId);
    }

    @Get(':conversationId')
    async getConversationById(
        @Req() req:AuthenticatedRequest,
        @Param('conversationId') conversationId: string,
    ) {
        return this.conversationService.getConversationById(
            req.user.id,
            conversationId,
        );
    }
    @Post(':targetUserId')
    async createConversation(
        @Req() req: AuthenticatedRequest,
        @Param('targetUserId') targetUserId: string,
    ) {
        const userId = req.user.id;

        return this.conversationService.createConversation(
            userId,
            targetUserId,
        );
    }
}