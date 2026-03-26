import { User } from "src/core/domain/user/entity/user";

export interface IUserRepository {

    findAll(): Promise<User[]>;

    select(uid: string): Promise<User | null>;

    create(firstName: string, lastName:string, email:string, role?:string, id?:string)

    delete(id: string);

    update(id:string, toBeUpdated: any)
}