import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LineAuthDto {
  @ApiProperty({
    description: 'LINE アクセストークン',
    example: 'line-access-token-xxxxx',
  })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
