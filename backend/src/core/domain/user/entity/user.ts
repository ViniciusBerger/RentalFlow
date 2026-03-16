import { IUserParams, UserRole } from "./IUserParams";

export class User{
    firstName:string;
    lastName: string;
    email: string;
    id?: string;
    createdAt?: string
    role!: UserRole


    constructor(data: IUserParams) {
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.id = data.id;
        this.createdAt = data.createdAt;
        this.role = data.role;
    }

    static create(data: any) {
        return new User ({...data,
            createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
        })

    }
    
}