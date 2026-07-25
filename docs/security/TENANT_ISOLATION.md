# Isolamento multiempresa

## Controles

- sessão administrativa contém `organization_id` validado;
- rotas administrativas usam a organização da sessão, não a enviada pelo cliente;
- recursos de unidade/área/fatura/auditoria/mídia são carregados com tenant;
- plataforma interna possui organização e flag exclusivas;
- rate limit, auditoria, notificações, storage e jobs usam namespace;
- referências cruzadas são recusadas dentro de transações;
- exportação/exclusão exigem organização explícita e confirmação.

## Suíte automatizada

`tenant-isolation.integration.test.ts` usa PostgreSQL real no CI, cria dois tenants e verifica:

- leitura e escrita direta cruzada;
- IDOR/BOLA por HTTP;
- sessão cliente contra console da plataforma;
- isolamento de unidade, zona e fila de música;
- migrations e tokens verificados.

Qualquer regressão falha o workflow `quality`.

## RLS

RLS não está ativado no momento. O controle primário é autorização de aplicação + testes reais. RLS só deve ser adicionado com:

1. contexto de tenant por transação;
2. papel operacional sem `BYPASSRLS`/propriedade das tabelas;
3. política deny-by-default;
4. compatibilidade com jobs, plataforma e migrations;
5. suíte de regressão equivalente.

Uma implementação parcial de RLS pode criar falsa sensação de segurança e não substitui RBAC/IDOR checks.
