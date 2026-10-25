#!/usr/bin/env bash
# Script de inicialização do backend Doctor Express (Linux/macOS)
# Cria o venv (se não existir), instala dependências e sobe o servidor Flask.

set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo ">> Criando ambiente virtual (.venv)..."
  python3 -m venv .venv
fi

echo ">> Ativando ambiente virtual..."
# shellcheck disable=SC1091
source .venv/bin/activate

echo ">> Instalando dependências..."
pip install --upgrade pip
pip install -r requirements.txt

echo ">> Iniciando servidor Flask em http://localhost:5000"
python app.py
