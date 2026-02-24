import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from 'src/types/auth';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthenticatedRequest = context.switchToHttp().getRequest();
    const token = request.cookies?.token;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    try {
      const decoded = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'secretKey',
      });

      const user = await this.prismaService.user.findUnique({
        where: {
          id: decoded.sub,
        },
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
      request.user = user;
      return true;
    } catch (err) {
      console.error('Token verification error:', err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
