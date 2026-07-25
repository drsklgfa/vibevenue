# VibeVenue

[![Quality](https://github.com/drsklgfa/vibevenue/actions/workflows/ci.yml/badge.svg)](https://github.com/drsklgfa/vibevenue/actions/workflows/ci.yml)
[![Portfolio Pages](https://github.com/drsklgfa/vibevenue/actions/workflows/pages.yml/badge.svg)](https://github.com/drsklgfa/vibevenue/actions/workflows/pages.yml)

**Live portfolio:** https://drsklgfa.github.io/vibevenue/

Plataforma SaaS multiestabelecimentos para atendimento, pedidos, música, experiências interativas, eventos, reservas, fidelidade, mídia, métricas e operação comercial.

## Áreas do produto

- **Portal do visitante:** entrada por QR, cardápio, pedidos, chamados, música, quiz, enquetes, mural, avaliação, fidelidade, cupons, campanhas, eventos e reservas.
- **Painel do estabelecimento:** unidades, áreas, equipe, permissões, pedidos, atendimento, música, mídia, eventos, campanhas, métricas, auditoria, cobrança e configurações.
- **Modo TV:** reprodução, fila, QR, conteúdo aprovado e participação em tempo real.
- **Console da plataforma:** clientes, planos, limites, teste, acesso, faturas, credenciais e visão operacional.

## Segurança incorporada

- cookie administrativo HttpOnly, sessão absoluta/inativa e revogação;
- MFA TOTP, códigos de recuperação, recuperação por e-mail e step-up;
- scrypt versionado, HMAC de tokens e AES-256-GCM para segredos/backups;
- isolamento multiempresa e suíte cross-tenant em PostgreSQL real no CI;
- rate limit distribuído por Redis;
- upload com magic bytes, limites, ClamAV e reencode antes do S3;
- CSP com hash, no-store, PWA sem cache de API e headers de proteção;
- auditoria, eventos de segurança, request ID e logs com redaction;
- backup criptografado, restore autenticado, read-only e revogação emergencial;
- CodeQL, dependency review, SBOM, audit, release e proveniência configurados.

Consulte [`SECURITY.md`](SECURITY.md), [`FINAL_STATUS.md`](FINAL_STATUS.md) e [`docs/operations/GO_LIVE_OWNER_CHECKLIST.md`](docs/operations/GO_LIVE_OWNER_CHECKLIST.md).

## Stack

- Next.js 16, React 19 e TypeScript;
- Node.js 22, Express 5 e Socket.IO;
- PostgreSQL e Redis;
- Zod, Sharp, S3 compatível e ClamAV;
- GitHub Actions e Render Blueprint.

## Estrutura

```text
apps/server     API, banco, auth, realtime e integrações
apps/web        PWA, portal, painel, TV e console
packages        contratos compartilhados
scripts         build, segurança, backup, dados e operação
docs            arquitetura, negócio, segurança e runbooks
.github          CI, CodeQL, dependências e release
```


## Demonstração no GitHub Pages

O workflow `portfolio-pages` gera um export estático do frontend e publica uma demonstração visual em:

```text
https://drsklgfa.github.io/vibevenue/
```

A publicação usa `NEXT_PUBLIC_PORTFOLIO_MODE=true`: os dados são ilustrativos e as prévias de painel, cliente e modo TV funcionam sem banco, Redis ou API. A aplicação SaaS completa continua preparada para implantação separada com backend.

## Desenvolvimento local

Requisitos: Node `22.16.x`, npm 10, PostgreSQL e Redis.

```bash
cp .env.example .env
npm ci --include=dev --no-audit --no-fund
npm run dev
```

```text
Web:        http://localhost:3000
API:        http://localhost:4000
Liveness:   http://localhost:4000/live
Readiness:  http://localhost:4000/ready
```

A demonstração é exclusiva de desenvolvimento. Nunca use os dados demo em produção.

## Verificação

```bash
npm run check:offline
npm run security:scan-repository
npm run security:test-static
npm run security:test-backup-crypto
npm run build
npm run typecheck
npm run test
npm run lint
npm audit --omit=dev --audit-level=high
npm run verify:artifacts
npm run smoke
```

O workflow `quality` executa o pipeline completo com PostgreSQL e Redis reais.

## Deploy correto

1. proteja o GitHub e deixe `quality` verde;
2. implante staging com `render.staging.example.yaml`;
3. configure PostgreSQL, Redis, S3, ClamAV, e-mail, domínio e alertas;
4. execute homologação, backup/restore e pentest;
5. implante produção com `render.production.example.yaml`;
6. faça rollout piloto.

Guia: [`docs/operations/PRODUCTION_DEPLOYMENT.md`](docs/operations/PRODUCTION_DEPLOYMENT.md).

## Secrets

```bash
npm run security:generate-secrets -- --output .secrets.generated.env
npm run security:verify-environment -- --file .secrets.generated.env --mode secrets-only
```

Cadastre os valores diretamente no secret manager e apague o arquivo. Nunca envie secrets no chat ou Git.

## Documentação essencial

- [Estado final](FINAL_STATUS.md)
- [Segurança](SECURITY.md)
- [Validação](VALIDATION.md)
- [GitHub Pages](docs/GITHUB_PAGES.md)
- [Deploy de produção](docs/operations/PRODUCTION_DEPLOYMENT.md)
- [Ações do proprietário](docs/operations/OWNER_ACTIONS.md)
- [Checklist de go-live](docs/operations/GO_LIVE_OWNER_CHECKLIST.md)
- [Backup e restauração](docs/BACKUP_RESTORE.md)
- [Threat model](docs/security/THREAT_MODEL.md)
- [Riscos residuais](docs/security/RISK_REGISTER.md)
- [Matriz de controles](docs/security/CONTROL_MATRIX.md)
- [Escopo de pentest](docs/security/PENTEST_SCOPE.md)
