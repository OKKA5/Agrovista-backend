import { Prop } from "@nestjs/mongoose";

export class DatePoint {
  @Prop()
  day: number;

  @Prop()
  month: number;
}

export class Sowing {
  @Prop()
  early: DatePoint;

  @Prop()
  late: DatePoint;
}

export class Harvest {
  @Prop()
  early: DatePoint;

  @Prop()
  late: DatePoint;
}

export class CropSchedule {
  @Prop({ type: [String], required: true })
  regions: string[];

  @Prop()
  sowing: Sowing;

  @Prop()
  harvest: Harvest;

  @Prop()
  growingPeriodMin: number;

  @Prop()
  growingPeriodMax: number;
}
