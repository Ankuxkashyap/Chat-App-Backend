import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SignOptions } from 'jsonwebtoken';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.register({
    global: true,
    secret: process.env.JWT_SECRET ?? 'secretKey',
    signOptions: {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as SignOptions['expiresIn'],
    },
  }),
    UserModule,PrismaModule],
  providers: [AuthService,AuthGuard],
  controllers: [AuthController]
})
export class AuthModule {}
