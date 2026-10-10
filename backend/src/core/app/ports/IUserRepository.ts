import { User } from "src/core/domain/user/entity/user";

export interface IUserRepository {

    findAll(): Promise<User[]>;

    select(uid: string): Promise<User | null>;

    create(firebaseUid: string, email: string, firstName: string, lastName: string): Promise<boolean>

    delete(id: string);

    update(id:string, toBeUpdated: any)
}