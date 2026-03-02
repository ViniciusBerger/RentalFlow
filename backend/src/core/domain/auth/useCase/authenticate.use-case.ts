import { AuthUserResponse, IAuthPort } from "../../../app/ports/IAuthPort";

interface IAuthCredentials {
    email: string;
    password: string;
}

export class AuthenticateUseCase {
    /**  
     * Injecting the Port allows us to swap Auth providers (Firebase/Auth0) 
     * without touching this business logic.
    */
    constructor(private readonly authPort: IAuthPort) {}

    async authenticate(credentials: IAuthCredentials): Promise<AuthUserResponse> {
        const { email, password } = credentials;
        
        // The Domain doesn't care how authentication happens, 
        // only that it returns a valid AuthUserResponse.
        return await this.authPort.authenticate(email, password);
    }
}