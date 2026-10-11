import {Type} from 'class-transformer';
import {ArrayMaxSize,ArrayMinSize,IsArray,IsOptional,Matches,ValidateNested} from 'class-validator';
import {GuestDraftDto,InstallmentDto} from './booking-draft.dto';
export class ContractDraftEditDto {
 @Matches(/^[a-f0-9]{64}$/) editToken:string;
 @IsOptional() @ValidateNested() @Type(()=>GuestDraftDto) guest?:GuestDraftDto;
 @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12)
 @ValidateNested({each:true}) @Type(()=>InstallmentDto) installments?:InstallmentDto[];
}
