# Deploy — devDraw Backend

Segue o mesmo modelo usado no FinanceAPI e no PriceWatch: **GitHub Actions → Docker
Hub → Watchtower**, rodando no home server (Ubuntu 24.04, Docker).

```
push para main → GitHub Actions roda os testes → build da imagem → push para
Docker Hub (gustavodamassa/devdraw-api) → Watchtower detecta a nova imagem a
cada 30s → recria o container devdraw-api automaticamente
```

---

## 1. Pipeline (CI/CD)

Workflow: [.github/workflows/backend-deploy.yml](../.github/workflows/backend-deploy.yml)

- Disparado em todo push em `main` que altera `backend/**`
- Job `test`: instala dependências e roda a suíte unitária (`npm test`)
- Job `build-and-push`: builda a imagem com o [Dockerfile](../backend/Dockerfile)
  multi-stage e publica em `gustavodamassa/devdraw-api:latest`

### Secrets necessários no repositório GitHub

Configure em **Settings → Secrets and variables → Actions**:

| Secret | Descrição |
|---|---|
| `DOCKERHUB_USERNAME` | Usuário do Docker Hub (`gustavodamassa`) |
| `DOCKERHUB_TOKEN` | Access Token do Docker Hub (não a senha — gere em Account Settings → Security) |

---

## 2. Setup inicial no home server (executar uma única vez)

Acesse o servidor:

```bash
ssh gustavo@192.168.0.244
# ou remotamente:
ssh -o "ProxyCommand cloudflared access ssh --hostname ssh.financeapi.com.br" gustavo@ssh.financeapi.com.br
```

Clone o repositório na estrutura padrão:

```bash
mkdir -p ~/servidor/devdraw && cd ~/servidor/devdraw
git clone <url-do-repositorio> .
```

Crie o arquivo `.env` (não vai para o git — contém segredos):

```bash
# App
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://devdraw.gustavohdev.com.br

# Database
DATABASE_HOST=devdraw-postgres
DATABASE_PORT=5432
DATABASE_USER=devdraw
DATABASE_PASSWORD=<senha-forte-gerada>
DATABASE_NAME=devdraw_prod

# JWT
JWT_ACCESS_SECRET=<gerar com: openssl rand -hex 32>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<gerar com: openssl rand -hex 32>
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth2
GOOGLE_CLIENT_ID=<client-id-de-producao>
GOOGLE_CLIENT_SECRET=<client-secret-de-producao>
GOOGLE_CALLBACK_URL=https://devdraw-api.gustavohdev.com.br/auth/google/callback

# Encryption (32 bytes em hex — gerar com: openssl rand -hex 32)
ENCRYPTION_MASTER_KEY=<chave-mestra-de-producao>
```

> **Importante**: gere segredos novos para produção — nunca reutilize os valores
> de desenvolvimento (`backend/.env`).

Suba os containers:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Rode as migrations (primeira vez e a cada nova migration):

```bash
docker compose -f docker-compose.prod.yml exec devdraw-api \
  npx typeorm migration:run -d dist/data-source.js
```

---

## 3. Cloudflare Tunnel

Edite `/etc/cloudflared/config.yml` (não `~/.cloudflared/config.yml`) e adicione
o hostname da API:

```yaml
ingress:
  - hostname: devdraw-api.gustavohdev.com.br
    service: http://localhost:8085
  # ... demais entradas existentes
```

Reinicie o serviço:

```bash
sudo systemctl restart cloudflared
```

No painel da Cloudflare (DNS do domínio `gustavohdev.com.br`), crie um registro
CNAME `devdraw-api` apontando para o túnel — igual ao já feito para
`pricewatch-api`.

> O frontend (`devdraw.gustavohdev.com.br`) é hospedado na Vercel, fora do
> escopo deste documento de deploy de backend.

---

## 4. Operação do dia a dia

```bash
cd ~/servidor/devdraw

# status dos containers
docker compose -f docker-compose.prod.yml ps

# logs da API
docker compose -f docker-compose.prod.yml logs -f devdraw-api

# reiniciar manualmente (normalmente não é necessário — Watchtower cuida disso)
docker compose -f docker-compose.prod.yml restart devdraw-api
```

### Containers

| Container | Descrição |
|---|---|
| `devdraw-api` | Backend NestJS (porta 8080 interna) |
| `devdraw-postgres` | PostgreSQL 16 |
| `devdraw-nginx` | Nginx reverse proxy (porta 8085 no host) |
| `devdraw-watchtower` | Auto-deploy — verifica `devdraw-api` no Docker Hub a cada 30s |

---

## 5. Notas

- SSL é gerenciado pela Cloudflare — o Nginx escuta apenas HTTP
- `restart: unless-stopped` em todos os containers — sobem automaticamente após reboot
- A configuração do Nginx já inclui os headers `Upgrade`/`Connection` necessários
  para o WebSocket de colaboração em tempo real
- Variáveis de ambiente nunca vão para o git — ficam apenas no `.env` do servidor
