import {Body,Controller,Get,NotFoundException,Param,ParseUUIDPipe,Patch,Query,Req,Res,UseGuards} from '@nestjs/common';
import type {Response} from 'express';
import {AuthGuard} from '../../adapters/guards/auth.guard';
import {OnboardingGuard} from '../../adapters/guards/onboarding.guard';
import {ContractWorkspaceService} from './contract-workspace.service';
import {ContractDraftEditDto} from '../../../web/dto-web/contract/contract-draft-edit.dto';
import {renderDraftPdf} from './contract-preview-pdf';

@Controller('contracts/workspace')
@UseGuards(AuthGuard,OnboardingGuard)
export class ContractWorkspaceController {
 constructor(private readonly workspace:ContractWorkspaceService){}
 private enabled(){
  if(process.env.CONTRACT_WORKSPACE_ENABLED!=='true')
   throw new NotFoundException('Contracts workspace is not enabled');
 }
 @Get()
 list(@Req() req:{user:{uid:string}},@Query('status') status?:string,
  @Query('propertyId') propertyId?:string,@Query('query') query?:string){
  this.enabled();
  return this.workspace.list(req.user.uid,{status,propertyId,query});
 }
 @Get(':id')
 detail(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string){
  this.enabled();
  return this.workspace.detail(req.user.uid,id);
 }
 @Patch(':id/draft')
 edit(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string,
  @Body() dto:ContractDraftEditDto){
  this.enabled();
  return this.workspace.save(req.user.uid,id,dto);
 }
 @Get(':id/preview.pdf')
 async pdf(@Req() req:{user:{uid:string}},@Param('id',new ParseUUIDPipe()) id:string,
  @Query('download') download:string|undefined,@Res() res:Response){
  this.enabled();
  const detail=await this.workspace.detail(req.user.uid,id);
  const pdf=renderDraftPdf(detail.preview);
  await this.workspace.auditPdfPreview(req.user.uid,id);
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Disposition',
   (download==='1'?'attachment':'inline')+'; filename="contrato-rascunho.pdf"');
  res.setHeader('Content-Length',String(pdf.byteLength));
  res.send(pdf);
 }
}
