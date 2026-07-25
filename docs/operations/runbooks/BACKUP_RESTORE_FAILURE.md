# Falha de backup ou restauração

## Objetivo e gatilho

Restabelecer capacidade de recuperação. SEV-2; SEV-1 se for a última cópia ou houver incidente simultâneo.

## Passos

1. preserve artefato, checksum, metadados, chave e logs;
2. não sobrescreva backups anteriores;
3. diferencie falha de dump, criptografia, transporte, chave ou restore;
4. gere nova cópia quando a origem ainda for íntegra;
5. restaure em destino separado;
6. valide banco e bucket;
7. corrija automação/alerta e repita o exercício;
8. escale se RPO/RTO for violado.

## Verificação/rollback

Round-trip, checksum, GCM, tabelas, login e cross-tenant passam. Nunca desative criptografia permanentemente para contornar a falha.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
