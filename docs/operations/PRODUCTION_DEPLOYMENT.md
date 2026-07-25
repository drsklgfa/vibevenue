# Implantação de produção

## 1. Repositório

- use repositório privado;
- substitua `@OWNER_GITHUB` no CODEOWNERS;
- ative ruleset da branch `main` e environment `production`;
- faça upload do conteúdo, não do ZIP dentro do repositório;
- aguarde o workflow `quality` verde.

## 2. Secrets

Em computador confiável:

```bash
npm run security:generate-secrets -- --output .secrets.generated.env
npm run security:verify-environment -- --file .secrets.generated.env --mode secrets-only
```

Cadastre os quatro valores diretamente no secret manager e apague o arquivo. Não envie os valores na conversa.

## 3. Serviços externos

Crie ambientes separados:

- PostgreSQL privado, persistente, TLS e backup do provedor;
- Redis privado/persistente;
- bucket S3 privado, criptografado e versionado;
- serviço ClamAV acessível apenas pela rede privada;
- domínio e DNS protegidos;
- Resend ou provedor de e-mail com domínio autenticado;
- central de logs/alertas e, quando necessário, CDN/WAF.

## 4. Staging

Use `render.staging.example.yaml` como base. Preencha secrets e URLs, publique, execute migrations no pre-deploy, bootstrap da plataforma, fluxos funcionais, cross-tenant, e-mail, uploads, backup/restore e staging security check.

## 5. Produção

Use `render.production.example.yaml` como base. Não reutilize banco, Redis, bucket ou secrets de staging. Verifique:

```text
DEPLOYMENT_MODE=commercial
DEMO_MODE=false
AUTO_SEED_DEMO=false
AUTO_MIGRATE=false
REQUIRE_CLOUD_SERVICES=true
DATABASE_SSL=true
AUTH_COOKIE_SECURE=true
RETURN_ADMIN_TOKEN=false
DISTRIBUTED_RATE_LIMIT=true
MEDIA_SCAN_MODE=required
BACKUP_REQUIRE_ENCRYPTION=true
```

A etapa `preDeployCommand` executa as migrações com trava. A API não deve migrar automaticamente durante o boot.

## 6. Administrador da plataforma

Após migrations:

```bash
npm run platform:bootstrap -- --email administrador@seudominio.com --name "Administrador VibeVenue"
```

Guarde a senha temporária, faça login, altere a senha, cadastre MFA e códigos de recuperação. Não use a conta para tarefas rotineiras de suporte quando não forem necessárias.

## 7. Validação

- `/live` e `/ready` em HTTP 200;
- login, MFA, step-up e recuperação;
- criação de cliente e isolamento;
- pedidos, reserva, mídia, faturas e auditoria;
- upload limpo aceito e arquivo inválido recusado;
- backup, restauração e reconciliação S3;
- alertas e incidentes simulados;
- pentest/reteste;
- checklist final aprovado.

## 8. Rollout

Comece com um cliente piloto e monitore erros, latência, custos, uso, e-mail e storage. Amplie gradualmente. Mantenha rollback e modo somente leitura preparados.
