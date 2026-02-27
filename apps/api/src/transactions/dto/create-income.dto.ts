import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsDateString,
  IsEnum,
  IsString,
} from 'class-validator';

export enum IncomeTypeEnum {
  PROGRESS = 'PROGRESS',
  ADVANCE = 'ADVANCE',
  FINAL = 'FINAL',
}

export class CreateIncomeDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  clientId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(IncomeTypeEnum)
  incomeType?: IncomeTypeEnum;

  @IsOptional()
  @IsString()
  description?: string;
}
