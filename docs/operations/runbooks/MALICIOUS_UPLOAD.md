# Upload malicioso ou falha de scanner

## Objetivo e gatilho

Impedir publicação/processamento de arquivo suspeito. SEV-2; SEV-1 se liberado e explorado. Responsáveis: segurança e operação.

## Passos

1. desative o módulo de mídia ou mantenha `MEDIA_SCAN_MODE=required`;
2. preserve hash, metadados e resultado do scan sem abrir o arquivo em estação comum;
3. remova/quarentene objetos publicados e revogue URLs;
4. verifique ClamAV, magic bytes, limites e reencode;
5. pesquise downloads/acessos;
6. atualize assinaturas e aplique patch do parser;
7. teste amostras seguras e arquivo inválido antes de reativar.

## Verificação/rollback

Scanner indisponível deve bloquear, arquivo reprovado não possui URL e mídia limpa é reencodada.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
