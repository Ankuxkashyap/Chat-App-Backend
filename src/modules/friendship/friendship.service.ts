import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendshipService {
  constructor(private readonly prismaService: PrismaService) {}

  async addFriend(senderId: string, receiverId: string) {
    const existingFriendship = await this.prismaService.friendship.findFirst({
      where: {
        OR: [
          {
            userOneId: senderId,
            userTwoId: receiverId,
          },
          {
            userOneId: receiverId,
            userTwoId: senderId,
          },
        ],
      },
    });

    if (existingFriendship) {
      throw new ConflictException('Friendship already exists');
    }

    return this.prismaService.friendship.create({
      data: {
        userOneId: senderId,
        userTwoId: receiverId,
      },
    });
  }

  async getFriends(userId: string) {
    const friendships = await this.prismaService.friendship.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      include: {
        userOne: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
        userTwo: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return friendships.map((f) =>
      f.userOneId === userId ? f.userTwo : f.userOne,
    );
  }
}
