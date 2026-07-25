# Alteração indevida de DNS ou domínio

## Objetivo e gatilho

Recuperar domínio/certificado e impedir phishing. SEV-1 quando tráfego/e-mail foi desviado. Responsáveis: proprietário do registrador/DNS, segurança e comunicação.

## Passos

1. bloqueie/recupere conta do registrador e ative MFA;
2. restaure registros conhecidos e transfer lock;
3. revogue certificados/chaves afetados;
4. verifique CAA, DNSSEC, SPF, DKIM e DMARC;
5. suspenda links de recuperação/e-mail se houver desvio;
6. monitore transparência de certificados e propagação;
7. comunique usuários se houve phishing/interceptação.

## Verificação/rollback

DNS autoritativo, HTTPS, e-mail e redirects apontam para destinos aprovados; conta antiga não acessa.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
