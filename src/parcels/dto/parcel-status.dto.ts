import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ParcelStatus } from '../../schemas/parcel.schema';

export class ParcelStatusDto {
  @ApiProperty({ enum: ParcelStatus })
  @IsEnum(ParcelStatus)
  status!: ParcelStatus;
}