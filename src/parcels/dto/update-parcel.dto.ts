import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ParcelManaged } from '../../schemas/parcel.schema';

export class UpdateParcelDto {
        @ApiProperty({ example: 'North Field', required: false })
        @IsOptional()
        @IsString()
        parcelName?: string;

        @ApiProperty({ example: 'EG1309', required: false })
        @IsOptional()
        @IsString()
        locationId?: string;

        @ApiProperty({ example: 100, required: false })
        @IsOptional()
        @IsNumber()
        @Min(0)
        size?: number;

        @ApiProperty({ example: 'corn', required: false })
        @IsOptional()
        @IsString()
        currentCropName?: string;

        @ApiProperty({ enum: ParcelManaged, required: false })
        @IsOptional()
        @IsEnum(ParcelManaged)
        managedType?: ParcelManaged;
}
