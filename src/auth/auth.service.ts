import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { User, UserDocument, UserStatus } from "../schemas/user.schema";
import { Admin, AdminDocument } from "../schemas/admin.schema";
import { RefreshToken, RefreshTokenDocument } from "../schemas/refresh-token.schema";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { MailService } from "../mail/mail.service";
import { VerifyEmailDto } from "./dto/verifyEmail.dto";
import { TokensService } from "./token.service";
import { Platform } from "../schemas/refresh-token.schema";
import { LocationsService } from "../locations/locations.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    private MailService: MailService,
    private tokensService: TokensService,
    private readonly locationsService: LocationsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });

    if (existingUser) {
      if (existingUser.IsVerified) {
        throw new ConflictException("User with this email already exists");
      }

      await this.locationsService.validateId(registerDto.locationId, [2]);

      const passwordHash = await bcrypt.hash(registerDto.password, 10);
      const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await bcrypt.hash(rawCode, 10);
      const codeExpire = Date.now() + 1000 * 60 * 10;

      Object.assign(existingUser, registerDto, {
        passwordHash,
        verificationCode: hashedCode,
        verificationCodeExpire: codeExpire,
        IsVerified: false,
        status: UserStatus.PENDING_FOR_VERIFICATION,
      });

      await existingUser.save();

      await this.MailService.sendVerificationCode(
        registerDto.email,
        rawCode,
        "Email verification code",
      );

      return {
        message: "Registration successful. Please verify your email.",
      };
    }

    await this.locationsService.validateId(registerDto.locationId, [2]);

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);
    const codeExpire = Date.now() + 1000 * 60 * 10;

    const user = new this.userModel({
      ...registerDto,
      passwordHash,
      verificationCode: hashedCode,
      verificationCodeExpire: codeExpire,
      isVerified: false,
    });

    await user.save();

    await this.MailService.sendVerificationCode(
      registerDto.email,
      rawCode,
      "Email verification code",
    );

    return {
      message: "Registration successful. Please verify your email.",
    };
  }

  private async findUserById(userId: string, role: string): Promise<any | null> {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return this.adminModel.findById(userId);
    }
    return this.userModel.findById(userId);
  }

  async login(
    loginDto: LoginDto,
    platform: Platform,
  ): Promise<AuthResponseDto> {
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (!user.IsVerified) {
      throw new UnauthorizedException("Please verify your email first");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.tokensService.generateTokens(user, platform, undefined, false);
  }

  async adminLogin(
    loginDto: LoginDto,
    platform: Platform,
  ): Promise<AuthResponseDto> {
    const admin = await this.adminModel.findOne({
      email: loginDto.email
    });
    if (!admin) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const mustChangePassword = admin.tempPassword === true;

    return this.tokensService.generateTokens(admin, platform, undefined, mustChangePassword);
  }



  async refreshToken(
    refreshToken: string,
    platform: string,
  ): Promise<AuthResponseDto> {
    const { userId, sessionId, role } =
      await this.tokensService.validateAndRotate(refreshToken);

    const user = await this.findUserById(userId, role);
    if (!user) throw new UnauthorizedException("User not found");

    return this.tokensService.generateTokens(user, platform, sessionId);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // ⏰ Check expiration
    if (
      !user.verificationCodeExpire ||
      user.verificationCodeExpire < Date.now()
    ) {
      throw new UnauthorizedException("Verification code expired");
    }
    if (!user.verificationCode) {
      throw new UnauthorizedException("No verification code found");
    }
    // 🔐 Compare hashed code
    const isCodeValid = await bcrypt.compare(dto.code, user.verificationCode);

    if (!isCodeValid) {
      throw new UnauthorizedException("Invalid verification code");
    }

    user.IsVerified = true;
    user.status = UserStatus.ACTIVE;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;

    await user.save();

    return { message: "Email verified successfully" };
  }

  async resendVerificationCode(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // If already verified
    if (!user.verificationCode && !user.verificationCodeExpire) {
      throw new BadRequestException("Email already verified");
    }

    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);
    const codeExpire = Date.now() + 1000 * 60 * 10;

    user.verificationCode = hashedCode;
    user.verificationCodeExpire = codeExpire;

    await user.save();

    const message = "Your new verification code";

    await this.MailService.sendVerificationCode(email, rawCode, message);

    return { message: "A new verification code has been sent to your email." };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);
    const codeExpire = Date.now() + 1000 * 60 * 10;

    user.verificationCode = hashedCode;
    user.verificationCodeExpire = codeExpire;

    await user.save();

    const message = "Password reset verification code";

    await this.MailService.sendVerificationCode(email, rawCode, message);

    console.log(`Reset code for ${email}: ${rawCode}`);

    return { message: "Password reset code sent to your email" };
  }

  async resetPassword(dto: {
    email: string;
    newPassword: string;
    verificationCode: string;
  }) {
    const { email, newPassword, verificationCode } = dto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.verificationCode || !user.verificationCodeExpire) {
      throw new BadRequestException("No verification code found");
    }

    if (user.verificationCodeExpire < Date.now()) {
      throw new BadRequestException("Verification code has expired");
    }

    const isCodeValid = await bcrypt.compare(
      verificationCode,
      user.verificationCode,
    );

    if (!isCodeValid) {
      throw new BadRequestException("Invalid verification code");
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (isSamePassword) {
      throw new BadRequestException(
        "New password cannot be the same as the old password",
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;

    await user.save();

    await this.tokensService.revokeAllForUser(user._id);

    return { message: "Password reset successful" };
  }

  async changePassword(userId: string, role: string, dto: ChangePasswordDto) {
    const user = await this.findUserById(userId, role);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);

    if (isSamePassword) {
      throw new BadRequestException(
        "New password cannot be the same as the current password",
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.tempPassword = false;
    user.passwordChangedAt = new Date();

    await user.save();

    await this.tokensService.revokeAllForUser(user._id);

    return { message: "Password changed successfully. Please log in again." };
  }

  async saveFcmToken(userId: string, role: string, deviceId: string, token: string) {
    const model: any = role === "ADMIN" || role === "SUPER_ADMIN" ? this.adminModel : this.userModel;

    const user = await model.findOne({
      _id: userId,
      "fcms.deviceId": deviceId,
    });

    if (user) {
      return model.findOneAndUpdate(
        {
          _id: userId,
          "fcms.deviceId": deviceId,
        },
        {
          $set: {
            "fcms.$.fcmToken": token,
          },
        },
        { new: true },
      );
    }

    return model.findByIdAndUpdate(
      userId,
      {
        $push: {
          fcms: {
            deviceId,
            fcmToken: token,
          },
        },
      },
      { new: true },
    );
  }

  @Cron("*/5 * * * *")
  async cleanExpiredUnverifiedUsers() {
    const now = Date.now();

    const expiredUsers = await this.userModel.find({
      IsVerified: false,
      verificationCodeExpire: { $lt: now },
    });

    if (expiredUsers.length === 0) return;

    const userIds = expiredUsers.map((u) => (u as any)._id);

    await Promise.all([
      this.userModel.deleteMany({ _id: { $in: userIds } }),
      this.refreshTokenModel.deleteMany({ userId: { $in: userIds } }),
    ]);

    this.logger.log(`Deleted ${expiredUsers.length} expired unverified user(s)`);
  }
}
