import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface User {
    name: string;
    email: string;
    password: string;
}

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  private cleanName(name: string) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  generateUsername(name: string) {
    const base = this.cleanName(name);
    const uniquePart = Date.now().toString(36).slice(-3);

    return `${base}_${uniquePart}`;
  }

  async createUser(User: User) {
    const username = this.generateUsername(User.name);
    const user = await this.prismaService.user.create({
      data: {
        username: username,
        name: User.name,
        password: User.password,
        email: User.email,
      },
    });
    return user;
  }
  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prismaService.user.findUnique({ where: { username } });
  }

  async findById(id: string) {
    return this.prismaService.user.findUnique({ where: { id } });
  }

}
