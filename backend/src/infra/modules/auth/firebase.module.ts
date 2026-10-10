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
      
        // Development credential login must work without production Firebase secrets.
        // Firebase remains mandatory outside explicitly enabled local development.
        // Explicitly enabled LOCAL development uses signed dev sessions, not Firebase.
        // Bypass Firebase initialization regardless of partially filled Firebase env vars.
        // Production and staging must still provide valid Firebase credentials.
        if (configService.get<string>('NODE_ENV') === 'development' &&
            configService.get<string>('ENABLE_DEV_LOGIN') === 'true') {
          return { verifyIdToken: async () => { throw new Error('Firebase login is disabled in local development'); } } as unknown as admin.auth.Auth;
        }

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error('Firebase service account settings are missing: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for non-dev deployments.');
        }

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