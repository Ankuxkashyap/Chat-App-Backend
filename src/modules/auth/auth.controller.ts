import {
  Body,
  Controller,
  Post,
  Get,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { UserLoginDto } from './dto/UserLoginDto';
import { UserRegisterDto } from './dto/UserRegisterDto';
import type { JwtPayload, RequestT } from './types/auth';
import type { CookieOptions } from 'express';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
const ACCESSTOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  maxAge: 30 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: UserRegisterDto,
    @Res() res: Response,
  ): Promise<void> {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ user, accessToken });
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: UserLoginDto, @Res() res: Response): Promise<void> {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('access_token', accessToken, ACCESSTOKEN_COOKIE_OPTIONS);
    res.json({ user, accessToken });
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.decode(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!decoded?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refresh(decoded.sub, refreshToken);

    res.cookie('refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('access_token', accessToken, ACCESSTOKEN_COOKIE_OPTIONS);
    res.json({ accessToken });
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logout(@Req() req: RequestT, @Res() res: Response): Promise<void> {
    await this.authService.logout(req.user.id);
    res.clearCookie('refresh_token');
    res.json({ message: 'Logged out successfully' });
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  profile(@Req() req: RequestT): { user: RequestT['user'] } {
    return { user: req.user };
  }

  @Get('google')
  @UseGuards(PassportAuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(PassportAuthGuard('google'))
  async googleCallback(@Req() req, @Res() res: Response) {
    if (!req.user) {
      return res.redirect('http://localhost:3000/auth?error=google_failed');
    }
    const { user, accessToken, refreshToken } =
      await this.authService.googleLogin(req.user);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('access_token', accessToken, ACCESSTOKEN_COOKIE_OPTIONS);
    // res.json({ user, accessToken });

    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  }
}
