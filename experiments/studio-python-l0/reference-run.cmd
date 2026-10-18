@echo off
setlocal
cd /d "%~dp0"
"%~dp0bin\node.exe" "%~dp0reference-runner.mjs" %1 %2
set "testResult=%ERRORLEVEL%"
echo.
echo Teste encerrado. Resultados na pasta .cache\studio-python-l0.
pause
exit /b %testResult%
