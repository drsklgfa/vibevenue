# Banco indisponível ou comprometido

## Objetivo e gatilho

Restaurar integridade/disponibilidade sem sobrescrever evidências. SEV-1 se houver alteração/perda; SEV-2 se indisponibilidade. Responsáveis: DevOps, DBA/provedor e segurança.

## Passos

1. ative read-only ou interrompa gravações;
2. preserve snapshot, logs e métricas;
3. determine se é falha operacional, credencial ou corrupção;
4. rotacione credenciais se comprometidas;
5. use failover/rollback quando preserva integridade;
6. restaure primeiro em banco separado;
7. valide checksum, tabelas, tenants e fluxos;
8. faça troca controlada e monitorada.

## Verificação/rollback

`/ready`, migrations, login, cross-tenant, pedidos, cobrança e auditoria precisam passar. Nunca restaure diretamente sobre produção sem cópia atual e aprovação.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
