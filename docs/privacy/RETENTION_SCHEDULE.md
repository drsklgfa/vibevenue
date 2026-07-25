# Agenda de retenção — pendente de validação jurídica

| Dado | Padrão técnico atual | Decisão necessária |
|---|---|---|
| sessão admin | absoluto/inatividade configuráveis | política de acesso |
| sessão visitante | 12h; expirados limpos após `EXPIRED_GUEST_RETENTION_DAYS` | confirmar necessidade |
| auditoria | `AUDIT_RETENTION_DAYS` (730 padrão) | contrato/segurança |
| pedidos/atendimento/reservas | sem expiração automática | definir por finalidade |
| fidelidade/campanha | sem expiração automática | consentimento/base/contrato |
| mídia | até rejeição/exclusão/encerramento | definir prazo e denúncia |
| faturas | sem expiração automática | obrigação fiscal/contratual |
| logs externos | fornecedor | definir prazo mínimo |
| backups | script local; política externa pendente | retenção, imutabilidade e exclusão |
| exports | manual | apagar após entrega/prazo curto |

Nenhum prazo deste modelo substitui validação jurídica.
