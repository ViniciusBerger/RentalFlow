import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { updateRentalDto } from '../../../core/app/dtos/rental/update-rental.dto';

/**
 * Infrastructure version of updateRentalDto.
 * Uses 'declare' to add Swagger metadata without redeclaring logic.
 */
export class UpdateRentalWebDto extends updateRentalDto {
  
  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000', 
    description: 'The unique ID of the rental to update' 
  })
  declare id: string;

  @ApiProperty({
    description: 'Object containing the fields to be updated',
    example: { revenue: 200, clientFirstName: 'Vinny' },
    type: 'object',
    additionalProperties: true
  })
  declare toBeUpdated: any;
}