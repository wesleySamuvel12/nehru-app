import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';

@ApiTags('timetable')
@Controller('timetable')
export class TimetableController {
  constructor(private readonly service: TimetableService) {}

  @Get()
  @ApiOperation({ summary: 'Get all timetable' })
  async findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single timetable item' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create timetable' })
  async create(@Body() data: any) {
    return this.service.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update timetable' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete timetable' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
