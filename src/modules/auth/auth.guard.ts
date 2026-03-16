import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, TokenExpiredError, JsonWebTokenError } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { IncomingHttpHeaders } from 'http';
import type { AuthUser, JwtPayload, RequestT } from './types/auth';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestT>();
    const token = this.extractToken(request.headers);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = await this.verifyToken(token);
    const user = await this.findUser(payload.sub);

    request.user = user;
    return true;
  }

  private extractToken(headers: IncomingHttpHeaders): string | null {
    const authHeader = headers['authorization'];
    if (typeof authHeader !== 'string') return null;
    if (!authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1] ?? null;
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (err instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private async findUser(userId: string): Promise<AuthUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
