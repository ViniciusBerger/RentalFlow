# Execute the CI commands in PowerShell after installing Node 22+.
# From the repository root: powershell -ExecutionPolicy Bypass -File scripts/ci-local.ps1
$ErrorActionPreference = 'Stop'
function Run-Step([string] $workdir, [string] $title, [string] $command) {
  Write-Host "`n== $workdir :: $title ==" -ForegroundColor Cyan
  Push-Location $workdir
  try {
    cmd /c $command
    if ($LASTEXITCODE -ne 0) { throw "$title failed (exit $LASTEXITCODE)" }
  }
  finally { Pop-Location }
}
$root = Split-Path -Parent $PSScriptRoot
$b = Join-Path $root 'backend'
$f = Join-Path $root 'frontend'
Run-Step $b 'install' 'npm ci'
Run-Step $b 'lint' 'npm run lint'
Run-Step $b 'typecheck' 'npm run typecheck'
Run-Step $b 'coverage' 'npm run test:cov'
Run-Step $b 'HTTP integration' 'npm run test:e2e -- --runInBand'
Run-Step $b 'dev auth smoke' 'node --test dev-auth.test.cjs'
Run-Step $b 'production build' 'npm run build'
Run-Step $f 'install' 'npm ci'
Run-Step $f 'lint' 'npm run lint'
Run-Step $f 'typecheck' 'npm run typecheck'
Run-Step $f 'coverage' 'npm run test:cov'
Run-Step $f 'UI smoke' 'node --test ui-redesign.test.mjs'
Run-Step $f 'production build' 'npm run build'
Write-Host "`nAll local CI steps passed" -ForegroundColor Green
