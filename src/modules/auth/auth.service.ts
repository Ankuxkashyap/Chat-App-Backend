import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserLoginDto } from './dto/UserLoginDto';
import { UserRegisterDto } from './dto/UserRegisterDto';
import type { AuthUser, JwtPayload } from './types/auth';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type LoginResult = AuthTokens & { user: AuthUser };
type RegisterResult = AuthTokens & { user: AuthUser };

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  private generateAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  private buildAuthUser(user: AuthUser): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    };
  }

  async register(dto: UserRegisterDto): Promise<RegisterResult> {
    const existing = await this.prismaService.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const created = await this.userService.createUser({
      ...dto,
      password: hashedPassword,
    });

    const accessToken = this.generateAccessToken(created.id, created.email);
    const refreshToken = this.generateRefreshToken(created.id, created.email);
    await this.saveRefreshToken(created.id, refreshToken);

    return {
      user: this.buildAuthUser(created),
      accessToken,
      refreshToken,
    };
  }

  async login(dto: UserLoginDto): Promise<LoginResult> {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ConflictException('Invalid email or password');
    }
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ConflictException('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id, user.email);
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      user: this.buildAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        refreshToken: true,
      },
    });

    if (!user?.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatches) {
      throw new ForbiddenException('Access denied');
    }

    const newAccessToken = this.generateAccessToken(user.id, user.email);
    const newRefreshToken = this.generateRefreshToken(user.id, user.email);
    await this.saveRefreshToken(user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
  async googleLogin(dto: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await this.prismaService.user.findFirst({
      where: {
        OR: [{ googleId: dto.googleId }, { email: dto.email }],
      },
    });

    if (!user) {
      const baseUsername = dto.email.split('@')[0].toLowerCase();
      let username = baseUsername;
      let count = 0;
      while (
        await this.prismaService.user.findUnique({ where: { username } })
      ) {
        username = `${baseUsername}${++count}`;
      }

      user = await this.prismaService.user.create({
        data: {
          googleId: dto.googleId,
          email: dto.email,
          name: dto.name,
          avatar: dto.avatar,
          username,
        },
      });
      console.log('Google profile:', user);
    } else if (!user.googleId) {
      user = await this.prismaService.user.update({
        where: { id: user.id },
        data: { googleId: dto.googleId, avatar: dto.avatar },
      });
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id, user.email);
    await this.saveRefreshToken(user.id, refreshToken);

    return { user: this.buildAuthUser(user), accessToken, refreshToken };
  }
}
