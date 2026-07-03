import {
        Controller,
        Get,
        Post,
        Patch,
        Delete,
        Body,
        Param,
        Query,
        UseGuards,
        UseInterceptors,
        UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ParcelsService } from './parcels.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelDto } from './dto/update-parcel.dto';
import { AssignCropDto } from './dto/assign-crop.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('parcels')
@Controller('parcels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ParcelsController {
        constructor(private readonly parcelsService: ParcelsService) { }

        @Post()
        @UseInterceptors(FileInterceptor('contract'))
        @ApiConsumes('multipart/form-data')
        @ApiOperation({ summary: 'Create a new parcel with contract' })
        @ApiResponse({ status: 201, description: 'Parcel created' })
        @ApiResponse({ status: 400, description: 'Invalid file or parcel data' })
        async create(
                @Body() createParcelDto: CreateParcelDto,
                @UploadedFile() file: Express.Multer.File,
                @CurrentUser() user: { userId: string },
        ) {
                return this.parcelsService.create(createParcelDto, file, user.userId);
        }

        @Get()
        @ApiOperation({ summary: 'List all parcels' })
        @ApiResponse({ status: 200, description: 'List of parcels' })
        async findAll(@CurrentUser() user: { userId: string; role: string }) {
                if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                        return this.parcelsService.findAll();
                }
                return this.parcelsService.findAll(user.userId);
        }

        @Get('pending')
        @ApiOperation({ summary: 'List pending parcels' })
        @ApiResponse({ status: 200, description: 'List of pending parcels' })
        @UseGuards(RolesGuard)
        @Roles('ADMIN', 'SUPER_ADMIN')
        async findPending() {
                return this.parcelsService.findPending();
        }

        @Get(':id')
        @ApiOperation({ summary: 'Get parcel details' })
        @ApiResponse({ status: 200, description: 'Parcel details' })
        @ApiResponse({ status: 404, description: 'Parcel not found' })
        async findOne(
                @Param('id', new ParseMongoIdPipe()) id: string
        ) {
                return this.parcelsService.findOne(id);
        }

        @Patch(':id')
        @UseInterceptors(FileInterceptor('contract'))
        @ApiConsumes('multipart/form-data')
        @ApiOperation({ summary: 'Update a parcel with new contract' })
        @ApiResponse({ status: 200, description: 'Parcel updated' })
        @ApiResponse({ status: 400, description: 'Invalid file or parcel data' })
        @ApiResponse({ status: 404, description: 'Parcel not found' })
        async update(
                @Param('id', new ParseMongoIdPipe()) id: string,
                @Body() updateParcelDto: UpdateParcelDto,
                @UploadedFile() file: Express.Multer.File,
                @CurrentUser() user: { userId: string }
        ) {
                return this.parcelsService.update(
                        id,
                        updateParcelDto,
                        file,
                        user.userId
                );
        }

        @Delete(':id')
        @ApiOperation({ summary: 'Delete a parcel' })
        @ApiResponse({ status: 200, description: 'Parcel deleted' })
        @ApiResponse({ status: 404, description: 'Parcel not found' })
        async delete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
                await this.parcelsService.delete(id, user.userId);
                return { message: 'Parcel deleted successfully' };
        }

        @Patch(':id/approve')
        @ApiOperation({ summary: 'Approve a parcel' })
        @ApiResponse({ status: 200, description: 'Parcel approved' })
        @UseGuards(RolesGuard)
        @Roles('ADMIN', 'SUPER_ADMIN')
        async approve(
                @Param('id', new ParseMongoIdPipe()) id: string,
                @CurrentUser() user: { userId: string }
        ) {
                return this.parcelsService.approve(id);
        }

        @Patch(':id/reject')
        @ApiOperation({ summary: 'Reject a parcel' })
        @ApiResponse({ status: 200, description: 'Parcel rejected' })
        @UseGuards(RolesGuard)
        @Roles('ADMIN', 'SUPER_ADMIN')
        async reject(
                @Param('id', new ParseMongoIdPipe()) id: string,
                @CurrentUser() user: { userId: string }
        ) {
                return this.parcelsService.reject(id);
        }

        @Patch(':id/crop')
        @ApiOperation({ summary: 'Assign crop to parcel' })
        @ApiResponse({ status: 200, description: 'Crop assigned to parcel' })
        async assignCrop(
                @Param('id', new ParseMongoIdPipe()) id: string,
                @Body() assignCropDto: AssignCropDto
        ) {
                return this.parcelsService.assignCrop(
                        id,
                        assignCropDto.cropId,
                        assignCropDto.plantedOn ? new Date(assignCropDto.plantedOn) : undefined
                );
        }

        @Post(':id/request-moderator')
        @ApiOperation({ summary: 'Request a moderator for parcel (owner only)' })
        @ApiResponse({ status: 200, description: 'Request sent to admins' })
        @ApiResponse({ status: 403, description: 'Not the parcel owner' })
        async requestModerator(
                @Param('id', new ParseMongoIdPipe()) id: string,
                @CurrentUser() user: { userId: string },
        ) {
                return this.parcelsService.requestModerator(id, user.userId);
        }

        @Post(':id/assign-moderator')
        @ApiOperation({ summary: 'Assign moderator to parcel (admin only)' })
        @ApiResponse({ status: 200, description: 'Moderator assigned' })
        @ApiResponse({ status: 404, description: 'Parcel or moderator not found' })
        @UseGuards(RolesGuard)
        @Roles('ADMIN', 'SUPER_ADMIN')
        async assignModerator(
                @Param('id', new ParseMongoIdPipe()) id: string,
                @Body('moderatorId', new ParseMongoIdPipe()) moderatorId: string,
        ) {
                return this.parcelsService.assignModerator(id, moderatorId);
        }

}
