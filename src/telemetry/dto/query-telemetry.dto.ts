import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsMongoId,
  IsEnum,
  IsString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export enum AlertStatusFilter {
  ACTIVE = "active",
  RESOLVED = "resolved",
}

export class QueryTelemetryDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011", required: false })
  @IsMongoId()
  @IsOptional()
  parcelId?: string;

  @ApiProperty({ example: "2026-04-01T00:00:00Z", required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: "2026-04-26T23:59:59Z", required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: 100, required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  offset?: number;
}

export class QueryAlertsDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011", required: false })
  @IsMongoId()
  @IsOptional()
  parcelId?: string;

  @ApiProperty({ enum: AlertStatusFilter, required: false })
  @IsEnum(AlertStatusFilter)
  @IsOptional()
  status?: AlertStatusFilter;

  @ApiProperty({ example: "info", required: false })
  @IsOptional()
  severity?: string;

  @ApiProperty({ example: 100, required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  offset?: number;
}
