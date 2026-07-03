import {
        Controller,
        Get,
        Post,
        Patch,
        Delete,
        Param,
        Body,
        UseGuards,
        Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserDto } from './dto/user.dto';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
        NotificationService: any;
        constructor(private readonly usersService: UsersService) { }

        @Get('me')
        @ApiOperation({ summary: 'Get current user profile' })
        @ApiResponse({ status: 200, description: 'Current user profile', type: UserDto })
        async getProfile(
                @CurrentUser() user: { userId: string; email: string; role: string },
        ): Promise<UserDto> {
                const profile = await this.usersService.getProfile(user.userId, user.role);
                const { _id, passwordHash, __v, ...rest } = profile.toObject();
                return {
                        id: _id.toString(),
                        ...rest
                };
        }

        @Patch('update-profile')
        @ApiOperation({ summary: 'Update current user profile' })
        @ApiResponse({ status: 200, description: 'Profile updated', type: UserDto })
        async updateProfile(
                @CurrentUser() user: { userId: string; email: string; role: string },
                @Body() dto: UpdateProfileDto,
        ): Promise<UserDto> {
                const updated = await this.usersService.updateProfile(user.userId, user.role, dto);
                const { _id, passwordHash, __v, ...rest } = updated.toObject();
                return {
                        id: _id.toString(),
                        ...rest
                };
        }

        @Get()
        @ApiOperation({ summary: 'List all users (admin only)' })
        @ApiResponse({ status: 200, description: 'List of users' })
        @Roles('ADMIN', 'SUPER_ADMIN')
        async findAll() {
                return this.usersService.findAll();
        }

        @Patch('update-status/:id')
        @ApiOperation({ summary: 'Update user status (admin only)' })
        @ApiResponse({ status: 200, description: 'User status updated' })
        @ApiResponse({ status: 404, description: 'User not found' })
        @Roles('ADMIN', 'SUPER_ADMIN')
        async updateStatus(
                @Param('id', new ParseMongoIdPipe()) id: string,
                @Body() updateUserStatusDto: UpdateUserStatusDto,
        ) {

                return this.usersService.updateStatus(id, updateUserStatusDto);
        }

        @Get('moderators/discover')
        @ApiOperation({ summary: 'Discover moderators for a parcel (admin only)' })
        @ApiResponse({ status: 200, description: 'Tiered list of available moderators' })
        @Roles('ADMIN', 'SUPER_ADMIN')
        async discoverModerators(@Query('parcelId') parcelId: string) {
                return this.usersService.discoverModerators(parcelId);
        }

        @Post('create-admin')
        @ApiOperation({ summary: 'Create a new admin (super admin only)' })
        @ApiResponse({ status: 201, description: 'Admin created with temporary password' })
        @Roles('SUPER_ADMIN')
        async createAdmin(
                @Body() createAdminDto: CreateAdminDto,
        ) {
                return this.usersService.createAdmin(createAdminDto);
        }


        @Patch('me/moderator-availability')
        @ApiOperation({ summary: 'Toggle moderator availability for current user' })
        @ApiResponse({ status: 200, description: 'Availability toggled', type: UserDto })
        async toggleModeratorAvailability(
                @CurrentUser() user: { userId: string; email: string; role: string },
        ): Promise<UserDto> {
                const updated = await this.usersService.toggleModeratorAvailability(user.userId, user.role);
                const { _id, passwordHash, __v, ...rest } = updated.toObject();
                return {
                        id: _id.toString(),
                        ...rest
                };
        }

}
