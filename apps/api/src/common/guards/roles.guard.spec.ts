import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';

function createMockExecutionContext(user?: { role?: string }): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when user role matches required roles', () => {
    const context = createMockExecutionContext({ role: 'owner' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner', 'accounting']);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when user has one of multiple required roles', () => {
    const context = createMockExecutionContext({ role: 'accounting' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner', 'accounting']);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when user role does not match required roles', () => {
    const context = createMockExecutionContext({ role: 'foreman' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner', 'accounting']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access when no roles are specified (no @Roles decorator)', () => {
    const context = createMockExecutionContext({ role: 'foreman' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    const context = createMockExecutionContext({ role: 'foreman' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user is not present on request', () => {
    const context = createMockExecutionContext(undefined);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user has no role property', () => {
    const context = createMockExecutionContext({});
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
