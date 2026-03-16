import { User } from "src/core/domain/user/entity/user";

export interface IUserRepository {

    select(id: string): Promise<User>;

    create(firstName: string, lastName:string, email:string, role?:string, id?:string)

    delete(id: string);

    update(id:string, toBeUpdated: any)
}