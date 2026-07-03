import { Controller, Get, Param, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RecommendationsService } from "./recommendations.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

@ApiTags("recommendations")
@Controller("recommendations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get("parcel/:parcelId")
  @ApiOperation({ summary: "Get crop recommendations for a specific parcel" })
  @ApiResponse({ status: 200, description: "Ranked crop recommendations" })
  @ApiResponse({ status: 403, description: "Not the parcel owner" })
  @ApiResponse({ status: 404, description: "Parcel not found" })
  async getParcelRecommendations(
    @Param("parcelId") parcelId: string,
    @Request() req: any,
  ) {
    return this.recommendationsService.recommendCrops(parcelId, req.user.userId);
  }
}