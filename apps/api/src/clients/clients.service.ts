import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, type?: string) {
    const where: Prisma.ClientWhereInput = { companyId };

    if (type) {
      where.type = type as 'GENERAL_CONTRACTOR' | 'SUBCONTRACTOR';
    }

    return this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        paymentTerms: dto.paymentTerms,
      },
    });
  }
}
