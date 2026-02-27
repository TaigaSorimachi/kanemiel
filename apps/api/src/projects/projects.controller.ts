import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator.js';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.projectsService.findAll(
      user.companyId,
      user.id,
      user.role,
    );
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.projectsService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('owner', 'accounting')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProjectDto,
  ) {
    const data = await this.projectsService.create(user.companyId, dto);
    return { success: true, data, message: '現場を登録しました' };
  }

  @Patch(':id')
  @Roles('owner', 'accounting')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const data = await this.projectsService.update(id, dto);
    return { success: true, data, message: '現場を更新しました' };
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    const data = await this.projectsService.getTimeline(id);
    return { success: true, data };
  }
}
