import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  companyId: string;
  role: string;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext): CurrentUserPayload | string => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserPayload }>();
    const user = request.user;

    if (data) {
      return user[data];
    }

    return user;
  },
);
