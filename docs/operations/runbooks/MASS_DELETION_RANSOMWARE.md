# Exclusão em massa ou ransomware

## Objetivo e gatilho

Impedir propagação e recuperar dados confiáveis. SEV-1. Responsáveis: direção, segurança, DevOps, jurídico e fornecedores.

## Passos

1. isole contas, automações e endpoints de escrita;
2. revogue sessões e chaves suspeitas;
3. proteja backups/versões do bucket contra a mesma identidade;
4. preserve snapshots e logs;
5. identifique último ponto íntegro;
6. reconstrua ambiente limpo e restaure banco/bucket compatíveis;
7. verifique malware, secrets e IAM antes de reabrir;
8. comunique conforme obrigação legal/contratual.

## Verificação/rollback

Compare contagens e checksums, teste tenants, mídia e auditoria. Não pague/responda sem direção e autoridades competentes; não reconecte máquina comprometida.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
