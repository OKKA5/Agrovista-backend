import {
        Controller,
        Get,
        Post,
        Body,
        UseGuards,
        UseFilters,
        Patch,
        Param,
        UseInterceptors,
        UploadedFile,
        BadRequestException,
        NotFoundException,
} from "@nestjs/common";
import {
        ApiTags,
        ApiOperation,
        ApiResponse,
        ApiBearerAuth,
        ApiBody,
} from "@nestjs/swagger";
import { CropsService } from "./crops.service";
import { CreateCropDto } from "./dto/create-crop.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UpdateCropDto } from "./dto/update-crop.dto";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("crops")
@Controller("crops")
export class CropsController {
        constructor(private readonly cropsService: CropsService) { }

        @Get()
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles("USER", "ADMIN", "SUPER_ADMIN")
        @ApiOperation({ summary: "List all crops" })
        @ApiResponse({ status: 200, description: "List of crops" })
        async findAll() {
                return this.cropsService.findAll();
        }

        @Get(':id')
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles("USER", "ADMIN", "SUPER_ADMIN")
        @ApiOperation({ summary: "Get crop by ID" })
        @ApiResponse({ status: 200, description: "Crop details" })
        @ApiResponse({ status: 404, description: "Crop not found" })
        async findOne(@Param('id') id: string) {
                const crop = await this.cropsService.findById(id);
                if (!crop) {
                        throw new NotFoundException(`Crop with ID ${id} not found`);
                }
                return crop;
        }

        @Post("create-crop")
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles("ADMIN", "SUPER_ADMIN")
        @ApiBearerAuth()
        @ApiOperation({ summary: "Create a new crop" })
        @ApiResponse({ status: 201, description: "Crop created" })
        @UseInterceptors(FileInterceptor('image'))
        async createCrop(
                @Body() createCropDto: CreateCropDto,
                @UploadedFile() image: Express.Multer.File,

        ) {
                if (!image) {
                        throw new BadRequestException('Image is required');
                }
                return this.cropsService.createCrop(createCropDto, image);
        }

        @Patch("update-crop/:id")
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles("ADMIN", "SUPER_ADMIN")
        @ApiBearerAuth()
        @ApiOperation({ summary: "Create a new crop" })
        @ApiResponse({ status: 201, description: "Crop created" })
        @ApiBody({ type: UpdateCropDto })
        @UseInterceptors(FileInterceptor('image'))

        async updateCrop(
                @Param('id') id: string,
                @Body() updateCropDto: UpdateCropDto,
                @UploadedFile() file?: Express.Multer.File,
        ) {
                return this.cropsService.updateCrop(id, updateCropDto, file);
        }

        @Post(':id/add-schedule')
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles("ADMIN", "SUPER_ADMIN")
        @ApiBearerAuth()
        @ApiOperation({ summary: "Add a schedule to a crop" })
        @ApiResponse({ status: 201, description: "Schedule added to crop" })
        @ApiBody({ type: CreateScheduleDto })
        async addSchedule(
                @Param('id') id: string,
                @Body() createScheduleDto: CreateScheduleDto,
        ) {
                return this.cropsService.addSchedule(id, createScheduleDto);
        }
}
