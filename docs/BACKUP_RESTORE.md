# Backup e restauração

O dump do PostgreSQL é criptografado com AES-256-GCM antes de ser publicado. Checksum e metadados são calculados sobre o artefato criptografado. Redis não é fonte permanente e os bytes do S3 precisam de política própria de recuperação.

## Pré-requisitos

- `pg_dump`, `pg_restore` e `psql` compatíveis com o servidor;
- `DATABASE_URL` protegida;
- `BACKUP_ENCRYPTION_KEY` com 32 bytes base64url;
- `BACKUP_REQUIRE_ENCRYPTION=true` em produção.

## Criar

```bash
npm run backup:create -- --output backups/vibevenue-producao.dump.enc
```

A rotina cria dump customizado temporário, valida tamanho, criptografa em streaming, apaga o plaintext, restringe permissões e gera:

```text
vibevenue-producao.dump.enc
vibevenue-producao.dump.enc.sha256
vibevenue-producao.dump.enc.json
```

## Restaurar

Use banco vazio e diferente da produção:

```bash
npm run backup:restore -- \
  --file backups/vibevenue-producao.dump.enc \
  --target-url "$RESTORE_DATABASE_URL" \
  --confirm RESTORE
```

A rotina verifica checksum, formato, autenticação GCM, conteúdo do dump, restaura e valida tabelas. O plaintext temporário é removido. Backup legado sem criptografia é recusado por padrão e exige `--allow-plaintext true` com justificativa.

## Chaves

Não perca a chave de backups ainda retidos. Guarde-a em secret manager separado, com acesso mínimo e cópia de recuperação. Consulte `docs/security/KEY_ROTATION.md`.

## S3

Ative bloqueio público, criptografia, versionamento, ciclo de vida e recuperação independente. Banco e bucket precisam ser restaurados para pontos compatíveis.

## Frequência sugerida

- backup automático diário do provedor;
- cópia criptografada adicional antes de mudança crítica;
- retenção diária/semanal/mensal conforme contrato;
- restore mensal e obrigatório antes do primeiro cliente;
- evidência com data, responsável, RPO, RTO e resultado.

Use `docs/operations/BACKUP_RESTORE_EXERCISE.md` para o ensaio completo.
