import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  IsISO8601,
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
  guests: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  revenue: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  fee: number;
}