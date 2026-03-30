import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  IsISO8601,
  Min,
} from 'class-validator';

export class CreateRentalWebDto {
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

  @IsNotEmpty()
  @IsISO8601()
  startDate: string;

  @IsNotEmpty()
  @IsISO8601()
  endDate: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  guests: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revenue: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee: number;
}