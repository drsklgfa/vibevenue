# Segredo exposto

## Objetivo e gatilho

Conter qualquer credential, token, chave, URL de banco ou arquivo `.env` exposto. Severidade SEV-1 quando produção ou dados reais estiverem envolvidos. Responsáveis: segurança/DevOps e proprietário da conta.

## Passos

1. não apague a evidência antes de registrar local, horário e alcance;
2. restrinja o repositório/log/canal e suspenda deploys;
3. revogue/rotacione o segredo na origem, não apenas no código;
4. para `TOKEN_HASH_PEPPER`, revogue sessões; para `APP_ENCRYPTION_KEY`, use chave anterior e recriptografia;
5. pesquise uso e acesso durante a janela;
6. remova o valor do histórico quando necessário, sabendo que rotação continua obrigatória;
7. execute secret scan, CI e smoke;
8. comunique afetados conforme risco/legal.

```bash
npm run security:scan-repository
npm run security:emergency -- revoke-all --execute --confirm REVOGAR-TODAS-AS-SESSOES
```

## Verificação/rollback

Teste credencial antiga (deve falhar), nova credencial, login/MFA, dependências e alertas. Não restaure o segredo antigo para “resolver” a indisponibilidade.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
