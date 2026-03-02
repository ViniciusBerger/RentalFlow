import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Global()
@Module({
  imports: [ConfigModule], 
  providers: [
    {
      provide: 'FIREBASE_AUTH', 
      
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => { 
        const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
        const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');
      
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey?.replace(/\\n/g, '\n'),
            }),
          });
        }

        return admin.auth()
      },
    }, 
    {
      provide: 'FIREBASE_API_KEY',
      inject: [ConfigService],

      useFactory: (ConfigService: ConfigService) => {
        return ConfigService.get<string>('FIREBASE_API_KEY')
      }
    }
  ],
  exports: ['FIREBASE_AUTH', 'FIREBASE_API_KEY'],
})
export class FirebaseModule {}