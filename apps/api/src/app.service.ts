import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { success: boolean; data: { status: string; timestamp: string } } {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
