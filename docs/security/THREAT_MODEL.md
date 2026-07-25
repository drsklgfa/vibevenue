# Modelo de ameaças STRIDE

## Escopo

Web/PWA, API, Socket.IO, PostgreSQL, Redis, storage, console da plataforma, CI/deploy e backup.

| ID | STRIDE | Ativo | Cenário | Impacto | Prob. | Severidade | Controles atuais | Próximo controle | Risco residual |
|---|---|---|---|---|---|---|---|---|---|
| TM-01 | Spoofing | conta admin | senha reutilizada/phishing | controle do tenant | média | alta | scrypt, lockout, cookie, sessões | MFA/passkey e alerta de login | alto |
| TM-02 | Spoofing | plataforma | conta interna comprometida | todos os clientes | baixa/média | crítica | organização interna, sessão curta | MFA, step-up, JIT | alto |
| TM-03 | Tampering | cobrança | alterar preço/status via cliente | perda financeira | baixa | alta | preço e transição no servidor | webhook/ledger/reconciliação | médio |
| TM-04 | Tampering | reservas/pedidos | replay/clique duplo | inconsistência | média | média | deduplicação e transação | idempotency keys formais | baixo/médio |
| TM-05 | Repudiation | ações admin | negar alteração | disputa/incidente | média | alta | auditoria + requestId | alertas e retenção externa | médio |
| TM-06 | Information disclosure | tenants | IDOR/query sem organização | vazamento cross-tenant | média | crítica | filtros de organização | RLS + testes cross-tenant | alto |
| TM-07 | Information disclosure | sessão | token em dispositivo compartilhado | ações indevidas | média | alta | admin HttpOnly; guest em sessionStorage | logout remoto/limpeza reforçada | médio |
| TM-08 | Information disclosure | mídia | objeto pending acessível | privacidade | baixa/média | alta | S3 privado e URL por status | quarentena/scan/download auth | médio |
| TM-09 | Denial of service | API | spam de rotas e uploads | indisponibilidade/custo | alta | alta | limites locais e tamanho | Redis rate limit/cotas/WAF | alto |
| TM-10 | Denial of service | dependência | PostgreSQL/Redis/S3 fora | serviço indisponível | média | alta | readiness e runbooks parciais | alertas, fallback, RTO | alto |
| TM-11 | Elevation | RBAC | operador chama rota de owner | alteração indevida | média | alta | `requireRole`/`requirePlatformAdmin` | matriz testada/ABAC | médio |
| TM-12 | Elevation | CI | action/dependência comprometida | supply-chain | baixa/média | crítica | lockfile e checks | SHA pinning, SAST, SBOM, OIDC | alto |
| TM-13 | Tampering | DNS | domínio redirecionado | roubo de sessão/reputação | baixa | crítica | HTTPS do fornecedor | MFA, DNSSEC, CAA, monitoramento | alto externo |
| TM-14 | Information disclosure | logs | segredo/PII em log | vazamento | média | alta | redaction Pino | scanner e log central | médio |
| TM-15 | Tampering | backup | backup apagado/corrompido | perda definitiva | baixa/média | crítica | checksum/scripts | cópia imutável + restore testado | alto externo |
| TM-16 | Spoofing | visitante | reutilização de token | spam/ações alheias | média | média | TTL e token aleatório | device binding leve/cotas | médio |
| TM-17 | Information disclosure | campos livres | cliente insere dado sensível | risco LGPD | alta | média/alta | limites de tamanho | avisos, minimização e retenção | médio |
| TM-18 | Tampering | migration | auto migration incompatível | indisponibilidade/dados | média | alta | transação e advisory lock | pipeline dedicado/rollback ensaiado | alto |

## Critério

P0: exploração provável com impacto crítico imediato. P1: impacto alto/crítico antes de cliente real. P2: deve ser fechado antes de escala. P3: melhoria contínua.
