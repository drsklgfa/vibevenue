# Matriz de autorização

Legenda: L leitura, E escrita operacional, A administração, — negado.

| Recurso | Visitante | Viewer | Marketing | Moderador | Operador | Manager | Owner | Platform admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Snapshot público | L | L | L | L | L | L | L | L |
| Música/atendimento/pedido do QR | E próprio | — | — | — | — | — | — | — |
| Dashboard do tenant | — | L | L parcial | L/E conteúdo | L/E operação | L/E/A | L/E/A | somente tenant interno |
| Equipe | — | — | — | — | — | L/E | L/E/A | — |
| Dados legais da empresa | — | L | L | L | L | L | L/E/A | — |
| Faturas do tenant | — | L | — | — | — | L | L | — |
| Auditoria do tenant | — | — | — | — | — | L | L | — |
| Clientes SaaS | — | — | — | — | — | — | — | L/E/A |
| Cobrança SaaS | — | — | — | — | — | — | — | L/E/A |
| Reset de cliente | — | — | — | — | — | — | — | A |
| Backup/restore/exclusão | — | — | — | — | — | — | — | comando operacional autorizado |

## Regras

- autorização deve ocorrer no servidor, nunca só por aba/botão;
- referência de venue/zone/item deve ser revalidada contra a organização da sessão;
- Platform admin não recebe automaticamente impersonação de cliente;
- suporte futuro deve ser read-only por padrão, just-in-time e auditado;
- ações destrutivas/financeiras futuras exigirão step-up e reason code.
