# Conta administrativa comprometida

## Objetivo e gatilho

Conter login suspeito, dispositivo perdido, phishing ou alteração não reconhecida. SEV-1 para plataforma; SEV-2 para um tenant. Responsáveis: proprietário da conta e segurança.

## Passos

1. bloqueie o usuário e revogue sessões;
2. altere senha e MFA em dispositivo limpo;
3. revogue códigos de recuperação e links pendentes;
4. revise papéis, clientes, exportações, faturas, secrets e auditoria;
5. preserve eventos e notifique o titular/tenants afetados;
6. remova persistência ou integração criada pelo invasor;
7. reative somente após verificação independente.

```bash
npm run security:emergency -- lock-user --email usuario@dominio.com --execute --confirm BLOQUEAR-usuario@dominio.com
```

## Verificação/rollback

Conta antiga não autentica; sessões somem; novo MFA funciona; nenhuma permissão indevida permanece. Reativação é ação humana auditada.

## Evidências e encerramento

Preserve horários, commit/release, request IDs, logs, IDs pseudonimizados, decisões, responsáveis e resultados. Depois da contenção, crie teste de regressão, atualize threat model/registro de riscos e realize pós-incidente com prazo e proprietário.
