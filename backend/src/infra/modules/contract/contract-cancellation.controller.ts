import {Body,Controller,Get,NotFoundException,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {Equals,IsBoolean,IsString,Matches} from 'class-validator';
import {AuthGuard} from '../../adapters/guards/auth.guard';
import {OnboardingGuard} from '../../adapters/guards/onboarding.guard';
import {ContractCancellationService} from './contract-cancellation.service';
export class ConfirmContractCancellationDto{
 @IsString() @Matches(/^[a-f0-9]{64}$/) reviewToken!:string;
 @IsBoolean() @Equals(true) confirm!:boolean;
}
@Controller('contracts/workspace')
@UseGuards(AuthGuard,OnboardingGuard)
export class ContractCancellationController{
 constructor(private readonly service:ContractCancellationService){}
 private enabled(){
  if(process.env.CONTRACT_WORKSPACE_ENABLED!=='true'||process.env.CONTRACT_CANCELLATIONS_ENABLED!=='true')
   throw new NotFoundException('Contract cancellation unavailable');
 }
 @Get(':id/cancellation-review')
 review(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string){
  this.enabled();return this.service.review(req.user.uid,id);
 }
 @Post(':id/cancel')
 cancel(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string,
  @Body() dto:ConfirmContractCancellationDto){
  this.enabled();return this.service.cancel(req.user.uid,id,dto.reviewToken,dto.confirm);
 }
}
