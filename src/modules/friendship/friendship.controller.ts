import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  Get,
  Param,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from 'src/types/auth';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @UseGuards(AuthGuard)
  @Post('add')
  async addFriend(
    @Req() req: AuthenticatedRequest,
    @Body('receiverId') receiverId: string,
  ) {
    const senderId = req.user.id;

    return this.friendshipService.addFriend(senderId, receiverId);
  }

  @Get('test')
  test() {
    return 'test';
  }

  @UseGuards(AuthGuard)
  @Get('')
  async getFriends(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.friendshipService.getFriends(userId);
  }

  @UseGuards(AuthGuard)
  @Get('requests')
  async getFriendRequests(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.friendshipService.getFriendRequests(userId);
  }

  @UseGuards(AuthGuard)
  @Post('request')
  async sentRequest(
    @Req() req: AuthenticatedRequest,
    @Body('receiverId') receiverId: string,
  ) {
    const senderId = req.user.id;
    return this.friendshipService.sentRequest(senderId, receiverId);
  }

  @UseGuards(AuthGuard)
  @Post('request/:id')
  async acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
  ) {
    console.log('Request ID:', requestId);
    return this.friendshipService.acceptRequest(requestId, req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post('request/:id/reject')
  async rejectRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
  ) {
    return this.friendshipService.rejectRequest(requestId, req.user.id);
  }
}
