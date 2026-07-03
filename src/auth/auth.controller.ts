import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  UseGuards,
  UseInterceptors,
  Patch,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { VerifyEmailDto } from "./dto/verifyEmail.dto";
import { PlatformGuard } from "../guards/platform.guard";
import { AuthResponseInterceptor } from "../interceptors/auth-response.interceptor";
import { ExtractRefreshToken } from "../decorators/extract-refresh-token.decorator";
import { PlatformExtractor } from "../decorators/platform.decorator";
import { Platform } from "../schemas/refresh-token.schema";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@ApiTags("auth")
@Controller("auth")
@UseGuards(PlatformGuard)
@UseInterceptors(AuthResponseInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: "User already exists" })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login as a regular user" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @PlatformExtractor() platform: Platform,
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, platform);
  }

  @Post("admin-login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login as an admin" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async adminLogin(
    @PlatformExtractor() platform: Platform,
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.adminLogin(loginDto, platform);
  }


  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({
    status: 200,
    description: "Token refreshed",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid token" })
  async refresh(
    @ExtractRefreshToken() refreshTokenDto: RefreshTokenDto,
    @PlatformExtractor() platform: Platform,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(
      refreshTokenDto.refreshToken,
      platform,
    );
  }

  @Post("verify-email")
  @UsePipes(new ValidationPipe({ whitelist: true }))
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post("resend-code")
  async resendVerificationCode(@Body("email") email: string) {
    return this.authService.resendVerificationCode(email);
  }

  @Post("forgot-password")
  async forgotPassword(@Body("email") email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post("reset-password")
  async resetPassword(
    @Body()
    dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  @Patch("change-password")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Change password (requires current password)" })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 400, description: "Invalid current password or same password" })
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, req.user.role, dto);
  }

  @Patch("save-fcm-token")
  @UseGuards(JwtAuthGuard)
  async saveFcmToken(
    @Req() req: any,
    @Body() body: { fcmToken: string; deviceId: string },
  ) {
    const userId = req.user.userId;

    return this.authService.saveFcmToken(userId, req.user.role, body.deviceId, body.fcmToken);
  }
}
