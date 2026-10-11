import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString,
  IsUUID, Max, MaxLength, Min, MinLength, ValidateNested, Matches,
} from 'class-validator';
import { updateRentalDto } from '../../../core/app/dtos/rental/update-rental.dto';

/** The frontend proposes changes; the server restricts allowed fields and types. */
export class RentalUpdateFieldsWebDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128)
  clientFirstName?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(128)
  clientLastName?: string;

  @IsOptional() @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional() @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsOptional() @IsInt() @Min(1) @Max(999)
  guests?: number;

  @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }) @Min(0)
  revenue?: number;

  @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }) @Min(0)
  fee?: number;

  @IsOptional() @IsUUID()
  propertyId?: string;

  /** Legacy frontend may send profit; the use case discards it and recalculates. */
  @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false })
  profit?: number;
}

export class UpdateRentalWebDto extends updateRentalDto {
  @ApiProperty({ description: 'Rental UUID' })
  @IsUUID()
  declare id: string;

  @ApiProperty({ type: RentalUpdateFieldsWebDto })
  @IsNotEmpty() @IsObject() @ValidateNested() @Type(() => RentalUpdateFieldsWebDto)
  declare toBeUpdated: RentalUpdateFieldsWebDto;
}
