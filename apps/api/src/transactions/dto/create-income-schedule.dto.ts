import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum IncomeScheduleTypeEnum {
  PROGRESS = 'PROGRESS',
  ADVANCE = 'ADVANCE',
  FINAL = 'FINAL',
}

export class CreateIncomeScheduleDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  clientId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  scheduledDate!: string;

  @IsEnum(IncomeScheduleTypeEnum)
  incomeType!: IncomeScheduleTypeEnum;
}
