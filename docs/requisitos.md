# DevDraw — Requisitos

> "Onde o rascunho vira arquitetura."
> Data: 2026-05-24 | Atualizado: 2026-05-29

---

## Contexto

Aplicação web para engenheiros de software rascunharem, diagramarem e organizarem pensamento técnico antes ou durante a codificação. Inspirada em três produtos:

- **Excalidraw** — experiência de desenho livre e limpa
- **Miro** — colaboração em tempo real em um mesmo canvas
- **Obsidian** — organização hierárquica e vínculos entre conteúdos

Foco em organização hierárquica por projetos, colaboração multi-usuário e segurança dos dados.

---

## Stack definida

| Camada | Tecnologia |
|---|---|
| Backend | NestJS (Node.js + TypeScript) |
| Frontend | React (Vite) + Tailwind CSS + TLDraw SDK |
| Banco | PostgreSQL (JSONB + Recursive CTEs) |
| Auth | Google OAuth2 (Passport.js) + JWT |
| Criptografia | AES-256-GCM server-side (chave por projeto) |
| Tempo real | Socket.io (NestJS Gateway) + `@tldraw/sync` + Y.js (CRDT) |
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

### RF-02 — Projetos
- Criar projeto com nome — projeto é a unidade colaborativa raiz
- Listar projetos do usuário autenticado (como owner ou membro)
- Renomear e excluir projeto (apenas owner)
- Cada projeto possui sua própria árvore de nós (FOLDER/FILE)

### RF-03 — Vault (gestão de nós)
- Criar nó do tipo `FOLDER` ou `FILE` com nome e `parent_id` opcional (raiz = null), dentro de um projeto
- Estrutura recursiva infinita — uma pasta pode conter pastas e arquivos
- Renomear, mover (alterar `parent_id`) e excluir nó
- Soft delete: nós excluídos recebem `deleted_at`, não são removidos fisicamente
- Listar árvore de nós do projeto autenticado via Recursive CTE
- Listagem exibe apenas nome e ícone de tipo (`FOLDER` / `FILE`) — sem thumbnails

### RF-04 — Canvas
- Editor de desenho baseado no TLDraw SDK
- Suporte a formas geométricas, setas/conectores, texto livre, sticky notes, trechos de código
- Salvar estado do canvas como JSON no campo `content` (JSONB)
- Auto-save com debounce de 1,5s — sem botão manual de salvar

### RF-05 — Versionamento
- Ao salvar o canvas, registrar snapshot em tabela `node_versions` (JSON + `user_id` + `created_at`)
- Interface para visualizar histórico de versões de um arquivo
- Capacidade de restaurar versão anterior

### RF-06 — Criptografia
- Conteúdo JSONB criptografado com AES-256-GCM antes de persistir no banco
- Chave derivada por projeto (`masterKey` do servidor + `project_id`) — todos os membros usam a mesma chave
- Descriptografia transparente ao carregar o arquivo

### RF-07 — Exportação
- Exportar canvas como PNG, SVG ou JSON raw (client-side via TLDraw export API)

### RF-08 — Membros e Papéis
- Cada projeto tem membros com papéis: `OWNER`, `EDITOR`, `VIEWER`
- Owner pode adicionar e remover membros e alterar papéis
- EDITOR pode criar/editar/deletar nós; VIEWER só lê
- Owner não pode ser removido do próprio projeto

### RF-09 — Convites
- Owner convida usuário por e-mail
- Convite gera token único com validade de 7 dias
- Usuário convidado aceita ou declina via link
- Convite pendente pode ser cancelado pelo owner

### RF-10 — Colaboração em Tempo Real
- Múltiplos usuários com papel EDITOR podem editar o mesmo canvas simultaneamente
- Sync de canvas via WebSocket usando `@tldraw/sync` + Y.js (CRDT) — sem conflitos de edição simultânea
- Presença em tempo real: cursores e avatares dos colaboradores ativos visíveis no canvas
- Usuário é notificado ao entrar/sair do canvas (evento de presença)

---

## Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| Segurança | Dados criptografados em repouso; HTTPS via Cloudflare; tokens de curta duração |
| Performance | Auto-save debounced; índice em `parent_id` e `project_id`; Recursive CTE para consultas de árvore |
| Isolamento | Todo acesso a nós verifica membership no projeto — isolamento total entre projetos |
| Tempo real | WebSocket rooms por `node_id`; Y.js CRDT garante convergência sem locks |
| Disponibilidade | Docker + `restart: unless-stopped`; Watchtower com atualização automática |
| Observabilidade | Logs estruturados (NestJS Logger); `GlobalExceptionFilter` captura todos os erros |
| Validação | `class-validator` em todos os DTOs de entrada |
| Rate limiting | NestJS Throttler para proteger endpoints públicos |
| CORS | Configurado para aceitar apenas o domínio do frontend (Vercel) |

---

## Fora do Escopo (v1)

- Compartilhamento de link público
- Thumbnails / miniaturas do canvas
- Notificações por e-mail (além do convite)
- Mobile app
- Links semânticos entre nós ao estilo Obsidian (graph view) — arquitetura não bloqueia, mas não implementado nesta fase

---

## Roadmap de Fases

| Fase | Descrição | Status |
|---|---|---|
| 1 | Requisitos | ✅ |
| 2 | Arquitetura | ✅ |
| 3 | Setup (monorepo, dependências, Docker, git) | ✅ |
| 4 | Infraestrutura transversal (exceptions, auth, criptografia) | ✅ |
| 5 | Domínios: User → Node → NodeVersion | ✅ |
| 6 | Migrations V1 (schema snake_case) | ✅ |
| 7 | Testes de integração (Testcontainers) | ✅ |
| 8 | Domínio Projects + refatoração de Nodes (project_id) + membros + convites | ✅ |
| 9 | Módulo de colaboração em tempo real (WebSockets + @tldraw/sync + Y.js) | ✅ |
| 10 | Migrations V2 (projects, project_members, invitations; nodes.project_id) + testes de integração | ✅ |
| 11 | Testes de integração (colaboração WebSocket) | — |
| 12 | Produção (Dockerfile, CI/CD, deploy no home server) | — |
