import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  async getFriendRequests(userId: string) {
    return await this.prismaService.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }

  async sentRequest(senderId: string, receiverId: string) {
    const existingRequest = await this.prismaService.friendRequest.findFirst({
      where: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
    });

    if (senderId === receiverId) {
      throw new ConflictException('Cannot send friend request to yourself');
    }

    if (existingRequest) {
      throw new ConflictException('Friend request already sent');
    }

    return this.prismaService.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
    });
  }

  async acceptRequest(requestId: string, userId: string) {
    const request = await this.prismaService.friendRequest.findUnique({
      where: {
        id: requestId,
        receiverId: userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new ConflictException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new ConflictException('Unauthorized action');
    }

    const existingFriendship = await this.prismaService.friendship.findFirst({
      where: {
        userOneId: request.senderId,
        userTwoId: request.receiverId,
      },
    });

    if (existingFriendship) {
      throw new ConflictException('Friendship already exists');
    }
    await this.prismaService.friendship.create({
      data: {
        userOneId: request.senderId,
        userTwoId: request.receiverId,
      },
    });

    return this.prismaService.friendRequest.delete({
      where: { id: requestId },
    });
  }

  async rejectRequest(requestId: string, userId: string) {
    const request = await this.prismaService.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Friend request not found or already handled',
      );
    }

    return this.prismaService.friendRequest.delete({
      where: { id: requestId },
    });
  }
}
