import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignCropDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  cropId!: string;

  @ApiProperty({ example: '2026-04-26T00:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  plantedOn?: string;
}