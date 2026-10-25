# Doctor Express — Backend (Flask + SQLite)

API REST do sistema **Doctor Express**, plataforma para conectar pacientes a profissionais de saúde.

## Stack

- **Python 3.10+**
- **Flask** + **Flask-SQLAlchemy** + **Flask-JWT-Extended** + **Flask-CORS**
- **SQLite** (gerado automaticamente em `doctor_express.db`)

## Como rodar

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Linux / macOS

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

A API ficará em `http://localhost:5000`.

## Usuário admin padrão

Ao subir o sistema pela primeira vez, é criado automaticamente:

- **e-mail:** `admin@doctorexpress.com`
- **senha:** `admin123`

## Endpoints principais

### Autenticação (`/api/auth`)
- `POST /register` — cadastra paciente ou prestador (RF01)
- `POST /login` — autenticação JWT (RF02)
- `GET  /me` — dados do usuário autenticado

### Serviços (`/api/services`)
- `GET  /` — lista serviços com filtros: `category`, `specialty`, `city`, `min_rating` (RF09)
- `POST /` — prestador publica serviço (RF03)
- `GET  /mine` — meus serviços (prestador)
- `PUT  /<id>` — atualiza serviço
- `DELETE /<id>` — remove serviço

### Solicitações (`/api/requests`)
- `POST /match` — matching automático com base em categoria/especialidade/cidade (RF05)
- `POST /` — paciente cria solicitação (RF04)
- `GET  /mine` — minhas solicitações (paciente ou prestador)
- `POST /<id>/accept` — prestador aceita (RF06 + RF07 controle de concorrência)
- `POST /<id>/refuse` — prestador recusa
- `POST /<id>/complete` — prestador conclui (libera avaliação - RN03)
- `POST /<id>/cancel` — paciente cancela (RN02)

### Avaliações (`/api/ratings`)
- `POST /` — cria avaliação (RF08, RN03)
- `GET  /provider/<id>` — avaliações de um prestador

### Admin (`/api/admin`)
- `GET  /users` — lista usuários
- `POST /users/<id>/validate` — valida prestador (RN01)
- `POST /users/<id>/toggle-active` — ativa/desativa usuário
- `GET  /reports` — lista reportes
- `POST /reports` — qualquer usuário cria reporte (RF12)
- `POST /reports/<id>/resolve` — resolve reporte
- `GET  /logs` — auditoria (RNF08)

## Mapeamento de requisitos atendidos

| Requisito | Implementação |
|-----------|---------------|
| RF01 Cadastro | `routes/auth.py` |
| RF02 Autenticação JWT | `routes/auth.py` |
| RF03 Publicação | `routes/services.py` |
| RF04 Solicitação | `routes/requests.py` |
| RF05 Matching | `_match_providers()` em `routes/requests.py` |
| RF06 Aceitação | `routes/requests.py` |
| RF07 Concorrência | `UPDATE` condicional ao status `pending` |
| RF08 Avaliação | `routes/ratings.py` |
| RF09 Filtros | `routes/services.py` |
| RF12 Reporte | `routes/admin.py` |
| RNF04 Segurança | hash de senha + JWT |
| RNF08 Auditoria | tabela `audit_logs` + `log_action()` |
| RN01 Validação prestador | flag `validated` + admin |
| RN02 Cancelamento | regra em `cancel_request()` |
| RN03 Avaliação pós conclusão | bloqueio em `create_rating()` |
