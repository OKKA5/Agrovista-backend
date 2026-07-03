import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type LocationDocument = Location & Document;

export enum Region {
        TOSKA = "TOSKA",
        DELTA = "DELTA",
        NORTH_WEST = "NORTH_WEST",
        NORTH_SINAI = "NORTH_SINAI",
        SOUTH_SINAI = "SOUTH_SINAI",
        MIDDLE_EGYPT = "MIDDLE_EGYPT",
        UPPER_EGYPT = "UPPER_EGYPT",
        NEW_VALLEY = "NEW_VALLEY"
}

@Schema()
export class Location {
        @Prop({ required: true }) // pcode = _id
        _id: string;

        @Prop({ required: true })
        parentId: string; // null for EG

        @Prop({ required: true })
        level: number; // 0,1,2

        @Prop({ required: true })
        nameEn: string;

        @Prop({ required: true })
        nameAr: string;

        @Prop({ type: Object, required: true })
        centroid: { type: 'Point'; coordinates: [number, number] };

        @Prop({ type: [String], default: [] })
        adjacencyIds: string[];

        @Prop({ type: String, enum: Region })
        region: Region;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
