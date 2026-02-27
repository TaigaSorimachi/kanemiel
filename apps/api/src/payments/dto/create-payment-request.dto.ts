import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export enum PaymentCategoryEnum {
  SUBCONTRACTING = 'SUBCONTRACTING',
  MATERIAL = 'MATERIAL',
  EQUIPMENT = 'EQUIPMENT',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

export class CreatePaymentRequestDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  clientId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentCategoryEnum)
  category!: PaymentCategoryEnum;

  @IsDateString()
  desiredDate!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
