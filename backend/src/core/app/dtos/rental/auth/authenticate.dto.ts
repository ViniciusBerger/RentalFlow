import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator"

export class AuthenticateDto {
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string

    @IsString()
    @IsNotEmpty()
    @Length(8, 128)
    password:string
}