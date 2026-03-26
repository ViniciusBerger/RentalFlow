import { IUserRepository } from "src/core/app/ports/IUserRepository";

/* 
 * This use case handle user select. 
 * Receive userRepository port and delegate database interaction to the respective adapter
 * 
 * @returns boolean
 * 
 */
export class findAllUsersUseCase {
    constructor(private readonly userRepository: IUserRepository) {}

    async findUsers() {
        const users = await this.userRepository.findAll()
        return users
    }
}