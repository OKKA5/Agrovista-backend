import { IsString, IsNumber, IsOptional, IsDateString, IsMongoId, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTelemetryDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  parcelId!: string;

  @ApiProperty({ example: '2026-04-26T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({ example: 45, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  soilNitrogen?: number;

  @ApiProperty({ example: 25, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  soilPhosphorus?: number;

  @ApiProperty({ example: 180, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  soilPotassium?: number;

  @ApiProperty({ example: 6.5, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(14)
  @IsOptional()
  soilPh?: number;

  @ApiProperty({ example: 22, required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  temperature?: number;

  @ApiProperty({ example: 65, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  @IsOptional()
  humidity?: number;

  @ApiProperty({ example: 5, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  soilMoisture?: number;

  @ApiProperty({ example: 'simulated-sensor-001' })
  @IsString()
  source!: string;
}