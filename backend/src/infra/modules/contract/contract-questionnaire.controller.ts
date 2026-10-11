import {Body, Controller, Get, NotFoundException, Param, Put, Post, Req, UseGuards, ParseUUIDPipe} from '@nestjs/common';
import {AuthGuard} from '../../adapters/guards/auth.guard';
import {OnboardingGuard} from '../../adapters/guards/onboarding.guard';
import {SaveQuestionnaireDto,SaveTemplateDraftDto,PublishTemplateDto,PropertyContractSettingsDto} from '../../../web/dto-web/contract/contract-questionnaire.dto';
import {ContractQuestionnaireService} from './contract-questionnaire.service';

@Controller('contracts')
@UseGuards(AuthGuard,OnboardingGuard)
export class ContractQuestionnaireController {
 constructor(private readonly service:ContractQuestionnaireService){}
 private enabled(){
  if(process.env.CONTRACT_QUESTIONNAIRE_ENABLED!=='true')throw new NotFoundException('Contract setup is not enabled');
 }
 @Get('settings')
 getSettings(@Req() req:{user:{uid:string}}){this.enabled();return this.service.settings(req.user.uid);}
 @Put('settings')
 saveSettings(@Req() req:{user:{uid:string}},@Body() dto:SaveQuestionnaireDto){
  this.enabled();return this.service.saveSettings(req.user.uid,dto.landlord,dto.policy,dto.payment);
 }
 @Get('template')
 getTemplate(@Req() req:{user:{uid:string}}){this.enabled();return this.service.template(req.user.uid);}
 @Put('template/draft')
 saveDraft(@Req() req:{user:{uid:string}},@Body() dto:SaveTemplateDraftDto){
  this.enabled();return this.service.saveDraft(req.user.uid,dto.clauses);
 }
 @Post('template/publish')
 publish(@Req() req:{user:{uid:string}},@Body() dto:PublishTemplateDto){
  this.enabled();return this.service.publish(req.user.uid,dto.draftId);
 }
 @Get('properties/:id/settings')
 getPropertySettings(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string){
  this.enabled();return this.service.propertySettings(req.user.uid,id);
 }
 @Put('properties/:id/settings')
 savePropertySettings(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string,
  @Body() dto:PropertyContractSettingsDto){
  this.enabled();return this.service.savePropertySettings(req.user.uid,id,dto);
 }
}
