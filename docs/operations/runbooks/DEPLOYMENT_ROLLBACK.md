# Rollback de deploy ou migration

## Objetivo e gatilho

Retornar a versão estável quando houver 5xx, falha de auth/tenant, corrupção ou migration incompatível. Responsáveis: release manager e DevOps.

## Passos

1. interrompa rollout e gravações quando necessário;
2. preserve release, logs, request IDs e schema;
3. avalie se artefato anterior é compatível com o schema atual;
4. prefira forward-fix para migrations não reversíveis;
5. restaure artefato anterior aprovado;
6. execute live/ready, login, MFA, cross-tenant e smoke;
7. reconcilie jobs, billing, mídia e eventos;
8. só reative deploy automático após causa conhecida.

## Verificação/rollback

Se rollback de aplicação não preservar dados, mantenha read-only e use restore apenas após aprovação e cópia atual.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
