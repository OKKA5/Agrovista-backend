import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService {
        constructor() {
                if (!admin.apps.length) {
                        const serviceAccount = JSON.parse(
                                process.env.FIREBASE_SERVICE_ACCOUNT_JSON!,
                        );
                        admin.initializeApp({
                                credential: admin.credential.cert(serviceAccount),
                        });
                }
        }

        async sendPushNotification(token: string, title: string, body: string) {
                return admin.messaging().send({
                        token,
                        notification: {
                                title,
                                body,
                        },
                        android: {
                                priority: 'high',
                                notification: {
                                        channelId: 'agrovista_channel',
                                        visibility: 'public',
                                        priority: 'high',
                                        sound: 'default',
                                },
                        },
                });
        }
}
