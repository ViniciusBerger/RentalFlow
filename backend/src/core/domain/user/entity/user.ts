export enum UserRole {
    OWNER = 'owner',
    COLLABORATOR = 'collaborator'
}

export class User{
    firstName:string;
    lastName: string;
    email: string;
    phone: string;
    id?: string;
    createdAt?: string
    role!: UserRole


    constructor(firsName: string, lastName: string, email:string, phone:string, role:UserRole, id?: string, createdAt?: string, ) {
        this.firstName = firsName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.id = id;
        this.createdAt = createdAt;
        this.role = role;
    }
    
}