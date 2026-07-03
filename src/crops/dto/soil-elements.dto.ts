import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { SoilElementValueDto } from "./soil-element-value.dto";

export class SoilElementsDto {

  @ApiProperty({ type: SoilElementValueDto })
  @ValidateNested()
  @Type(() => SoilElementValueDto)
  N: SoilElementValueDto;

  @ApiProperty({ type: SoilElementValueDto })
  @ValidateNested()
  @Type(() => SoilElementValueDto)
  P: SoilElementValueDto;

  @ApiProperty({ type: SoilElementValueDto })
  @ValidateNested()
  @Type(() => SoilElementValueDto)
  K: SoilElementValueDto;

  @ApiProperty({ type: SoilElementValueDto })
  @ValidateNested()
  @Type(() => SoilElementValueDto)
  ph: SoilElementValueDto;

  @ApiProperty({ type: SoilElementValueDto })
  @ValidateNested()
  @Type(() => SoilElementValueDto)
  temperature: SoilElementValueDto;

  @ApiProperty({ type: SoilElementValueDto })
  @ValidateNested()
  @Type(() => SoilElementValueDto)
  humidity: SoilElementValueDto;

  @ApiProperty({ type: SoilElementValueDto })
  @ValidateNested()
  @Type(() => SoilElementValueDto)
  soilMoisture: SoilElementValueDto;
}
