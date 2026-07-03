import {
  Controller,
  Get,
  UseGuards,
  Param,
  Query,
  Req,
  Patch,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { QueryAlertsDto } from "../telemetry/dto/query-telemetry.dto";
import { AlertsService } from "./alerts.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { ParseMongoIdPipe } from "../pipes/parse-mongo-id.pipe";

@ApiTags("alerts")
@Controller("alerts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get("my-alerts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get alerts for current user" })
  @ApiResponse({ status: 200, description: "List of alerts" })
  async findAll(
    @Query() query: QueryAlertsDto,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const parcelId = query.parcelId || "";
    return this.alertsService.findAllAlertsByUser(
      parcelId,
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Patch(":id/acknowledge")
  @ApiOperation({ summary: "Acknowledge an alert" })
  @ApiResponse({ status: 200, description: "Alert acknowledged" })
  async acknowledge(
    @Param("id", new ParseMongoIdPipe()) id: string,
    @Req() req: any,
  ) {
    return this.alertsService.acknowledge(id, req.user.userId);
  }

  @Patch(":id/resolve")
  @ApiOperation({ summary: "Resolve an alert" })
  @ApiResponse({ status: 200, description: "Alert resolved" })
  async resolve(
    @Param("id", new ParseMongoIdPipe()) id: string,
    @Req() req: any,
  ) {
    return this.alertsService.resolve(id, req.user.userId);
  }

  @Get("get-parcel-alerts/:parcelId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all alerts by parcel ID" })
  @ApiParam({ name: "parcelId", type: String })
  async getAlertsByParcel(
    @Param("parcelId") parcelId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
    @Req() req: any,
  ) {
    return this.alertsService.findAllAlertsByParcel(
      parcelId,
      req.user.userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get("get-alert-details/:id")
  @ApiOperation({ summary: "Get alert details by ID" })
  @ApiResponse({
    status: 200,
    description: "Alert details returned successfully",
  })
  @ApiResponse({ status: 404, description: "Alert not found" })
  async getAlertDetails(@Param("id") id: string) {
    return this.alertsService.getAlertDetails(id);
  }
}
