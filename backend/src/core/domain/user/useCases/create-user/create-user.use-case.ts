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

    async createUser(userId: string, email: string, firstName: string, lastName: string) {
        
        const user = await this.userRepository.create(
            userId, email, firstName, lastName
        )

        return user 
    }
}