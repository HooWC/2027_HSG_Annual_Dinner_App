# Wrapper — builds from short path C:\hsgad\app
Set-Location (Split-Path $PSScriptRoot -Parent)
node .\scripts\build-short.js @args
