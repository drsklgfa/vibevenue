# Registro de riscos residuais

Escala: P0 crítico, P1 alto, P2 médio, P3 baixo. “Mitigado” não significa eliminado.

| ID | Risco | Nível | Controle atual | Situação/ação externa |
|---|---|---:|---|---|
| R-001 | Comprometimento de conta privilegiada | P1 | MFA TOTP, step-up, bloqueio, sessão curta, revogação, avisos | Exigir MFA também em GitHub/cloud/DNS/e-mail e testar recuperação |
| R-002 | Vazamento cross-tenant por regressão | P1 | autorização server-side, namespace e suíte real PostgreSQL/HTTP | CI precisa ficar verde; pentest com dois tenants |
| R-003 | Malware ou parser DoS em upload | P1 | magic bytes, limites, ClamAV required e reencode | Disponibilizar ClamAV privado, alertar falha e testar amostras seguras |
| R-004 | Supply-chain comprometida | P1 | lockfile, SHA em Actions, audit, CodeQL, dependency review, SBOM | Ativar recursos do GitHub e revisar alertas/atestações |
| R-005 | Perda/corrupção de dados | P1 | backup AES-GCM, checksum, scripts e runbook | Backup externo e restore real mensal |
| R-006 | Chave de aplicação perdida/rotacionada incorretamente | P1 | chave anterior temporária e CLI transacional | Guardar cópias no secret manager e executar rotação ensaiada |
| R-007 | Abuso/DoS/custo excessivo | P2 | rate limit Redis, limites de plano/upload e idempotência | WAF/CDN, limites de custo e alertas no provedor |
| R-008 | Falha de configuração de produção | P1 | fail-fast commercial e verificador de ambiente | Revisão por duas pessoas e staging antes de produção |
| R-009 | Indisponibilidade de fornecedor | P2 | readiness, logs, fallback controlado e runbooks | SLO, alertas, contrato e estratégia por fornecedor |
| R-010 | CSS inline permitido pela CSP | P2 | script-src sem unsafe-inline, hashes e headers | Remover após validar estratégia de CSS/nonce do framework |
| R-011 | Dados temporários no dispositivo compartilhado | P2 | sessionStorage, logout e no-store | Instruir logout/fechar navegador e evitar dispositivos compartilhados |
| R-012 | Dados remanescentes em backups após exclusão LGPD | P2 | retenção documentada e acesso restrito | Definir prazo jurídico, expiração e procedimento de restauração |
| R-013 | Falha não detectada por falta de monitoramento | P1 | logs, health, eventos e protocolos | Configurar alertas reais, contatos e testes de entrega |
| R-014 | Vulnerabilidade desconhecida | P1 | DevSecOps, threat model e disclosure | Pentest independente, patching e revisão contínua |
| R-015 | Erro humano em ação crítica | P2 | step-up, confirmação, auditoria, menor privilégio | Separação de funções e aprovação humana de produção |

Nenhum risco P0 conhecido permanece aberto nesta revisão. O go-live não é permitido se surgir P0/P1 sem mitigação, responsável e decisão formal.
