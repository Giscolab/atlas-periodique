Set-Location $PSScriptRoot
python (Join-Path $PSScriptRoot 'server.py') --port 8084 --auto-port --open
