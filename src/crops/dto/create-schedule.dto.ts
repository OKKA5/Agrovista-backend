import { IsString, IsArray, IsNumber, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class DatePointDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  day: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  month: number;
}

class SowingDto {
  @ApiProperty({ type: DatePointDto })
  @ValidateNested()
  @Type(() => DatePointDto)
  early: DatePointDto;

  @ApiProperty({ type: DatePointDto })
  @ValidateNested()
  @Type(() => DatePointDto)
  late: DatePointDto;
}

class HarvestDto {
  @ApiProperty({ type: DatePointDto })
  @ValidateNested()
  @Type(() => DatePointDto)
  early: DatePointDto;

  @ApiProperty({ type: DatePointDto })
  @ValidateNested()
  @Type(() => DatePointDto)
  late: DatePointDto;
}

export class CreateScheduleDto {
  @ApiProperty({ example: ["North", "South"] })
  @IsArray()
  @IsString({ each: true })
  regions: string[];

  @ApiProperty({ type: SowingDto })
  @ValidateNested()
  @Type(() => SowingDto)
  sowing: SowingDto;

  @ApiProperty({ type: HarvestDto })
  @ValidateNested()
  @Type(() => HarvestDto)
  harvest: HarvestDto;

  @ApiProperty({ example: 120, required: false })
  @IsOptional()
  @IsNumber()
  growingPeriodMin?: number;

  @ApiProperty({ example: 180, required: false })
  @IsOptional()
  @IsNumber()
  growingPeriodMax?: number;
}