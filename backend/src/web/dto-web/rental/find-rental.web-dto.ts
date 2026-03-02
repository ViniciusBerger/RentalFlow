import { ApiProperty } from '@nestjs/swagger';
import { FindRentalDto } from '../../../core/app/dtos/rental/find-rental.dto';

/**
 * Infrastructure version of FindRentalDto.
 * Adds Swagger documentation metadata for the search query body.
 */
export class FindRentalWebDto extends FindRentalDto {
  
  @ApiProperty({ 
    example: '2026-01-01', 
    description: 'The start date of the rental period to search for (ISO8601)' 
  })
  declare startDate: string;

  @ApiProperty({ 
    example: '2026-01-31', 
    description: 'The end date of the rental period to search for (ISO8601)' 
  })
  declare endDate: string;
}