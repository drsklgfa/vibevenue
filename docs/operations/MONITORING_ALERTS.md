# Monitoramento e alertas

## Alertas mínimos

- `/live` indisponível;
- `/ready` indisponível ou dependência degradada;
- taxa de HTTP 5xx e latência p95/p99;
- falhas de login/MFA/recuperação acima do padrão;
- alteração de papel, exportação, exclusão ou revogação global;
- falha/timeout do ClamAV e uploads reprovados;
- conexão ou saturação de PostgreSQL/Redis;
- crescimento do bucket, banco e custos;
- faturas vencidas e manutenção falha;
- backup ausente, checksum inválido ou restore falho;
- alteração de DNS/certificado e expiração de domínio.

## Severidade

- SEV-1: vazamento cross-tenant, perda ampla, chave/conta de plataforma comprometida;
- SEV-2: indisponibilidade extensa, upload perigoso, restore falho, abuso ativo;
- SEV-3: degradação limitada, alerta preventivo ou erro sem dado real.

Cada alerta precisa de proprietário, canal primário, escalonamento, prazo e runbook. Teste a entrega antes de clientes reais e trimestralmente depois.
