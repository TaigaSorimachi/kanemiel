import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LineAuthDto } from './dto/line-auth.dto.js';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: string;
    companyId: string;
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('line')
  @ApiOperation({ summary: 'LINE ログイン' })
  async lineAuth(@Body() dto: LineAuthDto) {
    const result = await this.authService.authenticateWithLine(dto.accessToken);
    return {
      success: true,
      data: result,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ログインユーザー情報取得' })
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.getMe(req.user.userId);
    return {
      success: true,
      data: user,
    };
  }
}
