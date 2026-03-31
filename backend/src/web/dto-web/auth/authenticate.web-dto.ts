import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator"

export class AuthenticateWebDto {
    @ApiProperty({ 
        example: 'admin@test.com', 
        description: 'email of the client',
      })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string

    @ApiProperty({ 
        example: 'StrongPassword123', 
        description: 'password of the client',
        minLength: 8,
        maxLength: 128 
      })
    @IsString()
    @IsNotEmpty()
    @Length(8, 128)
    password:string
}