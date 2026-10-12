import PDFDocument from 'pdfkit';

export function documentRendererAvailable():boolean {return typeof PDFDocument==='function';}
