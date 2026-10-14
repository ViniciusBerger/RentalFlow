import {Body,Controller,NotFoundException,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {AuthGuard} from '../../adapters/guards/auth.guard';
import {OnboardingGuard} from '../../adapters/guards/onboarding.guard';
import {ContractAmendmentService} from './contract-amendment.service';
import {ApproveContractAmendmentDto,ContractAmendmentProposalDto} from '../../../web/dto-web/contract/contract-amendment.dto';

@Controller('contracts/workspace')
@UseGuards(AuthGuard,OnboardingGuard)
export class ContractAmendmentController {
 constructor(private readonly service:ContractAmendmentService){}
 private enabled(){
  if(process.env.CONTRACT_WORKSPACE_ENABLED!=='true'||process.env.CONTRACT_AMENDMENTS_ENABLED!=='true')
   throw new NotFoundException('Contract amendments unavailable');
 }
 @Post(':id/amendment-review')
 review(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string,
  @Body() dto:ContractAmendmentProposalDto){
  this.enabled();return this.service.review(req.user.uid,id,dto);
 }
 @Post(':id/amend')
 approve(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string,
  @Body() dto:ApproveContractAmendmentDto){
  this.enabled();return this.service.approve(req.user.uid,id,dto.proposal,dto.reviewToken,dto.confirm);
 }
}
