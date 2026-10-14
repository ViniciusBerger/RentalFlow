import {Controller,Get,NotFoundException,Param,ParseUUIDPipe,Req,UseGuards} from '@nestjs/common';
import {AuthGuard} from '../../adapters/guards/auth.guard';
import {OnboardingGuard} from '../../adapters/guards/onboarding.guard';
import {ContractChangesService} from './contract-changes.service';

@Controller('contracts/workspace')
@UseGuards(AuthGuard,OnboardingGuard)
export class ContractChangesController{
 constructor(private readonly service:ContractChangesService){}
 @Get(':id/cancellation-preview')
 preview(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string){
  if(process.env.CONTRACT_WORKSPACE_ENABLED!=='true'||process.env.CONTRACT_CHANGES_ENABLED!=='true')
   throw new NotFoundException('Contract changes unavailable');
  return this.service.cancellationPreview(req.user.uid,id);
 }
}
