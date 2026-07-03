import { ApiProperty } from '@nestjs/swagger';

export class GovernorateDto {
        @ApiProperty({ example: 'EG13' })
        _id!: string;

        @ApiProperty({ example: 'Sharkia' })
        nameEn!: string;

        @ApiProperty({ example: 'الشرقية' })
        nameAr!: string;
}
