# Rollback seguro

## Gatilhos

Erro crítico, falha de autenticação/tenant, aumento de 5xx, migration incompatível, perda de dados, upload inseguro ou alerta de segurança.

## Procedimento

1. interromper rollout e automações mutáveis;
2. preservar logs, requestIds e versão/commit;
3. bloquear funcionalidade com feature/module flag quando possível;
4. avaliar compatibilidade do schema antes de reverter artefato;
5. restaurar o artefato anterior aprovado;
6. executar `/live`, `/ready`, login, tenant isolation e smoke;
7. reconciliar jobs, cobranças e uploads;
8. comunicar impacto e registrar risco;
9. usar restore apenas quando forward-fix/rollback não preservar dados.

## Proibições

- apagar migration já aplicada sem análise;
- restaurar backup sobre produção sem confirmação e cópia atual;
- perder evidência de incidente;
- reativar deploy automático antes da causa ser entendida.
