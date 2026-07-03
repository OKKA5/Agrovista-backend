import { IsString, IsNumber, IsOptional, Min, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ParcelManaged } from "../../schemas/parcel.schema";

export class CreateParcelDto {
  @ApiProperty({ example: "North Field" })
  @IsString()
  parcelName!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  size!: number;

  @ApiProperty({ example: "corn", required: false })
  @IsOptional()
  @IsString()
  currentCropName?: string;

  @ApiProperty({ example: "EG1309" })
  @IsString()
  locationId!: string;

  @ApiProperty({ example: "corn", required: false })
  @IsOptional()
  @IsString()
  currentCropId?: string;

  @ApiProperty({ example: "2024-01-01", required: false })
  @IsOptional()
  @IsString()
  plantedOn?: string;

  @ApiProperty({ enum: ParcelManaged, default: ParcelManaged.AGROVISTA_MANAGED, required: false })
  @IsOptional()
  @IsEnum(ParcelManaged)
  managedType?: ParcelManaged;
}
