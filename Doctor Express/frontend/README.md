# Doctor Express — Frontend (Angular 17)

Aplicação Angular standalone que consome a API REST do Doctor Express.

## Stack

- **Angular 17** (componentes standalone, signals, novos `@if`/`@for`)
- **TypeScript 5.4**
- HttpClient + Router

## Como rodar

```bash
cd frontend
npm install
npm start
```

A aplicação abrirá em `http://localhost:4200/`.

> O proxy `proxy.conf.json` redireciona automaticamente requisições para `/api`
> ao backend em `http://localhost:5000`. Por isso, antes de iniciar o frontend,
> garanta que o backend esteja rodando.

## Estrutura

```
src/
├── index.html
├── main.ts
├── styles.css
└── app/
    ├── app.component.ts
    ├── app.config.ts
    ├── app.routes.ts
    ├── core/
    │   ├── api.service.ts        # Cliente HTTP da API
    │   ├── auth.service.ts       # Login, registro, sessão
    │   ├── auth.interceptor.ts   # Adiciona JWT às requisições
    │   ├── auth.guard.ts         # Proteção de rotas + papéis
    │   └── models.ts             # Tipagens
    ├── shared/
    │   └── app-header.component.ts
    └── pages/
        ├── login/
        ├── register/
        ├── patient/              # Painel do paciente
        ├── provider/             # Painel do prestador
        └── admin/                # Painel administrativo
```

## Telas

- **/login** — autenticação (RF02)
- **/register** — cadastro de paciente ou prestador (RF01)
- **/patient** — busca de serviços (RF09), solicitação (RF04), acompanhamento e avaliação (RF08), reporte (RF12)
- **/provider** — publicação de serviços (RF03), aceitação/recusa (RF06) e conclusão de atendimentos
- **/admin** — gestão de usuários, validação de prestadores (RN01), reportes e logs de auditoria (RNF08)

## Acessibilidade (RNF05)

- Labels em todos os campos de formulário
- `role`, `aria-label` e `aria-modal` nos pontos relevantes
- Navegação via teclado (foco visível com `outline` amarelo)
- Contraste adequado (paleta validada)
