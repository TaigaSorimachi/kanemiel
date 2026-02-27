import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateProjectDto } from './create-project.dto.js';

export enum ProjectStatusEnum {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsEnum(ProjectStatusEnum)
  @IsOptional()
  status?: ProjectStatusEnum;
}
