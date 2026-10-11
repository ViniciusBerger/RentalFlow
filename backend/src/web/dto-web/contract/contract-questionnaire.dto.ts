import {Type} from 'class-transformer';
import {ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional,
 IsString, Length, Matches, Max, Min, ValidateNested} from 'class-validator';

export class LandlordDto {
 @IsOptional() @IsString() @Length(0,120) fullName?:string;
 @IsOptional() @IsString() @Length(0,20) cpf?:string;
 @IsOptional() @IsString() @Length(0,30) rg?:string;
 @IsOptional() @IsString() @Length(0,120) addressStreet?:string;
 @IsOptional() @IsString() @Length(0,20) addressNumber?:string;
 @IsOptional() @IsString() @Length(0,90) addressDistrict?:string;
 @IsOptional() @IsString() @Length(0,90) addressCity?:string;
 @IsOptional() @IsString() @Length(0,2) addressState?:string;
 @IsOptional() @IsString() @Length(0,9) addressPostalCode?:string;
 @IsOptional() @IsString() @Length(0,120) addressComplement?:string;
 @IsOptional() @IsString() @Length(0,30) phone?:string;
 @IsOptional() @IsString() @Length(0,254) email?:string;
 @IsOptional() @IsString() @Length(0,150) pixKey?:string;
 @IsOptional() @IsString() @Length(0,120) bankName?:string;
 @IsOptional() @IsString() @Length(0,60) bankAgency?:string;
 @IsOptional() @IsString() @Length(0,60) bankAccount?:string;
}
export class ContractPolicyDto {
 @IsString() @Length(0,90) jurisdiction!:string;
 @IsInt() @Min(0) @Max(365) cancellationDays!:number;
 @IsInt() @Min(0) @Max(100) damagePenaltyPercent!:number;
 @IsInt() @Min(0) @Max(100) breachPenaltyPercent!:number;
 @IsBoolean() utilitiesIncluded!:boolean;
}
export class ContractPaymentDto {
 @IsInt() @Min(1) @Max(12) installmentCount!:number;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @IsIn(['PIX','BANK_TRANSFER','CUSTOM'],{each:true}) acceptedMethods!:string[];
 @IsIn(['DATE','CHECKIN','KEY_HANDOVER','AGREED_EVENT']) defaultDueRule!:string;
 @IsIn(['MANUAL','FIRST_INSTALLMENT','NONE']) depositMode!:string;
}
export class SaveQuestionnaireDto {
 @IsNotEmpty() @ValidateNested() @Type(()=>LandlordDto) landlord!:LandlordDto;
 @IsNotEmpty() @ValidateNested() @Type(()=>ContractPolicyDto) policy!:ContractPolicyDto;
 @IsNotEmpty() @ValidateNested() @Type(()=>ContractPaymentDto) payment!:ContractPaymentDto;
}
export class ClauseDto {
 @IsString() @Length(1,64) id!:string;
 @IsString() @Length(2,120) title!:string;
 @IsString() @Length(0,10000) body!:string;
 @IsBoolean() enabled!:boolean;
}
export class SaveTemplateDraftDto {
 @IsArray() @ArrayMinSize(17) @ArrayMaxSize(40) @ValidateNested({each:true}) @Type(()=>ClauseDto)
 clauses!:ClauseDto[];
}
export class PublishTemplateDto {
 @IsString() @Matches(/^[0-9a-fA-F-]{36}$/) draftId!:string;
}
export class PropertyContractSettingsDto {
 @IsInt() @Min(1) @Max(999) includedOccupancy!:number;
 @IsInt() @Min(1) @Max(999) maximumOccupancy!:number;
 @IsInt() @Min(0) @Max(100000000) extraGuestRateCents!:number;
 @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) checkInTime!:string;
 @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) checkOutTime!:string;
 @IsBoolean() providesLinen!:boolean;
 @IsBoolean() hasPool!:boolean;
 @IsArray() @ArrayMaxSize(60) @IsString({each:true}) houseRules!:string[];
}
