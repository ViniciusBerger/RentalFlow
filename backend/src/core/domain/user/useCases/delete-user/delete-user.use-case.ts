import { IUserRepository } from "src/core/app/ports/IUserRepository";

/* 
 * This use case handle user deletion. 
 * Receive userRepository port and delegate database interaction to the respective adapter
 * 
 * @returns boolean
 * 
 */
export class DeleteUserUseCase {
    constructor(private readonly userRepository: IUserRepository) {}

    async deleteUser(userId: string) {
        
        const isDeleted = await this.userRepository.delete(userId)
        return isDeleted
    }
}