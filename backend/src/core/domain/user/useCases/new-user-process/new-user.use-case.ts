import { IUserRepository } from "src/core/app/ports/IUserRepository";
import { User } from "../../entity/user";

interface IVerifiedUser {
    success: boolean,
    user?:User
}

export class NewUserUseCase{
    constructor(private readonly userRepository: IUserRepository){}

    async verifyUser(firebaseUid: string): Promise<IVerifiedUser>{
        const user = await this.userRepository.select(firebaseUid)
        if (user) console.log("USER=>> " + user.firstName + " " + user.lastName + "  EMAIL:" + user.email)
        
        if(!user) return {success: false}
        return {success: true, user: user}
        
        
    }

}