import {Type} from 'class-transformer';
import {ArrayMaxSize,ArrayMinSize,IsArray,IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested} from 'class-validator';

export class GuestDraftDto {
 @IsOptional() @IsString() @MaxLength(20) cpf?:string;
 @IsOptional() @IsString() @MaxLength(20) rg?:string;
 @IsOptional() @IsString() @MaxLength(40) nationality?:string;
 @IsOptional() @IsString() @MaxLength(40) maritalStatus?:string;
 @IsOptional() @IsString() @MaxLength(500) address?:string;
 @IsOptional() @IsString() @MaxLength(32) phone?:string;
 @IsOptional() @IsString() @MaxLength(254) email?:string;
}
export class GuestFeeDto {
 @IsIn(['AUTOMATIC','WAIVED','ADJUSTED']) mode:'AUTOMATIC'|'WAIVED'|'ADJUSTED';
 @IsOptional() @IsInt() @Min(0) @Max(1_000_000_000) cents?:number;
 @IsOptional() @IsString() @MaxLength(300) reason?:string;
}
export class InstallmentDto {
 @IsInt() @Min(0) @Max(1_000_000_000) agreedCents:number;
 @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate?:string;
 @IsOptional() @IsIn(['CHECKIN','KEY_HANDOVER','AGREED_EVENT']) dueEvent?:string;
 @IsOptional() @IsIn(['PIX','BANK_TRANSFER','CUSTOM']) paymentMethod?:string;
 @IsOptional() @IsBoolean() isDeposit?:boolean;
}
export class BookingDraftDto {
 @IsUUID() requestKey:string;
 @IsInt() @Min(0) @Max(1_000_000_000) baseRevenueCents:number;
 // Must match a fresh authenticated backend price quote; never determines price.
 @IsInt() @Min(0) @Max(1_000_000_000) confirmedTotalCents:number;
 @IsOptional() @ValidateNested() @Type(()=>GuestDraftDto) guest?:GuestDraftDto;
 @IsOptional() @ValidateNested() @Type(()=>GuestFeeDto) guestFee?:GuestFeeDto;
 @IsOptional() @IsIn(['PIX','BANK_TRANSFER','CUSTOM']) paymentMethod?:string;
 @IsOptional() @IsIn(['CHECKIN','KEY_HANDOVER','AGREED_EVENT']) paymentDueEvent?:string;
 @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) paymentDueDate?:string;
 @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12)
 @ValidateNested({each:true}) @Type(()=>InstallmentDto) installments?:InstallmentDto[];
}
