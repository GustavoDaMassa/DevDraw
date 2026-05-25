# DevDraw — Requisitos

> "Onde o rascunho vira arquitetura."
> Data: 2026-05-24

---

## Contexto

Aplicação web para engenheiros de software rascunharem, diagramarem e organizarem pensamento técnico antes ou durante a codificação. Foco em organização hierárquica, segurança dos dados e experiência limpa (estilo Excalidraw/Notion).

---

## Stack definida

| Camada | Tecnologia |
|---|---|
| Backend | NestJS (Node.js + TypeScript) |
| Frontend | React (Vite) + Tailwind CSS + TLDraw SDK |
| Banco | PostgreSQL (JSONB + Recursive CTEs) |
| Auth | Google OAuth2 (Passport.js) + JWT |
| Criptografia | AES-256-GCM server-side |
| Deploy API | Home server — Docker + Watchtower |
| Deploy Frontend | Vercel |
| Domínio API | devdraw-api.gustavohdev.com.br |
| Domínio Frontend | devdraw.gustavohdev.com.br |

---

## Requisitos Funcionais

### RF-01 — Autenticação
- Login via Google OAuth2
- Sessão gerenciada com JWT: access token (15 min) + refresh token (7 dias, rotativo)
- Logout com revogação do refresh token no banco

### RF-02 — Vault (gestão de nós)
- Criar nó do tipo `FOLDER` ou `FILE` com nome e `parent_id` opcional (raiz = null)
- Estrutura recursiva infinita — uma pasta pode conter pastas e arquivos
- Renomear, mover (alterar `parent_id`) e excluir nó
- Soft delete: nós excluídos recebem `deleted_at`, não são removidos fisicamente
- Listar árvore de nós do usuário autenticado via Recursive CTE
- Listagem exibe apenas nome e ícone de tipo (`FOLDER` / `FILE`) — sem thumbnails

### RF-03 — Canvas
- Editor de desenho baseado no TLDraw SDK
- Suporte a formas geométricas, setas/conectores, texto livre, sticky notes, trechos de código
- Salvar estado do canvas como JSON no campo `content` (JSONB)
- Auto-save com debounce de 1,5s — sem botão manual de salvar

### RF-04 — Versionamento
- Ao salvar o canvas, registrar snapshot em tabela `node_versions` (JSON + `user_id` + `created_at`)
- Interface para visualizar histórico de versões de um arquivo
- Capacidade de restaurar versão anterior

### RF-05 — Criptografia
- Conteúdo JSONB criptografado com AES-256-GCM antes de persistir no banco
- Chave derivada por usuário (`masterKey` do servidor + `user_id`)
- Descriptografia transparente ao carregar o arquivo

### RF-06 — Exportação
- Exportar canvas como PNG, SVG ou JSON raw (client-side via TLDraw export API)

---

## Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| Segurança | Dados criptografados em repouso; HTTPS via Cloudflare; tokens de curta duração |
| Performance | Auto-save debounced; índice em `parent_id`; Recursive CTE para consultas de árvore |
| Multitenancy | Todo `SELECT` filtra por `user_id` — isolamento total entre usuários |
| Disponibilidade | Docker + `restart: unless-stopped`; Watchtower com atualização automática |
| Observabilidade | Logs estruturados (NestJS Logger); `GlobalExceptionFilter` captura todos os erros |
| Validação | `class-validator` em todos os DTOs de entrada |
| Rate limiting | NestJS Throttler para proteger endpoints públicos |
| CORS | Configurado para aceitar apenas o domínio do frontend (Vercel) |

---

## Fora do Escopo (v1)

- Colaboração em tempo real (WebSockets) — arquitetura não bloqueia, mas não implementado
- Compartilhamento de link público
- Thumbnails / miniaturas do canvas
- Notificações
- Mobile app

---

## Roadmap de Fases

| Fase | Descrição |
|---|---|
| 1 | Requisitos ✅ |
| 2 | Arquitetura |
| 3 | Setup (monorepo, dependências, Docker, git) |
| 4 | Infraestrutura transversal (exceptions, auth, criptografia) |
| 5 | Domínios: User → Node → NodeVersion |
| 6 | Migrations SQL finais |
| 7 | Testes de integração |
| 8 | Produção (Dockerfile, CI/CD, deploy no home server) |
