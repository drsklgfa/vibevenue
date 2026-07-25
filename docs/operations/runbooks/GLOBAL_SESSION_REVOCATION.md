# Revogação global de sessões

## Objetivo e gatilho

Forçar nova autenticação/MFA após incidente, pepper trocado ou suspeita ampla. SEV conforme incidente. Responsável: plataforma/segurança.

## Comando

```bash
npm run security:emergency -- revoke-all --execute --confirm REVOGAR-TODAS-AS-SESSOES
```

O comando remove sessões administrativas/visitantes, desafios MFA e tokens de reset. Execute com `DATABASE_URL` do ambiente correto, em terminal protegido e com aprovação.

## Verificação/rollback

Cookies/tokens antigos recebem 401 e login novo exige MFA. Não há rollback de sessão; o usuário autentica novamente.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
