import { Controller, Get, Param, Req, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../adapters/guards/auth.guard';
import { OnboardingGuard } from '../adapters/guards/onboarding.guard';
import { PrivateContractDocumentsService } from './private-contract-documents.service';
import { ContractAuditService } from './contract-audit.service';

/** Read only; the official PDF is generated and sealed by later server-only workflows. */
@Controller('contracts')
@UseGuards(AuthGuard, OnboardingGuard)
export class PrivateContractDocumentsController {
 constructor(private readonly documents:PrivateContractDocumentsService,
   private readonly audit:ContractAuditService) {}
 @Get(':contractId/revisions/:revisionId/pdf')
 async download(@Req() req: {user:{uid:string}},@Param('contractId') contractId:string,
   @Param('revisionId') revisionId:string,@Res() res:Response) {
  if(process.env.CONTRACT_DOCUMENT_DOWNLOADS_ENABLED!=='true') throw new NotFoundException('Contract not found');
  const uid=req.user.uid;
  const pdf=await this.documents.readFinalPdf(uid,contractId,revisionId);
  await this.audit.record({userId:uid,actorId:uid,action:'VIEW_PDF',targetType:'CONTRACT',targetId:contractId,outcome:'SUCCESS'});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename="contrato.pdf"');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.send(pdf);
 }
}
