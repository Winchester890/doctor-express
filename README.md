# Doctor Express — Fila Saúde

Plataforma para conectar pacientes a profissionais de saúde, clínicas e hospitais
de forma rápida e segura, conforme especificação acadêmica da Universidade
Presbiteriana Mackenzie (Pensamento Computacional / Sistemas de Informação).

> Sistema de informação distribuído composto por **módulo de serviço (backend)** e
> **módulo de consumo (frontend)**, com persistência em **SQLite** e autenticação JWT.

## Stack escolhida

| Camada | Tecnologia |
|--------|------------|
| Backend | Python 3.10+ • Flask • Flask-SQLAlchemy • Flask-JWT-Extended • Flask-CORS |
| Banco | SQLite (arquivo `backend/doctor_express.db`) |
| Frontend | Angular 17 (componentes standalone + signals) |
| Comunicação | REST/JSON sobre HTTP, autenticação JWT |

## Estrutura de diretórios

```
Doctor Express/
├── backend/                # API Flask + SQLite
│   ├── app.py
│   ├── config.py
│   ├── models.py
│   ├── requirements.txt
│   ├── README.md
│   └── routes/
│       ├── auth.py         # RF01, RF02
│       ├── services.py     # RF03, RF09
│       ├── requests.py     # RF04-RF07, RN02
│       ├── ratings.py      # RF08, RN03
│       └── admin.py        # RF12, RN01, RNF08
└── frontend/               # SPA Angular 17
    ├── package.json
    ├── angular.json
    ├── proxy.conf.json
    ├── tsconfig.json
    ├── README.md
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.css
        └── app/
            ├── app.component.ts
            ├── app.config.ts
            ├── app.routes.ts
            ├── core/        # api, auth, guards, interceptor, models
            ├── shared/      # header reutilizável
            └── pages/       # login, register, patient, provider, admin
```

## Pré-requisitos (Windows e Linux)

- **Python 3.10 ou superior** — [python.org/downloads](https://www.python.org/downloads/)
- **Node.js 18 LTS ou superior** — [nodejs.org](https://nodejs.org/en/download/)

> Em distros Linux baseadas em Debian/Ubuntu pode ser necessário instalar
> também o pacote do venv: `sudo apt install python3-venv`.

## Como executar (passo a passo)

> ⚠️ Se você recebeu o projeto compactado, **não inclua/copie** as pastas
> `backend/.venv/`, `frontend/node_modules/` ou `backend/doctor_express.db` —
> elas devem ser geradas localmente em cada máquina.

### 1) Backend

#### 🪟 Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

> Se aparecer erro de "execução de scripts foi desabilitada", rode antes:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

#### 🐧 Linux / 🍎 macOS (bash/zsh)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

A API ficará em `http://localhost:5000`. Na primeira execução o banco
SQLite é criado automaticamente e um administrador padrão é semeado:

- e-mail: `admin@doctorexpress.com`
- senha: `admin123`

### 2) Frontend

Em **outro terminal** (mantenha o do backend rodando), em qualquer SO:

```bash
cd frontend
npm install
npm start
```

Aplicação em `http://localhost:4200`. O proxy do Angular redireciona
chamadas `/api/*` para o backend.

### Atalho — scripts de inicialização

A pasta `backend/` contém dois scripts que automatizam **todo o setup do backend**
(criação do venv, instalação das dependências e início do servidor):

- 🪟 **Windows:** dê duplo clique em `backend\start.bat` ou rode `.\start.bat`
- 🐧 **Linux/macOS:**

  ```bash
  cd backend
  chmod +x start.sh   # apenas na primeira vez
  ./start.sh
  ```

## Fluxo completo de demonstração

1. **Cadastro** de um prestador em `/register` (informe especialidade/CRM/cidade).
2. **Login** como `admin@doctorexpress.com` em `/login` e validação do prestador
   em **Painel administrativo → Usuários → Validar (RN01)**.
3. **Login** como prestador → publicar um serviço (RF03).
4. **Cadastro** e login de um paciente.
5. Paciente busca o serviço com filtros (RF09) e solicita atendimento (RF04).
6. Prestador aceita (RF06; controle de concorrência via update condicional - RF07).
7. Prestador conclui (libera avaliação - RN03).
8. Paciente avalia (RF08).
9. Paciente ou prestador reporta usuário se necessário (RF12).
10. Admin consulta logs em **Auditoria** (RNF08).

## Mapeamento Requisitos → Implementação

| Requisito | Onde está |
|-----------|-----------|
| RF01 Cadastro de Usuário | `backend/routes/auth.py` + `frontend/pages/register` |
| RF02 Autenticação | JWT em `auth.py` + `auth.service.ts` |
| RF03 Publicação de serviços | `services.py` + `provider-dashboard` |
| RF04 Solicitação de serviço | `requests.py` + `patient-dashboard` |
| RF05 Matching automático | `_match_providers()` em `requests.py` |
| RF06 Aceitação | `accept_request()` |
| RF07 Controle de concorrência | UPDATE condicional ao status `pending` |
| RF08 Avaliação | `ratings.py` + modal de avaliação |
| RF09 Filtro de pesquisa | parâmetros `category/specialty/city/min_rating` |
| RF12 Reporte | `admin.py` (`/api/admin/reports`) |
| RNF04 Segurança | hash de senha (Werkzeug) + JWT + CORS |
| RNF05 Acessibilidade | labels, roles, foco visível, contraste |
| RNF08 Auditoria | tabela `audit_logs` + função `log_action()` |
| RN01 Validação prestador | flag `validated`; admin valida em `/admin` |
| RN02 Cancelamento | regra em `cancel_request()` (justificativa após aceito) |
| RN03 Avaliação pós conclusão | bloqueio no `create_rating()` |

## Limitações / Próximos passos

Esta versão acadêmica é deliberadamente simples. Possíveis evoluções futuras:

- HTTPS via reverse proxy (Nginx/Caddy) — RNF04
- PostgreSQL ao invés de SQLite — RNF02
- Mensageria (Redis/RabbitMQ) para notificações em tempo real
- Integração real com Google Maps (RF10), Receita Federal/CNPJ (RF11) e
  agendas externas (RF13)

## Equipe

Projeto de Pesquisa do Curso de Sistemas de Informação — Universidade
Presbiteriana Mackenzie (2026), orientado pela Doutora Sandra Bozolan.
