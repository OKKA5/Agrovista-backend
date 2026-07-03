import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { QueryTelemetryDto } from './dto/query-telemetry.dto';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';

@ApiTags('telemetry')
@Controller('telemetry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('insert-parcel-telemetry')
  @ApiOperation({ summary: 'Submit telemetry reading' })
  @ApiResponse({ status: 201, description: 'Telemetry reading created' })
  async create(@Body() createTelemetryDto: CreateTelemetryDto) {
    return this.telemetryService.create(createTelemetryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get telemetry readings with filters' })
  @ApiResponse({ status: 200, description: 'List of telemetry readings' })
  async findAll(@Query() query: QueryTelemetryDto) {
    return this.telemetryService.findAll(query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest telemetry reading for a parcel' })
  @ApiResponse({ status: 200, description: 'Latest telemetry reading' })
  async findLatest(@Query('parcelId') parcelId: string) {
    return this.telemetryService.findLatest(parcelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get telemetry reading by ID' })
  @ApiResponse({ status: 200, description: 'Telemetry reading' })
  async findById(@Param('id', new ParseMongoIdPipe()) id: string) {
    return this.telemetryService.findById(id);
  }
}