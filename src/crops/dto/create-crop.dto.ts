import {
        IsString,
        IsNumber,
        IsArray,
        ValidateNested,
        Min,
        IsOptional,
} from "class-validator";
import { plainToInstance, Transform, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { ThresholdDto } from "./thresholds.dto";

export class CreateCropDto {
        @ApiProperty({ example: "Wheat" })
        @IsString()
        name: string;

        @ApiProperty({ example: "Common grain crop", required: false })
        @IsString()
        description?: string;

        @ApiProperty({ example: 500 })
        @IsNumber()
        @Min(0)
        @Transform(({ value }) => (typeof value === "string" ? parseFloat(value) : value))
        acreProfit: number;

        @ApiProperty({ example: ["North", "South"], required: false })
        @IsOptional()
        @IsArray()
        schedule?: any[];

        @ApiProperty({ type: [ThresholdDto] })
        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => ThresholdDto)
        @Transform(({ value }) => {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                return Array.isArray(parsed)
                        ? parsed.map(item => plainToInstance(ThresholdDto, item))
                        : parsed;
        })
        thresholds: ThresholdDto[];
}
