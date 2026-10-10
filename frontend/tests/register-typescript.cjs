/** Node's built-in test runner can execute the TypeScript/TSX UI tests offline.
 * Source is transpiled in memory; no production files are rewritten.
 */
const fs = require('node:fs');
const ts = require('typescript');
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8').replaceAll(
      'import.meta.env.VITE_API_URL', 'process.env.VITE_API_URL',
    );
    const output = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022, esModuleInterop: true,
      },
    }).outputText;
    module._compile(output, filename);
  };
}
