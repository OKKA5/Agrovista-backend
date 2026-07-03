import { IsString, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SoilElementsDto } from './soil-elements.dto';

export class ThresholdDto {
  @ApiProperty({ example: 'Germination Stage' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  stage: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  validFrom: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  validTo: number;

  @ApiProperty({ type: SoilElementsDto })
  @ValidateNested()
  @Type(() => SoilElementsDto)
  soilElements: SoilElementsDto;
}