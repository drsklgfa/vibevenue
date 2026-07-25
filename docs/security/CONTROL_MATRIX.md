# Matriz de controles

| Domínio | Controle | Estado | Evidência principal | Dependência externa |
|---|---|---|---|---|
| Identidade | scrypt versionado/rehash | Implementado | `security.ts`, testes | não |
| Identidade | MFA TOTP e recovery codes | Implementado | `mfa.ts`, UI, testes | aplicativo autenticador |
| Identidade | recuperação de conta | Implementado | `account-recovery.ts`, Resend | domínio/e-mail |
| Identidade | step-up para ações críticas | Implementado | middleware/rotas/UI | não |
| Sessão | HttpOnly, idle/absolute, revogação | Implementado | `auth.ts`, cookies, testes | HTTPS |
| Autorização | RBAC e tenant server-side | Implementado | rotas/comercial/plataforma | não |
| Tenant | testes cruzados PostgreSQL/HTTP | Implementado no CI | `tenant-isolation.integration.test.ts` | workflow verde |
| Banco | migrations em pre-deploy com lock | Implementado | `migrate-cli.ts`, Blueprints | plano compatível |
| Dados | HMAC de tokens/IP | Implementado | config/security/observability | secrets |
| Dados | AES-GCM para MFA e backups | Implementado | encryption/backup crypto | secret manager |
| Upload | magic bytes, limites, ClamAV, reencode | Implementado | `media-security.ts` | ClamAV/S3 |
| Web | CORS/origem/CSRF/no-store | Implementado | `http.ts` | domínio HTTPS |
| Web | CSP script com hashes | Implementado | `serve-static.mjs`, teste | origem API correta |
| PWA | sem cache de API/uploads | Implementado | `sw.js`, validator | não |
| Abuso | rate limit distribuído | Implementado | Redis Lua limiter | Redis privado |
| Integridade | idempotência/travas | Implementado | rotas/migrações | PostgreSQL |
| Logs | redaction/request ID | Implementado | logger/observability | central de logs recomendada |
| Auditoria | ações/eventos de segurança | Implementado | tabelas, painel, e-mail | monitoramento |
| Privacidade | consentimento versionado | Implementado | organização/guest/UI | textos jurídicos |
| Privacidade | exportação/exclusão/retenção | Implementado | scripts/maintenance | política aprovada |
| Continuidade | backup criptografado/checksum | Implementado | scripts/teste local | pg_dump e storage externo |
| Continuidade | restore autenticado | Implementado | restore/runbook | exercício real |
| Incidente | read-only/revogação/runbooks | Implementado | config/scripts/docs | responsáveis/alertas |
| CI | build/type/test/lint/audit/smoke | Configurado | `ci.yml` | GitHub runner/registry |
| Supply chain | SHA, CodeQL, review, SBOM | Configurado | workflows/scripts | recursos da conta |
| Release | checksum/proveniência | Configurado | `release.yml` | environment e attestation |
| Infra | staging/produção separados | Modelado | Blueprints example | criação/configuração |
| Monitoramento | alertas externos | Requer configuração | health/logs/events | provedor escolhido |
| WAF/DDoS | proteção de borda | Requer configuração | checklist | CDN/WAF |
| Pentest | revisão independente | Requer execução | escopo pronto | fornecedor independente |
| Jurídico | LGPD/termos/contratos | Requer aprovação | inventários e fluxos | profissional competente |
| IA | controles de LLM/agentes | Não aplicável | produto não usa IA | reavaliar se adicionar |
