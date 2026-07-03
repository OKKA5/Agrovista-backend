import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SoilElementValueDto {
  @ApiProperty()
  @IsNumber()
  min: number;

  @ApiProperty()
  @IsNumber()
  max: number;

  @ApiProperty()
  @IsNumber()
  optimalMin: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  optimalMax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  optimal?: number;
}