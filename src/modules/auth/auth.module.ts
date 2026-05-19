import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { GoogleStrategy } from './google.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PrismaModule, PassportModule, UserModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, GoogleStrategy],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
