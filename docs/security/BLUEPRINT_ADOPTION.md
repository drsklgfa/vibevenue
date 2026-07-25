# Adoção do AI Secure Project Blueprint

O blueprint foi adotado como baseline obrigatória, não como selo de invulnerabilidade.

| Fase | Estado da implementação | Evidência |
|---|---|---|
| Inventário, dados, ameaças e riscos | Concluída | `docs/security/` e `docs/privacy/` |
| Identidade, sessão e autorização | Concluída | MFA, recovery, step-up, RBAC, testes |
| Dados, uploads e privacidade | Concluída no código | scan/reencode, consentimento, retenção, DSR |
| DevSecOps e supply chain | Concluída na configuração | workflows, SHA, CodeQL, SBOM, audit, release |
| Infraestrutura e observabilidade | Modelada e documentada | Blueprints, health, logs, alertas/runbooks |
| Homologação | Exige execução externa | CI verde, staging, restore, pentest e go-live |

## Estados usados

- **Implementado:** código/configuração existe.
- **Validado localmente:** passou sem serviços externos.
- **Configurado para CI:** precisa evidência do runner.
- **Ação do proprietário:** depende de contas/contratação/decisão.
- **Não aplicável:** fora do produto atual.

A decisão final precisa usar o commit e a configuração efetivamente testados.
