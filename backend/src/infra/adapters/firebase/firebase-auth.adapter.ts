import { AuthStatus, AuthUserResponse, IAuthPort } from "../../../core/app/ports/IAuthPort";
import * as admin from 'firebase-admin';
import axios from 'axios';
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

/**
 * Adapter implementation for Firebase Authentication.
 * Implements IAuthPort to decouple the domain from Firebase SDK.
 */
@Injectable()
export class FirebaseAuthAdapter implements IAuthPort {
    constructor(
        @Inject('FIREBASE_AUTH') private readonly firebaseApp: admin.auth.Auth, 
        @Inject('FIREBASE_API_KEY') private readonly apiKey: string
    ) {}
    
    /**
     * Verifies the integrity of a Firebase ID Token (JWT).
     * Maps the decoded token to a domain-friendly AuthStatus.
     */
    async validateJWT(jwtToken: string): Promise<AuthStatus> {
        const userAllowed = await this.firebaseApp.verifyIdToken(jwtToken);

        if(!userAllowed || !userAllowed.email) throw new UnauthorizedException('user not allowed')
        
        return {
            uid: userAllowed.uid,
            email: userAllowed.email
        };
    }

    /**
     * Signs in a user using the Firebase Identity Toolkit REST API.
     * Required because the Admin SDK does not provide a direct 'signInWithPassword' method.
     */
    async authenticate(email: string, password: string): Promise<AuthUserResponse> {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`;
        
        const response = await axios.post(url, {
            email,
            password,
            returnSecureToken: true,
        });

        return {
            idToken: response.data.idToken,
            uid: response.data.localId,
            email: response.data.email,
        };
    }
}