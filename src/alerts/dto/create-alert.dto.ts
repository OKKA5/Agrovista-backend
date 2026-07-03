import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsMongoId, ValidateNested, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AlertSeverityDto {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertStatusDto {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
}

export class ThresholdValueDto {
  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  min!: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  max!: number;

  @ApiProperty({ example: 30, required: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  optimalMin?: number;

  @ApiProperty({ example: 70, required: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  optimalMax?: number;
}

export class CreateAlertDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  parcelId!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439022' })
  @IsMongoId()
  cropId!: string;

  @ApiProperty({ example: 'N' })
  @IsString()
  element!: string;

  @ApiProperty({ type: ThresholdValueDto })
  @ValidateNested()
  @Type(() => ThresholdValueDto)
  thresholdValue!: ThresholdValueDto;

  @ApiProperty({ example: 15 })
  @IsNumber()
  actualValue!: number;

  @ApiProperty({ enum: AlertSeverityDto })
  @IsEnum(AlertSeverityDto)
  severity!: AlertSeverityDto;

  @ApiProperty({ example: 'Nitrogen level below minimum threshold' })
  @IsString()
  message!: string;

  @ApiProperty({ example: ['in-app'], required: false })
  @IsArray()
  @IsOptional()
  notifiedVia?: string[];
}

export class UpdateAlertStatusDto {
  @ApiProperty({ enum: AlertStatusDto })
  @IsEnum(AlertStatusDto)
  status!: AlertStatusDto;
}