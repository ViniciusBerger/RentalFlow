import { IsISO8601, IsNotEmpty, ValidateIf } from "class-validator"

/**
 * Data transfer object to handle validation for search item based on date
 */
export class FindRentalDto {
    // check both start and end dates; check if its valid date; 
    @IsNotEmpty()
    @IsISO8601()
    startDate: string
    
    @IsNotEmpty()
    @IsISO8601()
    endDate: string
}