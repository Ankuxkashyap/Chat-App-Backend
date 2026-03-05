import { Test, TestingModule } from '@nestjs/testing';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { AuthGuard } from '../auth/auth.guard';

describe('FriendshipController', () => {
  let controller: FriendshipController;
  let service: FriendshipService;

  const mockFriendshipService = {
    getFriends: jest.fn(),
    // createFriend: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendshipController],
      providers: [
        {
          provide: FriendshipService,
          useValue: mockFriendshipService,
        },
      ],
    })

      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<FriendshipController>(FriendshipController);
    service = module.get<FriendshipService>(FriendshipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return friends', async () => {
    const mockFriends = [{ id: 1, userId: '123' }];

    service.getFriends.mockResolvedValue(mockFriends);
    const mockReq = { user: { id: '123' } };

    const result = await controller.getFriends(mockReq as any);

    expect(result).toEqual(mockFriends);
    expect(service.getFriends).toHaveBeenCalledWith('123');
  });

  // it('should create a friend', async () => {
  //   const dto = { userId: '123', friendId: '456' };
  //   const mockCreated = { id: 1, ...dto };

  //   service.createFriend.mockResolvedValue(mockCreated);

  //   const result = await controller.createFriend(dto);
  //   expect(result).toEqual(mockCreated);
  //   expect(service.createFriend).toHaveBeenCalledWith(dto);
  // });

  // it('should throw error if service fails', async () => {
  //   service.getFriends.mockRejectedValue(new Error('Service error'));

  //   await expect(controller.getFriends('123')).rejects.toThrow('Service error');
  // });
});
