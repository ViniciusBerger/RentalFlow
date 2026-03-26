import { IUserParams, UserRole } from "./IUserParams";

// Domain object for user. 
export class User{
    firebaseUid: string;
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

    //Instantiate a new user converting date from date object to string
    static create(data: any) {
        return new User ({...data,
            createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
        })

    }
    
}