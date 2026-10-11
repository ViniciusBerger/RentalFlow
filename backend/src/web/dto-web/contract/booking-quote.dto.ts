import {Type} from 'class-transformer';
import {IsInt,IsNumber,IsOptional,IsUUID,Matches,Min,ValidateNested} from 'class-validator';
import {GuestFeeDto} from './booking-draft.dto';

/** A quote contains no guest PII or caller-selected pricing policy. */
export class BookingQuoteDto {
 @IsUUID() propertyId:string;
 @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate:string;
 @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate:string;
 @Type(()=>Number) @IsInt() @Min(1) guests:number;
 @Type(()=>Number) @IsNumber() @Min(0) revenue:number;
 @IsOptional() @ValidateNested() @Type(()=>GuestFeeDto) guestFee?:GuestFeeDto;
}
