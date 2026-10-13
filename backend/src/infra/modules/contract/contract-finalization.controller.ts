import {Body,Controller,Get,NotFoundException,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {IsBoolean,IsString,Matches,Equals} from 'class-validator';
import {AuthGuard} from '../../adapters/guards/auth.guard';
import {OnboardingGuard} from '../../adapters/guards/onboarding.guard';
import {ContractFinalizationService} from './contract-finalization.service';

export class FinalizeContractDto {
 @IsString() @Matches(/^[a-f0-9]{64}$/) reviewToken!:string;
 @IsBoolean() @Equals(true) confirm!:boolean;
}

@Controller('contracts/workspace')
@UseGuards(AuthGuard,OnboardingGuard)
export class ContractFinalizationController {
 constructor(private readonly service:ContractFinalizationService){}
 private enabled(){
  if(process.env.CONTRACT_WORKSPACE_ENABLED!=='true'||process.env.CONTRACT_FINALIZATION_ENABLED!=='true')
   throw new NotFoundException('Contract finalization unavailable');
 }
 @Get(':id/finalization-review')
 review(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string){
  this.enabled();return this.service.review(req.user.uid,id);
 }
 @Post(':id/finalize')
 finalize(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string,@Body() dto:FinalizeContractDto){
  this.enabled();return this.service.finalize(req.user.uid,id,dto.reviewToken,dto.confirm);
 }
}
