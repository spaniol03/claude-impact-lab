@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo   Otimizador de Vagas em Creches  -  FINALIZAR
echo ==================================================
echo.

set "ENCERROU="

REM -------- encerra pelo processo que escuta as portas 8000 (API) e 5173 (Vite)
for %%P in (8000 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
    echo   porta %%P  ->  encerrando PID %%I
    taskkill /F /PID %%I >nul 2>&1
    set "ENCERROU=1"
  )
)

REM -------- fallback: fecha as janelas abertas pelo iniciar.bat
taskkill /F /FI "WINDOWTITLE eq Backend - Creches*"  >nul 2>&1 && set "ENCERROU=1"
taskkill /F /FI "WINDOWTITLE eq Frontend - Creches*" >nul 2>&1 && set "ENCERROU=1"

echo.
if defined ENCERROU (
  echo Servidores encerrados.
) else (
  echo Nenhum servidor em execucao nas portas 8000 / 5173.
)
echo.
ping -n 3 127.0.0.1 >nul
endlocal
