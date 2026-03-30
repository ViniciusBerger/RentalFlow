import { IUserRepository } from "src/core/app/ports/IUserRepository";

/* 
 * This use case handle user select. 
 * Receive userRepository port and delegate database interaction to the respective adapter
 * 
 * @returns boolean
 * 
 */
export class FindUserUseCase {
    constructor(private readonly userRepository: IUserRepository) {}

    async findUser(id: string) {
        const user = await this.userRepository.select(id)
        return user
    }
}