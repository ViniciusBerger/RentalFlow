import {BadRequestException} from '@nestjs/common';
import type {RenderedPreview} from '../../../core/domain/contract/contract-preview';

/** Short-lived, server-generated and visibly unofficial PDF preview. Never persisted or signed. */
const specials:Record<number,number>={
 0x2018:0x91,0x2019:0x92,0x201c:0x93,0x201d:0x94,
 0x2013:0x96,0x2014:0x97,0x2026:0x85,0x20ac:0x80,0x00a0:0x20
};
function winAnsiHex(text:string){
 const bytes:number[]=[];
 for(const ch of text.normalize('NFC')){
  const cp=ch.codePointAt(0)!;
  bytes.push(cp>=32&&cp<=255?cp:specials[cp]??63);
 }
 return Buffer.from(bytes).toString('hex').toUpperCase();
}
function wrap(input:string,width=88):string[]{
 const lines:string[]=[];
 for(const paragraph of input.replace(/\r\n/g,'\n').split('\n')){
  let remaining=paragraph.trim();
  if(!remaining){lines.push('');continue;}
  while(remaining.length>width){
   let cut=remaining.lastIndexOf(' ',width);
   if(cut<width/3)cut=width;
   lines.push(remaining.slice(0,cut).trim());
   remaining=remaining.slice(cut).trim();
  }
  lines.push(remaining);
 }
 return lines;
}
export function renderDraftPdf(preview:RenderedPreview):Buffer{
 const lines:string[]=[
  'RASCUNHO - SEM VALIDADE CONTRATUAL',
  'PREVIA PRIVADA / DOCUMENTO NAO FINALIZADO',
  'Nao utilizar como contrato assinado. Revise dados, clausulas e pendencias.',
  ''
 ];
 for(const clause of preview.clauses){
  lines.push(clause.title.toLocaleUpperCase('pt-BR'));
  lines.push(...wrap(clause.body),'' );
 }
 if(preview.missing.length){
  lines.push('INFORMACOES PENDENTES');
  for(const key of preview.missing)lines.push(' - '+key);
 }
 if(lines.length>1700)throw new BadRequestException('Preview is too long');
 const linesPerPage=45;
 const pages:string[][]=[];
 for(let i=0;i<lines.length;i+=linesPerPage)pages.push(lines.slice(i,i+linesPerPage));
 if(pages.length===0)pages.push(['RASCUNHO']);
 const content:string[]=[];
 for(const [page,chunk] of pages.entries()){
  let stream='BT /F1 10 Tf 45 778 Td 15 TL\n';
  for(const [index,line] of chunk.entries()){
   // No raw PDF control sequences or HTML from user-controlled contract text.
   const label=(index===0&&page===0)?line:' '+line;
   stream+='<'+winAnsiHex(label)+'> Tj T*\n';
  }
  stream+='ET\n';
  content.push(stream);
 }
 const objects:string[]=['','']; // object numbers are 1-based
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 const kidRefs:string[]=[];
 let nextId=4;
 const pageItems:{pageId:number;streamId:number}[]=[];
 for(let n=0;n<content.length;n++){
  const pageId=nextId++,streamId=nextId++;
  kidRefs.push(pageId+' 0 R');pageItems.push({pageId,streamId});
 }
 objects[2]='<< /Type /Pages /Kids ['+kidRefs.join(' ')+'] /Count '+pageItems.length+' >>';
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 for(const [idx,item] of pageItems.entries()){
  objects[item.pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents '+item.streamId+' 0 R >>';
  objects[item.streamId]='<< /Length '+Buffer.byteLength(content[idx],'ascii')+' >>\nstream\n'+content[idx]+'endstream';
 }
 let doc='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
 const offsets:number[]=[0];
 for(let i=1;i<objects.length;i++){
  offsets[i]=Buffer.byteLength(doc,'latin1');
  doc+=i+' 0 obj\n'+objects[i]+'\nendobj\n';
 }
 const startxref=Buffer.byteLength(doc,'latin1');
 doc+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
 for(let i=1;i<objects.length;i++)doc+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 doc+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+startxref+'\n%%EOF\n';
 return Buffer.from(doc,'latin1');
}
