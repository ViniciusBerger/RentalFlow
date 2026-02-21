import { IsString, IsNotEmpty, IsNumber, MaxLength, MinLength, IsDate, ValidateIf, IsISO8601} from 'class-validator';
import { Type } from 'class-transformer'
export class CreateRentalDto {

    // client name splitted in two to follow normalization rules for SQL databases
    @IsNotEmpty()
    @IsString()
    @MaxLength(128)
    @MinLength(3)
    clientFirstName: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(128)
    @MinLength(3)
    clientLastName: string;

    // check both start and end dates; check if its valid date
    @IsNotEmpty()
    @IsISO8601()
    startDate: string;

    @IsNotEmpty()
    @IsNotEmpty()
    @IsISO8601()
    endDate: string;

    @IsNotEmpty()
    @IsNumber()
    revenue: number;

}

