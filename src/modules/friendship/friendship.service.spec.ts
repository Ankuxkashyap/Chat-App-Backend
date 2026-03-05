import { Test, TestingModule } from '@nestjs/testing';
import { FriendshipService } from './friendship.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FriendshipService', () => {
  let service: FriendshipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipService,
        {
          provide: PrismaService,
          useValue: {
            friendship: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FriendshipService>(FriendshipService);
  });
  const mockFriendshipService = {
    getFriends: jest.fn(),
    createFriend: jest.fn(),
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be return all friendships', async () => {
    const mokeFriendships = [];
    jest
      .spyOn(service.prismaService.friendship, 'findMany')
      .mockResolvedValueOnce(mokeFriendships as any);

    expect(await service.getFriends('1')).toEqual(mokeFriendships);
  });
});
