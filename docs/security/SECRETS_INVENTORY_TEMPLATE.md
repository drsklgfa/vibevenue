# Inventário de secrets — modelo sem valores

| ID | Nome | Ambiente | Sistema | Finalidade | Criado em | Rotação | Responsável | Último teste | Status |
|---|---|---|---|---|---|---|---|---|---|
| SEC-DB-001 | DATABASE_URL | produção | Render/PostgreSQL | conexão da API | PREENCHER | 90/180 dias conforme provedor | PREENCHER | PREENCHER | pendente |
| SEC-REDIS-001 | REDIS_URL | produção | Render/Redis | pub-sub/rate limit futuro | PREENCHER | fornecedor | PREENCHER | PREENCHER | pendente |
| SEC-S3-001 | OBJECT_STORAGE_ACCESS_KEY_ID | produção | S3 | acesso ao bucket | PREENCHER | 90 dias | PREENCHER | PREENCHER | pendente |
| SEC-S3-002 | OBJECT_STORAGE_SECRET_ACCESS_KEY | produção | S3 | acesso ao bucket | PREENCHER | 90 dias | PREENCHER | PREENCHER | pendente |
| SEC-AUD-001 | AUDIT_IP_SALT | produção | API | HMAC de origem | PREENCHER | anual/incidente | PREENCHER | PREENCHER | pendente |
| SEC-TOK-001 | TOKEN_HASH_PEPPER | produção | API | HMAC de tokens | PREENCHER | incidente/planejada | PREENCHER | PREENCHER | pendente |

Nunca inclua valores, links privados ou códigos de recuperação neste arquivo.
