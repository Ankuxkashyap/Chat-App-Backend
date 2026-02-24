import {
  Body,
  Controller,
  Post,
  Get,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from '../user/dto/CreateUserDto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { UserLoginDto } from './dto/UserLoginDto';
import { AuthGuard } from './auth.guard';
import type { RequestT } from './types/auth';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() userLoginDto: UserLoginDto, @Res() res: Response) {
    const { token } = await this.authService.login(userLoginDto);
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 3600000,
    });

    return res.json({ token });
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    const { user, token } = await this.authService.register(createUserDto);

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 3600000,
    });

    return res.json({ user: user, token: token });
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  profile(@Req() req: RequestT) {
    return { user: req.user };
  }
}
