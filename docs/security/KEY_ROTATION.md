# Rotação de chaves e peppers

## APP_ENCRYPTION_KEY

1. gere uma nova chave de 32 bytes base64url;
2. mantenha a atual como `APP_ENCRYPTION_KEY_PREVIOUS`;
3. cadastre a nova em `APP_ENCRYPTION_KEY`;
4. publique o backend em janela controlada;
5. execute `npm run security:rotate-encryption-key` no artefato compilado;
6. confirme que todos os registros foram recriptografados;
7. remova `APP_ENCRYPTION_KEY_PREVIOUS` e publique novamente;
8. guarde evidência e destrua cópias temporárias.

Nunca remova a chave anterior antes de recriptografar os registros MFA.

## TOKEN_HASH_PEPPER

A troca invalida tokens e sessões persistidos. Faça em incidente ou janela planejada, avise usuários, altere o secret e execute revogação global.

## AUDIT_IP_SALT

A troca interrompe correlação histórica de origem, mas não invalida contas. Registre a data e a justificativa.

## BACKUP_ENCRYPTION_KEY

Backups antigos dependem da chave usada na criação. Guarde a chave pelo mesmo prazo de retenção do backup ou recripte os arquivos em processo auditado. Nunca sobrescreva uma chave sem inventariar as cópias dependentes.
