# Deploy no Render

## 1. Repositório e CI

Use repositório exclusivo do VibeVenue. Envie para `main` e confirme o job `quality` verde antes do Blueprint.

```bash
git init
git add -A
git commit -m "Publica VibeVenue"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

## 2. Blueprint

```text
New → Blueprint
Blueprint Name: vibevenue
Branch: main
Blueprint Path: render.yaml
```

A demonstração cria banco, Redis, API e site. O health check oficial da API é `/ready`.

## 3. Verificação

```text
URL_DA_API/live
URL_DA_API/ready
```

`/live` deve retornar `200`. `/ready` deve retornar `200` com dependências saudáveis. O modo demo inicial usa `espaco-aurora` e área `SALAO`.

## 4. Limites do gratuito

Serviço pode dormir, banco é demonstrativo e armazenamento local não é persistente. Redis não deve guardar dados críticos como fonte única.

## 5. Produção comercial

O `render.yaml` é uma base demonstrativa. Em produção use planos persistentes e configure:

```text
DEPLOYMENT_MODE=commercial
REQUIRE_CLOUD_SERVICES=true
DEMO_MODE=false
AUTO_SEED_DEMO=false
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
RETURN_ADMIN_TOKEN=false
STORAGE_DRIVER=s3
AUDIT_IP_SALT=<segredo aleatório com 32+ caracteres>
BILLING_GRACE_DAYS=5
EXPIRED_GUEST_RETENTION_DAYS=30
AUDIT_RETENTION_DAYS=730
```

Configure PostgreSQL, Redis, S3 e `WEB_ORIGINS` com a origem exata. Mantenha `AUTH_COOKIE_DOMAIN` vazio salvo necessidade. Use `SameSite=none` apenas quando frontend e API forem realmente cross-site, sempre com HTTPS.

Após o deploy:

- cookie administrativo deve aparecer como `HttpOnly`;
- não pode existir `vibevenue-admin-token` no armazenamento local;
- `/ready` deve confirmar dependências;
- `x-request-id` deve aparecer nas respostas;
- backup, restauração e alertas devem ser testados.

## 6. Primeiro cliente

Não use a conta demonstrativa. Execute `npm run client:create` em ambiente com acesso seguro ao banco e consulte `COMMERCIAL_SETUP.md`.


## Primeiro acesso comercial

Depois que a API estiver `Live` e as migrações tiverem sido aplicadas, abra o Shell do serviço da API e execute:

```bash
npm run platform:bootstrap -- --email administrador@seudominio.com --name "Administrador VibeVenue"
```

Copie a senha temporária uma única vez, abra o site com `/?admin=1`, troque a senha e use o console da plataforma para cadastrar o primeiro cliente.
