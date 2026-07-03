import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationService, ThresholdCheck } from './evaluation.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('evaluation')
@Controller('evaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('run')
  @ApiOperation({ summary: 'Trigger evaluation for all parcels' })
  @ApiResponse({ status: 200, description: 'Evaluation complete' })
  async runEvaluation() {
    return this.evaluationService.evaluateAllParcels();
  }

  @Get('parcel/:parcelId')
  @ApiOperation({ summary: 'Evaluate single parcel' })
  @ApiResponse({ status: 200, description: 'Violations found' })
  @ApiResponse({ status: 404, description: 'Parcel or crop not found' })
  async evaluateParcel(@Param('parcelId') parcelId: string) {
    return this.evaluationService.evaluateParcel(parcelId);
  }
}