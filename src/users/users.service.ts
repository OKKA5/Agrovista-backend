import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import {
  User,
  UserDocument,
  UserRole,
  UserStatus,
} from "../schemas/user.schema";
import { Admin, AdminDocument } from "../schemas/admin.schema";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { LocationsService } from "../locations/locations.service";
import { ParcelsService } from "../parcels/parcels.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private readonly locationsService: LocationsService,
    @Inject(forwardRef(() => ParcelsService))
    private readonly parcelsService: ParcelsService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel
      .find()
      .select(
        "firstName lastName email phoneNumber role status isModerator IsVerified",
      )
      .exec();
  }

  async getProfile(userId: string, role: string): Promise<any> {
    const model: any =
      role === "ADMIN" || role === "SUPER_ADMIN"
        ? this.adminModel
        : this.userModel;
    const user = await model.findById(userId).select("-passwordHash").exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async updateProfile(
    userId: string,
    role: string,
    dto: UpdateProfileDto,
  ): Promise<any> {
    const model: any =
      role === "ADMIN" || role === "SUPER_ADMIN"
        ? this.adminModel
        : this.userModel;
    const user = await model.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.locationId !== undefined) user.locationId = dto.locationId;

    return user.save();
  }

  async findOne(id: string): Promise<any> {
    const user = await this.userModel
      .findById(id)
      .select("-passwordHash")
      .exec();
    if (user) return user;

    const admin = await this.adminModel
      .findById(id)
      .select("-passwordHash")
      .exec();
    if (admin) return admin;

    throw new NotFoundException(`User with ID ${id} not found`);
  }

  async updateStatus(
    id: string,
    updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.status = updateUserStatusDto.status;
    return user.save();
  }

  async activate(id: string): Promise<User> {
    return this.updateStatus(id, { status: UserStatus.ACTIVE });
  }

  async suspend(id: string): Promise<User> {
    return this.updateStatus(id, { status: UserStatus.SUSPENDED });
  }

  async createAdmin(
    dto: CreateAdminDto,
  ): Promise<{ admin: Admin; tempPassword: string }> {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new BadRequestException("User with this email already exists");
    }
    const existingAdmin = await this.adminModel.findOne({ email: dto.email });
    if (existingAdmin) {
      throw new BadRequestException("Admin with this email already exists");
    }

    const tempPassword = crypto.randomBytes(6).toString("base64").slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const admin = await this.adminModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber || "",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      tempPassword: true,
    });

    return { admin, tempPassword };
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    let user = await this.userModel.findById(id).exec();
    if (user) {
      await this.userModel.findByIdAndDelete(id).exec();
      return { message: "User deleted successfully" };
    }

    const admin = await this.adminModel.findById(id).exec();
    if (admin) {
      await this.adminModel.findByIdAndDelete(id).exec();
      return { message: "User deleted successfully" };
    }

    throw new NotFoundException(`User with ID ${id} not found`);
  }

  async discoverModerators(parcelId: string) {
    const parcel = await this.parcelsService.findOne(parcelId);
    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const parcelLoc = await this.locationsService.findById(parcel.locationId);
    if (!parcelLoc) {
      throw new NotFoundException(
        `Parcel location ${parcel.locationId} not found`,
      );
    }

    const baseQuery = {
      isModerator: true,
      status: UserStatus.ACTIVE,
    };

    console.log("parcelid: ", parcel.locationId);

    const exact = await this.userModel
      .find({ ...baseQuery, locationId: parcel.locationId })
      .select("-passwordHash")
      .lean();

    console.log("exact: \n", exact);

    const adjacentIds = parcelLoc.adjacencyIds || [];
    const adjacent =
      adjacentIds.length > 0
        ? await this.userModel
            .find({ ...baseQuery, locationId: { $in: adjacentIds } })
            .select("-passwordHash")
            .lean()
        : [];

    const excludeIds = [parcel.locationId, ...adjacentIds];
    const governorateCities =
      await this.locationsService.getCitiesByGovernorate(parcelLoc.parentId);
    const govCityIds = governorateCities.map((c) => c._id);

    const governorate = await this.userModel
      .find({
        ...baseQuery,
        locationId: { $in: govCityIds, $nin: excludeIds },
      })
      .select("-passwordHash")
      .lean();

    return [...exact, ...adjacent, ...governorate];
  }

  async findAllAdmins(): Promise<Admin[]> {
    return this.adminModel
      .find({ role: { $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } })
      .select("-passwordHash")
      .exec();
  }

  async findNextAvailableAdmin(): Promise<Admin> {
    const admins = await this.adminModel
      .find({ role: UserRole.ADMIN })
      .select("-passwordHash")
      .exec();

    if (admins.length === 0) {
      throw new NotFoundException("No admin users found");
    }

    return admins[Math.floor(Math.random() * admins.length)];
  }

  async toggleModeratorAvailability(id: string, role: string): Promise<any> {
    const model: any =
      role === "ADMIN" || role === "SUPER_ADMIN"
        ? this.adminModel
        : this.userModel;
    const user = await model.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.isModerator = !user.isModerator;
    return user.save();
  }
}
