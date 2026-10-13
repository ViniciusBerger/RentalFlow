import {Type} from 'class-transformer';
import {ArrayMaxSize,ArrayMinSize,Equals,IsArray,IsBoolean,IsInt,IsOptional,IsString,
 IsUUID,Matches,Max,Min,ValidateNested} from 'class-validator';
import {GuestFeeDto,InstallmentDto} from './booking-draft.dto';

export class ContractAmendmentProposalDto{
 @IsUUID() propertyId!:string;
 @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!:string;
 @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!:string;
 @IsInt() @Min(1) @Max(999) guests!:number;
 @IsInt() @Min(0) @Max(1_000_000_000) baseRevenueCents!:number;
 @IsOptional() @ValidateNested() @Type(()=>GuestFeeDto) guestFee?:GuestFeeDto;
 @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12)
 @ValidateNested({each:true}) @Type(()=>InstallmentDto) installments?:InstallmentDto[];
}
export class ApproveContractAmendmentDto{
 @ValidateNested() @Type(()=>ContractAmendmentProposalDto) proposal!:ContractAmendmentProposalDto;
 @IsString() @Matches(/^[a-f0-9]{64}$/) reviewToken!:string;
 @IsBoolean() @Equals(true) confirm!:boolean;
}
