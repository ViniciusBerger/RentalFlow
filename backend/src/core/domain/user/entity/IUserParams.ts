export enum UserRole {
    STAFF = 'staff',
    ADMIN = 'admin',
    HOST =  'host'
}

export interface IUserParams {
    firebaseUid: string;
    firstName:string;
    lastName: string;
    email: string;
    role: UserRole;
    id?: string;
    createdAt?: string;
}

