import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrismaService = {
  company: {
    findUniqueOrThrow: jest.fn(),
  },
  incomeSchedule: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  paymentRequest: {
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
  },
  transaction: {
    aggregate: jest.fn(),
  },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signal calculation via getSignals', () => {
    const companyId = 'company-1';
    const dangerLine = 2000000;

    /**
     * Helper: configure mocks so that the 3-month signal calculation
     * returns a predictable balance for the first month, with zero
     * income/expenses for all months (so running balance stays constant).
     */
    function setupForBalance(bankBalance: number) {
      mockPrismaService.company.findUniqueOrThrow.mockResolvedValue({
        id: companyId,
        bankBalance,
        dangerLine,
      });

      // All income and expense aggregates return 0 so the predicted
      // balance equals the bank balance for all three months.
      mockPrismaService.incomeSchedule.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.paymentRequest.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
    }

    it('should return green when balance > dangerLine * 2', async () => {
      setupForBalance(5000000); // 5,000,000 > 2,000,000 * 2

      const signals = await service.getSignals(companyId);

      expect(signals).toHaveLength(3);
      expect(signals[0].signal).toBe('green');
      expect(signals[0].predictedBalance).toBe(5000000);
    });

    it('should return yellow when dangerLine < balance <= dangerLine * 2', async () => {
      setupForBalance(3000000); // 2,000,000 < 3,000,000 <= 4,000,000

      const signals = await service.getSignals(companyId);

      expect(signals).toHaveLength(3);
      expect(signals[0].signal).toBe('yellow');
      expect(signals[0].predictedBalance).toBe(3000000);
    });

    it('should return red when balance <= dangerLine', async () => {
      setupForBalance(1500000); // 1,500,000 <= 2,000,000

      const signals = await service.getSignals(companyId);

      expect(signals).toHaveLength(3);
      expect(signals[0].signal).toBe('red');
      expect(signals[0].predictedBalance).toBe(1500000);
    });

    it('should return red when balance is 0', async () => {
      setupForBalance(0);

      const signals = await service.getSignals(companyId);

      expect(signals).toHaveLength(3);
      expect(signals[0].signal).toBe('red');
      expect(signals[0].predictedBalance).toBe(0);
    });

    it('should return red when balance is negative', async () => {
      setupForBalance(-1000000);

      const signals = await service.getSignals(companyId);

      expect(signals).toHaveLength(3);
      expect(signals[0].signal).toBe('red');
      expect(signals[0].predictedBalance).toBe(-1000000);
    });

    it('should return yellow at exact boundary of dangerLine * 2', async () => {
      // 4,000,000 is exactly dangerLine * 2 — NOT strictly greater, so yellow
      setupForBalance(4000000);

      const signals = await service.getSignals(companyId);

      expect(signals[0].signal).toBe('yellow');
    });

    it('should return red at exact boundary of dangerLine', async () => {
      // 2,000,000 is exactly dangerLine — NOT strictly greater, so red
      setupForBalance(2000000);

      const signals = await service.getSignals(companyId);

      expect(signals[0].signal).toBe('red');
    });

    it('should calculate all three months consistently when no income or expenses', async () => {
      setupForBalance(5000000);

      const signals = await service.getSignals(companyId);

      expect(signals).toHaveLength(3);
      // All three months should be green since running balance stays constant
      signals.forEach((s) => {
        expect(s.signal).toBe('green');
        expect(s.predictedBalance).toBe(5000000);
      });
    });
  });
});
