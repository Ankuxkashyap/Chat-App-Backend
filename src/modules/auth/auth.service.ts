import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserLoginDto } from './dto/UserLoginDto';
import { UserRegisterDto } from './dto/UserRegisterDto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  private generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  async register(UserRegisterDto: UserRegisterDto) {
    const isUserExist = await this.prismaService.user.findUnique({
      where: { email: UserRegisterDto.email },
      select: {
        name: true,
        email: true,
        id: true,
        username: true,
      },
    });

    if (isUserExist) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(UserRegisterDto.password, 10);

    const user = await this.userService.createUser({
      ...UserRegisterDto,
      password: hashedPassword,
    });

    const token = this.generateToken(user.id, user.email);

    return { user, token };
  }

  async login(UserLoginDto: UserLoginDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: UserLoginDto.email,
      },
    });

    if (!user) {
      throw new ConflictException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      UserLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new ConflictException('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email);

    return { token };
  }
}
