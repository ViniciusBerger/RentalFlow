import { IsNotEmpty, IsString } from "class-validator";

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

}