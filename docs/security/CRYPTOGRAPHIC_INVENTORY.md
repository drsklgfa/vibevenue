# Inventário criptográfico

| Uso | Controle | Rotação |
|---|---|---|
| Senhas | scrypt v1, parâmetros fixos, salt aleatório e compare constante | rehash transparente/versionamento |
| Tokens | aleatórios fortes + HMAC-SHA-256 no banco | trocar pepper revoga tokens |
| IP pseudonimizado | HMAC-SHA-256 com salt separado | perde correlação histórica |
| Segredos MFA | AES-256-GCM com AAD contextual | chave atual/anterior + CLI transacional |
| Backup | AES-256-GCM, IV aleatório, AAD e tag | manter chave por toda retenção |
| Integridade | SHA-256 de ZIP, release e backup | por artefato |
| Trânsito | TLS/HTTPS do provedor | certificados e configuração externa |
| Repouso de DB/S3 | criptografia do fornecedor | política do provedor |

## Regras

- chaves distintas por dev/CI/staging/produção;
- `AUDIT_IP_SALT`, `TOKEN_HASH_PEPPER`, `APP_ENCRYPTION_KEY` e `BACKUP_ENCRYPTION_KEY` nunca são reutilizados entre finalidades;
- valores ficam em secret manager, não no Git;
- a chave anterior da aplicação é temporária;
- backups antigos dependem da chave correspondente;
- toda rotação produz evidência sem registrar o valor.
