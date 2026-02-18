import { Controller, Post, UseGuards, Req, Body,Get } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { AuthGuard } from '../auth/auth.guard';
import { use } from 'passport';

@Controller('friendship')
export class FriendshipController {
    constructor(private readonly friendshipService: FriendshipService) {}

    @UseGuards(AuthGuard)
    @Post('add')
    async addFriend(
        @Req() req: any,
        @Body('receiverId') receiverId: string,
    ) {
        const senderId = req.user.id;

        return this.friendshipService.addFriend(senderId, receiverId);
    }

    @UseGuards(AuthGuard)
    @Get('')
    async getFriends(@Req() req: any) {
        const userId = req.user.id;
        return this.friendshipService.getFriends(userId);
    }
}