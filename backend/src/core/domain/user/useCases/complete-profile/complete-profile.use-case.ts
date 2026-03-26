import { IUserRepository } from "src/core/app/ports/IUserRepository";

export class CompleteProfileUseCase {

    constructor(private readonly userRepository:IUserRepository){}
    
    async execute(firebaseUid: string, email: string, firstName:string, lastName:string):Promise<boolean> {
       const existingUser = await this.userRepository.select(firebaseUid);

    if (!existingUser) {
        return this.userRepository.create(firebaseUid,email,firstName,lastName);
    }

    return this.userRepository.update(firebaseUid, {
        firstName: firstName,
        lastName: lastName,
    });
        }
}