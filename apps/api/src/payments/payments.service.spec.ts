import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrismaService = {
  paymentRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  approvalLog: {
    create: jest.fn(),
  },
  transaction: {
    aggregate: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment request with status PENDING', async () => {
      const requesterId = 'user-1';
      const dto = {
        projectId: 'project-1',
        clientId: 'client-1',
        amount: 500000,
        category: 'MATERIAL' as const,
        desiredDate: '2026-03-15',
        note: 'Test note',
      };

      const createdRequest = {
        id: 'request-1',
        projectId: dto.projectId,
        requesterId,
        clientId: dto.clientId,
        amount: new Prisma.Decimal(dto.amount),
        desiredDate: new Date(dto.desiredDate),
        status: 'PENDING',
        note: dto.note,
        photoUrl: null,
        project: {
          id: 'project-1',
          name: 'Test Project',
          companyId: 'company-1',
          company: { id: 'company-1', name: 'Test Company' },
        },
        requester: { id: 'user-1', name: 'Test User' },
        client: { id: 'client-1', name: 'Test Client' },
      };

      mockPrismaService.paymentRequest.create.mockResolvedValue(createdRequest);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.notification.create.mockResolvedValue({});

      const result = await service.create(requesterId, dto);

      expect(mockPrismaService.paymentRequest.create).toHaveBeenCalledWith({
        data: {
          projectId: dto.projectId,
          requesterId,
          clientId: dto.clientId,
          amount: expect.any(Prisma.Decimal),
          category: dto.category,
          desiredDate: new Date(dto.desiredDate),
          status: 'PENDING',
          note: dto.note,
          photoUrl: null,
        },
        include: {
          project: { include: { company: true } },
          requester: true,
          client: true,
        },
      });
      expect(result).toEqual(createdRequest);
      expect(result.status).toBe('PENDING');
    });

    it('should set note and photoUrl to null when not provided', async () => {
      const requesterId = 'user-1';
      const dto = {
        projectId: 'project-1',
        clientId: 'client-1',
        amount: 100000,
        category: 'SUBCONTRACTING' as const,
        desiredDate: '2026-04-01',
      };

      mockPrismaService.paymentRequest.create.mockResolvedValue({
        id: 'request-2',
        status: 'PENDING',
        amount: new Prisma.Decimal(dto.amount),
        project: {
          id: 'project-1',
          name: 'Project',
          companyId: 'company-1',
          company: { id: 'company-1' },
        },
        requester: { id: requesterId, name: 'User' },
        client: { id: 'client-1', name: 'Client' },
      });
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.create(requesterId, dto);

      expect(mockPrismaService.paymentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            note: null,
            photoUrl: null,
          }),
        }),
      );
    });

    it('should create notifications for approvers after creating request', async () => {
      const requesterId = 'user-foreman';
      const dto = {
        projectId: 'project-1',
        clientId: 'client-1',
        amount: 500000,
        category: 'MATERIAL' as const,
        desiredDate: '2026-03-15',
      };

      mockPrismaService.paymentRequest.create.mockResolvedValue({
        id: 'request-1',
        amount: new Prisma.Decimal(dto.amount),
        project: {
          id: 'project-1',
          name: 'Test Project',
          companyId: 'company-1',
          company: { id: 'company-1' },
        },
        requester: { id: requesterId, name: 'Foreman' },
        client: { id: 'client-1', name: 'Client' },
      });

      const approvers = [
        { id: 'owner-1', name: 'Owner', role: 'OWNER' },
        { id: 'acc-1', name: 'Accountant', role: 'ACCOUNTING' },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(approvers);
      mockPrismaService.notification.create.mockResolvedValue({});

      await service.create(requesterId, dto);

      // Should look up approvers for the company
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          role: { in: ['OWNER', 'ACCOUNTING'] },
        },
      });

      // Should create a notification for each approver
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('approve', () => {
    it('should update status to APPROVED and create ApprovalLog', async () => {
      const requestId = 'request-1';
      const approverId = 'approver-1';

      const existingRequest = {
        id: requestId,
        status: 'PENDING',
      };

      const updatedRequest = {
        id: requestId,
        status: 'APPROVED',
        project: { id: 'project-1', name: 'Test' },
        requester: { id: 'user-1', name: 'Requester' },
        client: { id: 'client-1', name: 'Client' },
      };

      mockPrismaService.paymentRequest.findUnique.mockResolvedValue(existingRequest);
      mockPrismaService.$transaction.mockResolvedValue([updatedRequest, {}]);

      const result = await service.approve(requestId, approverId);

      expect(mockPrismaService.paymentRequest.findUnique).toHaveBeenCalledWith({
        where: { id: requestId },
      });

      // Verify $transaction was called
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

      // Verify paymentRequest.update was called with APPROVED status
      expect(mockPrismaService.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: { status: 'APPROVED' },
        include: {
          project: true,
          requester: true,
          client: true,
        },
      });

      // Verify approvalLog.create was called with APPROVED action
      expect(mockPrismaService.approvalLog.create).toHaveBeenCalledWith({
        data: {
          requestId,
          approverId,
          action: 'APPROVED',
        },
      });

      expect(result).toEqual(updatedRequest);
    });

    it('should throw NotFoundException when request does not exist', async () => {
      mockPrismaService.paymentRequest.findUnique.mockResolvedValue(null);

      await expect(service.approve('nonexistent', 'approver-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('should update status to REJECTED and create ApprovalLog with comment', async () => {
      const requestId = 'request-1';
      const approverId = 'approver-1';
      const comment = 'Budget exceeded';

      const existingRequest = {
        id: requestId,
        status: 'PENDING',
      };

      const updatedRequest = {
        id: requestId,
        status: 'REJECTED',
        project: { id: 'project-1', name: 'Test' },
        requester: { id: 'user-1', name: 'Requester' },
        client: { id: 'client-1', name: 'Client' },
      };

      mockPrismaService.paymentRequest.findUnique.mockResolvedValue(existingRequest);
      mockPrismaService.$transaction.mockResolvedValue([updatedRequest, {}]);

      const result = await service.reject(requestId, approverId, comment);

      expect(mockPrismaService.paymentRequest.findUnique).toHaveBeenCalledWith({
        where: { id: requestId },
      });

      // Verify $transaction was called
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

      // Verify paymentRequest.update was called with REJECTED status
      expect(mockPrismaService.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: { status: 'REJECTED' },
        include: {
          project: true,
          requester: true,
          client: true,
        },
      });

      // Verify approvalLog.create was called with REJECTED action and comment
      expect(mockPrismaService.approvalLog.create).toHaveBeenCalledWith({
        data: {
          requestId,
          approverId,
          action: 'REJECTED',
          comment,
        },
      });

      expect(result).toEqual(updatedRequest);
      expect(result.status).toBe('REJECTED');
    });

    it('should throw NotFoundException when request does not exist', async () => {
      mockPrismaService.paymentRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.reject('nonexistent', 'approver-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getImpact', () => {
    it('should calculate impact with correct signal after payment', async () => {
      const requestId = 'request-1';
      const requestAmount = 1000000;
      const companyBankBalance = 5000000;
      const dangerLine = 2000000;

      mockPrismaService.paymentRequest.findUnique.mockResolvedValue({
        id: requestId,
        projectId: 'project-1',
        amount: new Prisma.Decimal(requestAmount),
        project: {
          company: {
            bankBalance: new Prisma.Decimal(companyBankBalance),
            dangerLine: new Prisma.Decimal(dangerLine),
          },
        },
      });

      // Project income: 3,000,000
      mockPrismaService.transaction.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: new Prisma.Decimal(3000000) },
        })
        // Project expenses: 500,000
        .mockResolvedValueOnce({
          _sum: { amount: new Prisma.Decimal(500000) },
        });

      const result = await service.getImpact(requestId);

      // Project balance after: 3,000,000 - 500,000 - 1,000,000 = 1,500,000
      expect(result.projectBalanceAfter).toBe(1500000);
      // 1,500,000 <= 2,000,000 -> red
      expect(result.projectSignalAfter).toBe('red');

      // Company balance after: 5,000,000 - 1,000,000 = 4,000,000
      expect(result.companyBalanceAfter).toBe(4000000);
      // 4,000,000 = dangerLine * 2, not strictly greater, so yellow
      expect(result.companySignalAfter).toBe('yellow');
    });

    it('should throw NotFoundException when request does not exist', async () => {
      mockPrismaService.paymentRequest.findUnique.mockResolvedValue(null);

      await expect(service.getImpact('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return green signal when balance is well above danger line', async () => {
      mockPrismaService.paymentRequest.findUnique.mockResolvedValue({
        id: 'request-1',
        projectId: 'project-1',
        amount: new Prisma.Decimal(100000),
        project: {
          company: {
            bankBalance: new Prisma.Decimal(10000000),
            dangerLine: new Prisma.Decimal(2000000),
          },
        },
      });

      mockPrismaService.transaction.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: new Prisma.Decimal(8000000) },
        })
        .mockResolvedValueOnce({
          _sum: { amount: new Prisma.Decimal(1000000) },
        });

      const result = await service.getImpact('request-1');

      // Project: 8,000,000 - 1,000,000 - 100,000 = 6,900,000 > 4,000,000 -> green
      expect(result.projectBalanceAfter).toBe(6900000);
      expect(result.projectSignalAfter).toBe('green');

      // Company: 10,000,000 - 100,000 = 9,900,000 > 4,000,000 -> green
      expect(result.companyBalanceAfter).toBe(9900000);
      expect(result.companySignalAfter).toBe('green');
    });
  });
});
