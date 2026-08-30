@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo   Otimizador de Vagas em Creches  -  INICIAR
echo ==================================================
echo.

REM -------------------------------------------------- Backend: ambiente virtual
if exist "backend\.venv\Scripts\python.exe" goto venv_ok
echo [backend] Criando ambiente virtual isolado .venv ...
python -m venv "backend\.venv"
if errorlevel 1 goto erro
echo [backend] Instalando dependencias (runtime + ETL) ...
"backend\.venv\Scripts\python.exe" -m pip install --upgrade pip >nul
"backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt" -r "backend\requirements-etl.txt"
if errorlevel 1 goto erro
echo.
:venv_ok

REM -------------------------------------------------- Backend: agregados do ETL
if exist "backend\app\data\meta.json" goto dados_ok
echo [backend] Agregados ausentes - gerando a partir das bases ...
cd "backend"
".venv\Scripts\python.exe" -m app.etl.build_aggregates
if errorlevel 1 goto erro_pop
cd ..
echo.
:dados_ok

REM -------------------------------------------------- Frontend: dependencias npm
if exist "frontend\node_modules" goto npm_ok
echo [frontend] Instalando dependencias npm ...
cd "frontend"
call npm install
if errorlevel 1 goto erro_pop
cd ..
echo.
:npm_ok

echo Subindo os servidores em janelas separadas...
start "Backend - Creches"  /D "%~dp0backend"  cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"
start "Frontend - Creches" /D "%~dp0frontend" cmd /k "npm run dev"

echo.
echo   Backend  : http://localhost:8000/docs
echo   Frontend : http://localhost:5173
echo.
echo Aguardando os servicos subirem...
ping -n 8 127.0.0.1 >nul
start "" http://localhost:5173

echo.
echo Aplicacao iniciada. Para encerrar, execute:  finalizar.bat
echo (Fechar esta janela nao encerra os servidores.)
echo.
pause
goto fim

:erro_pop
cd /d "%~dp0"
:erro
echo.
echo *** Falha na inicializacao. Verifique as mensagens acima. ***
pause
exit /b 1

:fim
exit /b 0
