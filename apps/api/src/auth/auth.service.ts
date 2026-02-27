import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * LINE アクセストークンを検証し、JWT を発行する
   */
  async authenticateWithLine(accessToken: string): Promise<AuthResult> {
    // LINE API でプロフィールを取得してトークンを検証
    const profile = await this.getLineProfile(accessToken);

    // lineUserId でユーザーを検索
    const user = await this.prisma.user.findUnique({
      where: { lineUserId: profile.userId },
    });

    if (!user) {
      throw new UnauthorizedException(
        '登録されていないユーザーです。管理者にお問い合わせください。',
      );
    }

    // JWT を生成
    const payload = {
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
    };
    const jwt = this.jwtService.sign(payload);

    return {
      accessToken: jwt,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * ユーザー情報を取得する（/auth/me 用）
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      lineNotification: user.lineNotification,
      company: {
        id: user.company.id,
        name: user.company.name,
      },
    };
  }

  /**
   * JWT ストラテジーからのペイロード検証
   */
  async validateUser(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    return user;
  }

  /**
   * LINE API を呼び出してプロフィールを取得する
   */
  private async getLineProfile(accessToken: string): Promise<LineProfile> {
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException(
        'LINE アクセストークンが無効です',
      );
    }

    const data = (await response.json()) as LineProfile;
    return data;
  }
}
