/**
 * Port: IAuthPort
 * Defines the contract for the Authentication service.
 * Separates the Domain layer from specific providers (like Firebase).
 */
export interface IAuthPort {
    /**
     * Verifies if a JWT is valid and has not expired.
     * @param jwtToken The raw token string from the client.
     * @returns AuthStatus containing validity and the user identifier.
     */
    validateJWT(jwtToken: string): Promise<AuthStatus>;

    /**
     * Performs a primary login via email/password.
     * @param credentials Object containing email and password.
     * @returns The session tokens and basic user profile.
     */
    authenticate(email:string, password: string): Promise<AuthUserResponse>;

    /**
     * This invalidates all sessions for this user on the Firebase side
     * @param uid 
     */
    logout(uid: string): Promise<void> 
}

/**
 * Represents the successful result of an authentication attempt.
 */
export interface AuthUserResponse {
    idToken: string; // The JWT used for subsequent authorized requests
    uid: string;     // Unique identifier from the auth provider
    email: string;   
}

/**
 * Represents the current state/validity of a provided token.
 */
export interface AuthStatus {
    uid: string;    // Present only if the token is valid
    email: string;
    role?: string;
}