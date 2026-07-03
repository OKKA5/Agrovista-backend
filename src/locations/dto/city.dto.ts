import { ApiProperty } from '@nestjs/swagger';

export class CityDto {
        @ApiProperty({ example: 'EG1309' })
        _id!: string;

        @ApiProperty({ example: 'EG13' })
        parentId!: string;

        @ApiProperty({ example: '10 Ramadan 1' })
        nameEn!: string;

        @ApiProperty({ example: 'قسم اول مدينة العاشر من رمضان' })
        nameAr!: string;

        @ApiProperty({ example: 30.222 })
        lat!: number;

        @ApiProperty({ example: 31.732 })
        lon!: number;
}
