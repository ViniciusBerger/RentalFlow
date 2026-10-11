/** Contract clauses are plain text, never trusted HTML or template code. */
export function safeClauseText(input:unknown):string {
 if(typeof input!=='string' || input.length>10000 || input.trim().length<3) throw new Error('Invalid contract clause');
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(input)) throw new Error('Control characters are not allowed');
 return input.normalize('NFC').trim();
}
/** Only for explicitly required HTML output; prefer text nodes in React/PDF. */
export function escapeContractHtml(value:string):string {
 return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
   .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
