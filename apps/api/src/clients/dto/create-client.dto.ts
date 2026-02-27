import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum ClientTypeEnum {
  GENERAL_CONTRACTOR = 'GENERAL_CONTRACTOR',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
}

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ClientTypeEnum)
  type!: ClientTypeEnum;

  @IsString()
  @IsOptional()
  paymentTerms?: string;
}
