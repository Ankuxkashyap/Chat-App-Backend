import { Controller, Get, Query, Req } from '@nestjs/common';
import { UserService } from './user.service';
import type { AuthenticatedRequest } from 'src/types/auth';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }
    @UseGuards(AuthGuard)
    @Get('search')
    async searchUsers(@Req() req: AuthenticatedRequest, @Query('query') searchQuery: string) {
        return this.userService.searchUsers(req.user.id, searchQuery);
    }
}
