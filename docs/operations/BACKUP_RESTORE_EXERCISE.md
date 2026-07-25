# Exercício de backup e restauração

Registre data, responsável, commit, ambiente, origem, destino, RPO e RTO.

1. gere backup criptografado em staging;
2. confirme `.sha256` e `.json`;
3. copie o artefato para armazenamento separado;
4. crie PostgreSQL vazio sem acesso de produção;
5. restaure com `--confirm RESTORE`;
6. valide tabelas, contagens, login, tenants, pedidos, reservas, faturas e auditoria;
7. recupere uma cópia compatível do bucket e valide mídias;
8. execute smoke e suíte cross-tenant;
9. meça duração, divergência e falhas;
10. elimine com segurança o banco temporário;
11. registre evidências e correções.

Backup não testado é apenas uma esperança, não uma capacidade de recuperação.
