import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

// Store the original global fetch so we can restore it
const originalFetch = global.fetch;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticateWithLine', () => {
    it('should authenticate successfully and return JWT', async () => {
      const lineAccessToken = 'valid-line-token';
      const lineProfile = {
        userId: 'line-user-123',
        displayName: 'Test User',
        pictureUrl: 'https://example.com/pic.jpg',
      };
      const dbUser = {
        id: 'user-1',
        name: 'Test User',
        role: 'owner',
        companyId: 'company-1',
        lineUserId: 'line-user-123',
      };
      const expectedJwt = 'generated-jwt-token';

      // Mock fetch to return LINE profile
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(lineProfile),
      });

      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);
      mockJwtService.sign.mockReturnValue(expectedJwt);

      const result = await service.authenticateWithLine(lineAccessToken);

      // Verify fetch was called with correct LINE API endpoint
      expect(global.fetch).toHaveBeenCalledWith('https://api.line.me/v2/profile', {
        headers: {
          Authorization: `Bearer ${lineAccessToken}`,
        },
      });

      // Verify user lookup by lineUserId
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { lineUserId: lineProfile.userId },
      });

      // Verify JWT generation with correct payload
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: dbUser.id,
        role: dbUser.role,
        companyId: dbUser.companyId,
      });

      // Verify returned result
      expect(result).toEqual({
        accessToken: expectedJwt,
        user: {
          id: dbUser.id,
          name: dbUser.name,
          role: dbUser.role,
        },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const lineAccessToken = 'valid-line-token';
      const lineProfile = {
        userId: 'unregistered-line-user',
        displayName: 'Unknown User',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(lineProfile),
      });

      // User not found in database
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.authenticateWithLine(lineAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when LINE token is invalid', async () => {
      const invalidToken = 'invalid-token';

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(service.authenticateWithLine(invalidToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // Should not attempt to look up user
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('should return user with company information', async () => {
      const userId = 'user-1';
      const dbUser = {
        id: userId,
        name: 'Test User',
        role: 'owner',
        companyId: 'company-1',
        lineNotification: true,
        company: {
          id: 'company-1',
          name: 'Test Company',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);

      const result = await service.getMe(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { company: true },
      });

      expect(result).toEqual({
        id: userId,
        name: 'Test User',
        role: 'owner',
        companyId: 'company-1',
        lineNotification: true,
        company: {
          id: 'company-1',
          name: 'Test Company',
        },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
