# Vazamento cross-tenant

## Objetivo e gatilho

Conter leitura, alteração, exclusão, download ou exportação entre organizações. Sempre SEV-1. Responsáveis: segurança, engenharia, jurídico/privacidade e direção.

## Passos

1. ative `READ_ONLY_MODE=true` ou retire a rota/módulo afetado;
2. preserve request IDs, IDs de recurso, organizações, logs e release;
3. determine janela, dados e tenants afetados sem expandir acesso;
4. corrija consulta/autorização e crie teste negativo reproduzível;
5. rode toda a suíte cross-tenant em staging;
6. revogue sessões/tokens quando houver risco de reutilização;
7. avalie comunicação legal e aos clientes;
8. publique apenas após revisão e reteste.

## Verificação/rollback

Tenant A recebe 404/403 apropriado para todos os IDs de B; exportações/mídia também ficam isoladas; `quality` e pentest passam. Não apague logs para ocultar o evento.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
