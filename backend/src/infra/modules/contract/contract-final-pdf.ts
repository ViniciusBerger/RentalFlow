import {BadRequestException} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {readFileSync} from 'node:fs';

const fontPath=require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
export type FinalPdfInput={contractId:string;version:number;finalizedAt:Date;clauses:{id:string;title:string;body:string}[]; summary?:{landlord:string;landlordDocumentLabel:'CPF'|'CNPJ';landlordDocument:string;representativeName?:string;representativeCpf?:string;representativeRole?:string;guest:string;guestCpf:string;property:string;checkIn:string;checkOut:string;guests:number;totalCents:number}};

/** Generates a private, un-signed finalized archive using an embedded Unicode font. */
export async function renderFinalContractPdf(input:FinalPdfInput):Promise<Buffer>{
 if(input.clauses.length<17||input.clauses.length>40)throw new BadRequestException('Incomplete clauses');
 if(input.clauses.some(c=>!c.title||!c.body||c.body.includes('[PENDENTE:')))throw new BadRequestException('Incomplete clauses');
 if(input.clauses.reduce((n,c)=>n+c.title.length+c.body.length,0)>300000)throw new BadRequestException('PDF too long');
 const doc=new PDFDocument({size:'A4',margin:54,compress:true,info:{Title:'Finalized unsigned contract'}});
 const chunks:Buffer[]=[];
 doc.on('data',(chunk:Buffer)=>chunks.push(chunk));
 const result=new Promise<Buffer>((resolve,reject)=>{
  doc.on('error',reject);doc.on('end',()=>{
   const pdf=Buffer.concat(chunks);
   if(pdf.length<100||pdf.length>5000000||pdf.subarray(0,5).toString()!=='%PDF-')reject(new Error('PDF limits failed'));
   else resolve(pdf);
  });
 });
 doc.registerFont('contract',readFileSync(fontPath)).font('contract');
 doc.fontSize(14).text('CONTRATO DE LOCAÇÃO POR TEMPORADA',{align:'center'});
 doc.moveDown().fontSize(10).text('VERSÃO FINALIZADA - NÃO ASSINADA',{align:'center'});
 doc.moveDown().fontSize(9).text('ID: '+input.contractId+' - versão '+input.version);
 doc.text('Finalizado em: '+input.finalizedAt.toISOString());
 if(input.summary){
  const s=input.summary;
  doc.moveDown().fontSize(11).text('DADOS DA RESERVA');
  doc.fontSize(9).text('Locador: '+s.landlord+' | '+s.landlordDocumentLabel+': '+s.landlordDocument);
  if(s.landlordDocumentLabel==='CNPJ')doc.text('Representante: '+(s.representativeName??'')+
   ' | CPF: '+(s.representativeCpf??'')+' | Cargo: '+(s.representativeRole??''));
  doc.text('Locatário: '+s.guest+' | CPF: '+s.guestCpf);
  doc.text('Imóvel: '+s.property);
  doc.text('Período: '+s.checkIn+' a '+s.checkOut+' | Hóspedes: '+s.guests);
  doc.text('Valor total: '+new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(s.totalCents/100));
 }
 doc.moveDown();
 for(const clause of input.clauses){
  doc.fontSize(11).text(clause.title);
  doc.moveDown(0.2).fontSize(9.5).text(clause.body,{lineGap:3,paragraphGap:8});
  doc.moveDown();
 }
 doc.fontSize(9).text('Arquivo finalizado e não assinado. Nenhuma assinatura eletrônica foi coletada.');
 doc.end();
 return result;
}
