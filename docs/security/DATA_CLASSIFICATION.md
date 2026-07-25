# Classificação de dados

| Categoria | Classe | Exemplos | Acesso | Retenção técnica inicial |
|---|---|---|---|---|
| Conteúdo público do local | Pública | nome, cidade, descrição, comunicados aprovados | internet | enquanto publicado |
| Configuração empresarial | Confidencial | plano, mensalidade, módulos, limites | cliente autorizado/plataforma | contrato + prazo definido |
| Identidade administrativa | Dado pessoal/confidencial | nome, e-mail, papel, dispositivos | próprio usuário/gestores necessários | conta + retenção de auditoria |
| Credenciais | Segredo operacional | hash de senha, token hash, pepper | serviço mínimo | sessão/conta; segredo por rotação |
| Sessão visitante | Dado pessoal interno | apelido, área, aceite e token hash | tenant correspondente | 12h + retenção de expirados configurada |
| Fidelidade e campanha | Dado pessoal | e-mail/telefone normalizado, pontos, resgates | tenant correspondente | definir por contrato/LGPD |
| Reservas | Dado pessoal | contato, quantidade, evento | tenant correspondente | definir por finalidade |
| Feedback e atendimento | Dado pessoal potencial | comentário, nome, mesa | tenant correspondente | definir por política |
| Mídia enviada | Conteúdo de usuário/dado pessoal potencial | imagem, legenda | moderação e público após aprovação | política específica |
| Cobrança | Confidencial/financeiro | faturas, preço, pagamento manual | plataforma e perfis autorizados | fiscal/contratual a validar |
| Auditoria | Confidencial | ação, usuário, requestId, HMAC de origem | owner/manager/suporte autorizado | `AUDIT_RETENTION_DAYS` |
| Backup/export | Restrita | cópia ampla do banco/tenant | operadores autorizados | agenda e descarte definidos |
| Logs | Interna/confidencial | erros, saúde e correlação | operação | prazo mínimo necessário |

## Regras

- O VibeVenue não deve coletar dados pessoais sensíveis por padrão.
- Campos livres podem receber conteúdo sensível indevidamente; termos, interface e retenção devem reduzir esse risco.
- Dados de pagamento completos não são armazenados; uma futura integração deve minimizar PCI.
- Produção não pode ser copiada para desenvolvimento sem anonimização aprovada.
