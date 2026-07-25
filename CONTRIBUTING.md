# Contribuindo com o VibeVenue

Toda alteração deve preservar isolamento multiempresa, autorização no servidor e rastreabilidade. Não faça push direto em `main`.

## Fluxo obrigatório

1. Crie branch curta a partir da versão aprovada.
2. Descreva requisito, risco, migration e rollback.
3. Atualize testes, threat model e matriz de controles quando aplicável.
4. Execute `npm ci` e `npm run check` em ambiente com acesso ao registro.
5. Abra Pull Request usando o modelo do repositório.
6. Exija revisão humana diferente do autor para autenticação, autorização, cobrança, exclusão, exportação, uploads, migrations e infraestrutura.
7. Não faça deploy em produção sem aprovação do environment.

## Proibições

- secrets, dumps, exports reais ou `.env` no Git;
- bypass de testes, autenticação ou tenant;
- SQL concatenado com entrada externa;
- token administrativo em armazenamento web;
- dependência com versão `latest`;
- `@ts-ignore`, `eval` ou `dangerouslySetInnerHTML` sem exceção aprovada;
- redução silenciosa de logs, auditoria ou validação.

## Evidência mínima

A Pull Request deve indicar arquivos, testes positivos e negativos, risco residual, OWNER_ACTIONS e plano de rollback. Segurança crítica exige reteste independente antes do go-live.
