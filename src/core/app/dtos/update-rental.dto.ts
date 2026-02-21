import { IsNotEmpty, IsString } from "class-validator"

/**
 * Data transfer object to handle validation for search item based on date
 */
export class updateRentalDto {
    // requirer id
    @IsString()
    @IsNotEmpty()
    id: string 
    
    @IsString()
    @IsNotEmpty()
    toBeUpdated: any
}