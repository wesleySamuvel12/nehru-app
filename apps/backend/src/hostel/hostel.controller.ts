import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HostelService } from './hostel.service';

@ApiTags('hostel')
@Controller('hostel')
export class HostelController {
  constructor(private readonly service: HostelService) {}

  @Get()
  @ApiOperation({ summary: 'Get all hostel' })
  async findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single hostel item' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create hostel' })
  async create(@Body() data: any) {
    return this.service.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update hostel' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete hostel' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
