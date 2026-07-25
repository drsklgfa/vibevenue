# Validação desta entrega

## Aprovações executadas localmente

- `npm run validate:lockfile`;
- `npm run validate:source`;
- `npm run validate:semantic-offline`;
- `npm run validate:render`;
- `npm run security:scan-repository`;
- `npm run security:test-static`;
- `npm run security:test-backup-crypto`;
- `node --check scripts/*.mjs`;
- geração de secrets em diretório temporário com permissão `0600`;
- verificação `secrets-only` e `commercial` com valores sintéticos;
- parsing JSON/YAML;
- manifesto SHA-256;
- teste de corrupção e extração limpa do ZIP final.

## Pipeline configurado, mas não executado neste ambiente

- `npm ci --include=dev --no-audit --no-fund`;
- `npm run build`;
- `npm run typecheck`;
- `npm run test`;
- `npm run lint`;
- `npm audit --omit=dev --audit-level=high`;
- `npm run verify:artifacts`;
- `npm run smoke`;
- suíte cross-tenant em PostgreSQL real;
- integração Redis e migrações reais.

Motivo: falhas repetidas `HTTP 503 Service Temporarily Unavailable` do gateway de pacotes. O workflow `.github/workflows/ci.yml` executa essas verificações no commit exato.

## Homologação externa obrigatória

- ClamAV, S3, Resend, PostgreSQL e Redis reais;
- backup/restauração em destino separado;
- teste de alertas e contenção;
- pentest independente e reteste;
- aprovação jurídica e operacional.
