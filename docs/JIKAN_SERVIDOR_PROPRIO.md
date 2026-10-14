# Servidor próprio do Jikan — Guia completo (PT-BR)

Este guia mostra como hospedar sua própria instância da API Jikan, para que a
importação do catálogo não dependa da disponibilidade da API pública
(`api.jikan.moe`).

## O que você precisa

- Um servidor ligado 24h: VPS (Hetzner, DigitalOcean, Oracle Cloud gratuito,
  Contabo...), um Raspberry Pi 4/5 ou um NAS com Docker.
- **Mínimo recomendado:** 2 GB de RAM, 2 vCPUs, 20 GB de disco.
- Docker e Docker Compose instalados.
- (Opcional, mas recomendado) Um domínio apontando para o servidor, para ativar
  HTTPS — o nosso app só aceita endereços `https://`.

## Passo 1 — Instalar o Docker (Ubuntu/Debian)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# saia e entre novamente na sessão para valer o grupo docker
```

## Passo 2 — Criar a pasta do projeto

```bash
mkdir -p ~/jikan && cd ~/jikan
```

## Passo 3 — Criar o arquivo `docker-compose.yml`

Cole o conteúdo abaixo em `~/jikan/docker-compose.yml`.
Versão simplificada do compose oficial, com senhas por variável de ambiente
(em vez de arquivos de segredo) para facilitar a instalação:

```yaml
version: "3.8"

volumes:
  mongo-data: {}
  redis-data: {}
  typesense-data: {}

services:
  jikan-rest:
    image: docker.io/jikanme/jikan-rest:latest
    container_name: jikan-rest
    restart: unless-stopped
    ports:
      - "8080:8080/tcp"
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
      # Banco de dados (MongoDB)
      DB_CONNECTION: mongodb
      DB_HOST: mongodb
      DB_PORT: 27017
      DB_DATABASE: jikan
      DB_USERNAME: ${MONGO_USER}
      DB_PASSWORD: ${MONGO_PASS}
      # Cache e filas (Redis)
      CACHE_DRIVER: redis
      QUEUE_CONNECTION: redis
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASS}
      # Busca (Typesense)
      TYPESENSE_HOST: typesense
      TYPESENSE_PORT: 8108
      TYPESENSE_API_KEY: ${TYPESENSE_KEY}
      SCOUT_DRIVER: typesensesearch
    depends_on:
      - mongodb
      - redis
      - typesense

  mongodb:
    image: docker.io/mongo:focal
    container_name: jikan-mongodb
    restart: unless-stopped
    command: "--wiredTigerCacheSizeGB 1.0"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ADMIN_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ADMIN_PASS}
      MONGO_INITDB_DATABASE: jikan
    volumes:
      - mongo-data:/data/db

  redis:
    image: docker.io/redis:alpine
    container_name: jikan-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASS}
    volumes:
      - redis-data:/data

  typesense:
    image: docker.io/typesense/typesense:0.25.2
    container_name: jikan-typesense
    restart: unless-stopped
    command: "--data-dir /data --api-key=${TYPESENSE_KEY}"
    volumes:
      - typesense-data:/data
```

## Passo 4 — Criar o arquivo `.env` com as senhas

Crie `~/jikan/.env` (gere senhas fortes e únicas):

```env
MONGO_ADMIN_USER=admin
MONGO_ADMIN_PASS=TROQUE_por_senha_forte_1
MONGO_USER=jikan
MONGO_PASS=TROQUE_por_senha_forte_2
REDIS_PASS=TROQUE_por_senha_forte_3
TYPESENSE_KEY=TROQUE_por_chave_forte_4
```

> Dica: gere senhas com `openssl rand -hex 24`.

## Passo 5 — Subir os serviços

```bash
cd ~/jikan
docker compose up -d
docker compose ps   # todos devem aparecer "running"
```

## Passo 6 — Popular o banco (indexação inicial)

O servidor sobe vazio. É preciso rodar o indexador, que baixa os dados do
MyAnimeList. **A carga inicial pode levar várias horas** — rode dentro de uma
sessão `tmux`/`screen` para não perder se a conexão cair:

```bash
# indexação completa inicial (demorada)
docker exec -it jikan-rest php artisan indexer:anime --full

# depois, para manter atualizado, agende no cron do servidor:
# docker exec jikan-rest php artisan indexer:anime
```

Acompanhe o progresso com:

```bash
docker logs -f jikan-rest
```

## Passo 7 — Testar

```bash
curl http://localhost:8080/v4/anime/1
# deve retornar o JSON do anime Cowboy Bebop (após a indexação)
```

## Passo 8 — HTTPS (obrigatório para o nosso app)

O nosso app só aceita endereços `https://`. A forma mais simples é com
Caddy + um domínio:

1. Aponte um subdomínio (ex.: `jikan.seudominio.com`) para o IP do servidor.
2. Instale o Caddy: `sudo apt install caddy`
3. Edite `/etc/caddy/Caddyfile`:

   ```
   jikan.seudominio.com {
       reverse_proxy localhost:8080
   }
   ```

4. `sudo systemctl reload caddy` — o certificado HTTPS é emitido
   automaticamente.

## Passo 9 — Ligar ao nosso app

Me envie o endereço final terminando em `/v4`
(ex.: `https://jikan.seudominio.com/v4`). Eu salvo com segurança nos secrets
(`JIKAN_BASE_URL`) e a importação passa a usar o seu servidor primeiro,
caindo para a API pública automaticamente se o seu falhar.

## Manutenção

- **Atualizar o Jikan:** `docker compose pull && docker compose up -d`
- **Ver logs:** `docker compose logs -f jikan-rest`
- **Espaço em disco:** o MongoDB cresce com o tempo; monitore com `df -h`.
- **Backup:** os dados ficam nos volumes `mongo-data`, `redis-data` e
  `typesense-data` (`docker volume ls`).
