import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { GovernorateDto } from './dto/governorate.dto';
import { CityDto } from './dto/city.dto';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
        constructor(private readonly locationsService: LocationsService) { }

        @Get('gov')
        @ApiOperation({ summary: 'Get all governorates' })
        @ApiResponse({ status: 200, description: 'List of governorates', type: [GovernorateDto] })
        async getGovernorates() {
                // Return plain objects, let @nestjs/swagger infer from @ApiResponse
                const gov = await this.locationsService.getGovernorates();
                return gov.map(g => ({
                        _id: g._id,
                        nameEn: g.nameEn,
                        nameAr: g.nameAr,
                }));
        }


        @Get('cities')
        @ApiOperation({ summary: 'Get cities by governorate' })
        @ApiResponse({ status: 200, description: 'List of cities', type: [CityDto] })
        async getCities(@Query('gov-id') govId: string) {
                const cities = await this.locationsService.getCitiesByGovernorate(govId);
                return cities.map(c => ({
                        _id: c._id,
                        parentId: c.parentId,
                        nameEn: c.nameEn,
                        nameAr: c.nameAr,
                        lat: c.centroid.coordinates[1],
                        lon: c.centroid.coordinates[0],
                }));
        }
}
