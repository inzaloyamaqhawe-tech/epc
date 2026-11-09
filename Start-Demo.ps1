$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:DEMO_MODE = 'true'
$env:NODE_ENV = 'development'
$env:HOST = '127.0.0.1'
$env:PORT = '4310'
$env:APP_ORIGIN = 'http://127.0.0.1:4310'
node server.js
