const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function seed() {
        try {
                await client.connect();
                const db = client.db("agrovista");

                // 1. Seed Admin (in admins collection)
                const adminExists = await db.collection("admins").findOne({ email: "admin@agrovista.com" });
                if (!adminExists) {
                        const adminUser = {
                                firstName: "System",
                                lastName: "Administrator",
                                email: "admin@agrovista.com",
                                passwordHash: "$2b$10$wQkiBJiw7rDvR2WGcOvlq.YQkmIrcqg1oTRnghyJna3c6uU22Gpiy",
                                role: "ADMIN",
                                status: "ACTIVE",
                                isModerator: false,
                                locationId: null,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                        };
                        await db.collection("admins").insertOne(adminUser);
                        console.log("✅ Admin seeded");
                } else {
                        console.log("ℹ️ Admin already exists, skipping");
                }

                // 2. Seed Moderators (in users collection)
                const moderators = [
                        {
                                firstName: "Ahmed",
                                lastName: "Moderator",
                                email: "moderator1@agrovista.com",
                                passwordHash: "$2b$10$wQkiBJiw7rDvR2WGcOvlq.YQkmIrcqg1oTRnghyJna3c6uU22Gpiy",
                                role: "USER",
                                status: "ACTIVE",
                                IsVerified: true,
                                isModerator: true,
                                locationId: "EG1309",
                                phoneNumber: "+201111111111",
                                createdAt: new Date(),
                                updatedAt: new Date(),
                        },
                        {
                                firstName: "Mohamed",
                                lastName: "Moderator",
                                email: "moderator2@agrovista.com",
                                passwordHash: "$2b$10$wQkiBJiw7rDvR2WGcOvlq.YQkmIrcqg1oTRnghyJna3c6uU22Gpiy",
                                role: "USER",
                                status: "ACTIVE",
                                IsVerified: true,
                                isModerator: true,
                                locationId: "EG1308",
                                phoneNumber: "+201222222222",
                                createdAt: new Date(),
                                updatedAt: new Date(),
                        },
                        {
                                firstName: "Khaled",
                                lastName: "Moderator",
                                email: "moderator3@agrovista.com",
                                passwordHash: "$2b$10$wQkiBJiw7rDvR2WGcOvlq.YQkmIrcqg1oTRnghyJna3c6uU22Gpiy",
                                role: "USER",
                                status: "ACTIVE",
                                IsVerified: true,
                                isModerator: true,
                                locationId: "EG1310",
                                phoneNumber: "+201333333333",
                                createdAt: new Date(),
                                updatedAt: new Date(),
                        },
                        {
                                firstName: "Omar",
                                lastName: "Moderator",
                                email: "moderator4@agrovista.com",
                                passwordHash: "$2b$10$wQkiBJiw7rDvR2WGcOvlq.YQkmIrcqg1oTRnghyJna3c6uU22Gpiy",
                                role: "USER",
                                status: "ACTIVE",
                                IsVerified: true,
                                isModerator: true,
                                locationId: "EG1209",
                                phoneNumber: "+201444444444",
                                createdAt: new Date(),
                                updatedAt: new Date(),
                        },
                        {
                                firstName: "Hassan",
                                lastName: "Moderator",
                                email: "moderator5@agrovista.com",
                                passwordHash: "$2b$10$wQkiBJiw7rDvR2WGcOvlq.YQkmIrcqg1oTRnghyJna3c6uU22Gpiy",
                                role: "USER",
                                status: "ACTIVE",
                                IsVerified: true,
                                isModerator: true,
                                locationId: "EG0101",
                                phoneNumber: "+201555555555",
                                createdAt: new Date(),
                                updatedAt: new Date(),
                        }
                ];

                for (const mod of moderators) {
                        const exists = await db.collection("users").findOne({ email: mod.email });
                        if (!exists) {
                                await db.collection("users").insertOne(mod);
                                console.log(`✅ Moderator seeded: ${mod.email} (location: ${mod.locationId})`);
                        } else {
                                console.log(`ℹ️ Moderator exists: ${mod.email}, skipping`);
                        }
                }

                console.log("\n🎯 Seeding process complete.");

        } catch (err) {
                console.error("❌ Error:", err);
        } finally {
                await client.close();
                process.exit(0);
        }
}

seed();
