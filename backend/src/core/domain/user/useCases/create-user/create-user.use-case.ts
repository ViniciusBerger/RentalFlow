import { IUserRepository } from "src/core/app/ports/IUserRepository";

/* 
 * This use case handle user creation. 
 * Receive userRepository port and delegate database interaction to the respective adapter
 * 
 * return a Rental object
 * 
 */
export class CreateUserUseCase {
    constructor(private readonly userRepository: IUserRepository) {}

    async createUser(userId: string, firstName: string, lastName:string,  email: string) {
        
        const user = await this.userRepository.create(
            userId, firstName, lastName, email
        )

        return user 
    }
}