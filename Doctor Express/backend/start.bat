@echo off
REM Script de inicializacao do backend Doctor Express (Windows)
REM Cria o venv (se nao existir), instala dependencias e sobe o servidor Flask.

cd /d "%~dp0"

if not exist ".venv" (
    echo ^>^> Criando ambiente virtual (.venv)...
    python -m venv .venv
)

echo ^>^> Ativando ambiente virtual...
call .venv\Scripts\activate.bat

echo ^>^> Instalando dependencias...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo ^>^> Iniciando servidor Flask em http://localhost:5000
python app.py
