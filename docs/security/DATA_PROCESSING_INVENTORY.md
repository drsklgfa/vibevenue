# Inventário de tratamento de dados

| Processo | Finalidade | Entrada | Armazenamento | Saída/fornecedor | Exclusão |
|---|---|---|---|---|---|
| Login administrativo | controle de acesso | e-mail, senha, dispositivo | usuário e sessão em PostgreSQL | cookie HttpOnly | logout, revogação ou expiração |
| Entrada por QR | experiência temporária | apelido, área e aceites | guest session | portal/Socket.IO | expiração e manutenção |
| Pedido/atendimento | operação do local | itens, observação, mesa | PostgreSQL | painel do tenant | política do cliente |
| Reserva | reservar capacidade | contato e grupo | PostgreSQL | painel do tenant | política do cliente |
| Fidelidade/cupom | benefício recorrente | e-mail/telefone | PostgreSQL | painel do tenant | solicitação/política |
| Mídia | mural moderado | imagem e legenda | S3 + metadados | URL temporária/aprovada | rejeição, solicitação ou política |
| Cobrança SaaS | administração comercial | fatura e confirmação manual | PostgreSQL | console da plataforma | obrigação contratual/fiscal |
| Auditoria | segurança e suporte | ações administrativas | PostgreSQL | painel/incident response | retenção configurada |
| Backup | continuidade | banco completo | storage externo obrigatório | restore autorizado | retenção/imutabilidade |
| Exportação LGPD | portabilidade/encerramento | dados do tenant | arquivo local controlado | proprietário autorizado | apagar após entrega/prazo |

Base legal, prazos definitivos, regiões e subprocessadores dependem de validação jurídica e estão em `docs/operations/OWNER_ACTIONS.md`.
