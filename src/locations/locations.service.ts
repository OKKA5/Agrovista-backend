import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from '../schemas/location.schema';
import * as seedData from '../../data/seed-locations.json';

// Explicit type for seed data items
type SeedLocation = {
        _id: string;
        parentId: string | null;
        level: number;
        nameEn: string;
        nameAr: string;
        centroid: { type: 'Point'; coordinates: [number, number] };
        adjacencyIds: string[];
};

@Injectable()
export class LocationsService {
        constructor(
                @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
        ) { }

        async seedIfEmpty(): Promise<void> {
                const count = await this.locationModel.countDocuments();
                if (count > 0) return;

                // Handle both import styles: direct array or { default: array }
                const data = Array.isArray(seedData) ? seedData : (seedData as any).default || (seedData as any);

                console.log('Seed data type:', typeof data);
                console.log('Is array:', Array.isArray(data));
                console.log('First item:', data[0]);
                console.log('Keys of first item:', data[0] ? Object.keys(data[0]) : 'no items');

                if (!Array.isArray(data)) {
                        throw new Error('Seed data must be an array. Got: ' + typeof data);
                }

                await this.locationModel.insertMany(data, { ordered: false });
                console.log(`✅ Seeded ${data.length} locations`);
        }

        async validateId(pcode: string, allowedLevels?: number[]): Promise<LocationDocument> {
                const doc = await this.locationModel.findById(pcode).lean();
                if (!doc) {
                        throw new NotFoundException(`Location ${pcode} not found`);
                }
                if (allowedLevels && !allowedLevels.includes(doc.level)) {
                        throw new NotFoundException(`Location ${pcode} is not valid for this operation`);
                }
                return doc as LocationDocument;
        }

        async getGovernorates(): Promise<Array<{ _id: string; nameEn: string; nameAr: string }>> {
                return this.locationModel
                        .find({ level: 1 })
                        .select('_id nameEn nameAr')
                        .lean()
                        .exec() as Promise<Array<{ _id: string; nameEn: string; nameAr: string }>>;
        }

        async getCitiesByGovernorate(govId: string): Promise<Array<{ _id: string; parentId: string; nameEn: string; nameAr: string; centroid: { type: 'Point'; coordinates: [number, number] } }>> {
                return this.locationModel
                        .find({ parentId: govId, level: 2 })
                        .select('_id parentId nameEn nameAr centroid')
                        .lean()
                        .exec() as Promise<Array<{ _id: string; parentId: string; nameEn: string; nameAr: string; centroid: { type: 'Point'; coordinates: [number, number] } }>>;
        }

        async getAdjacencyList(pcode: string): Promise<string[]> {
                const doc = await this.validateId(pcode, [2]);
                return doc.adjacencyIds;
        }

        async findById(pcode: string): Promise<LocationDocument | null> {
                return this.locationModel.findById(pcode).lean().exec() as Promise<LocationDocument | null>;
        }
}
