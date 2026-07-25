# Ações do proprietário

Nada abaixo deve ser enviado nesta conversa com valores reais.

## OWNER-001 — secrets

Execute em computador confiável:

```bash
npm run security:generate-secrets -- --output .secrets.generated.env
npm run security:verify-environment -- --file .secrets.generated.env --mode secrets-only
```

O arquivo contém `AUDIT_IP_SALT`, `TOKEN_HASH_PEPPER`, `APP_ENCRYPTION_KEY` e `BACKUP_ENCRYPTION_KEY`. Cadastre diretamente no secret manager e apague a cópia local. A troca de pepper encerra sessões; a troca da chave de aplicação exige o procedimento de rotação.

## OWNER-002 — contas

Ative MFA/passkey no GitHub, cloud/Render, DNS, storage e e-mail. Use contas individuais, gerenciador de senhas e códigos de recuperação separados.

## OWNER-003 — GitHub

Substitua `@OWNER_GITHUB`, proteja `main`, exija PR/checks/Code Owners, bloqueie force push, crie environments e ative os recursos de segurança disponíveis. Siga `OWNER_ACTIONS_GITHUB_RENDER.md`.

## OWNER-004 — infraestrutura

Crie staging e produção separados com PostgreSQL, Redis, S3, ClamAV, e-mail, domínio e monitoramento. Use os Blueprints example e nunca o `render.yaml` de demonstração para cliente real.

## OWNER-005 — domínio e disclosure

Substitua `example.invalid` no `security.txt`; configure MFA, renovação, transfer lock, DNSSEC/CAA quando disponíveis, SPF/DKIM/DMARC e monitoramento de certificado/domínio.

## OWNER-006 — operação

Defina RPO, RTO, SLO, orçamento, alertas, plantão, janela de migration e retenção. Execute restore, rollback, read-only e incidente simulado.

## OWNER-007 — jurídico

Aprove com profissional: política, termos, contratos, bases legais, retenção, subprocessadores, região, direitos do titular e eventual RIPD/DPIA.

## OWNER-008 — pentest

Contrate revisão independente com todos os papéis e dois tenants, corrija críticos/altos e solicite reteste no mesmo commit/configuração.

## OWNER-009 — administração e treinamento

Crie pelo menos duas contas administrativas individuais e uma conta de emergência rara, monitorada e testada. Separe conta administrativa da conta comum. Revise acessos trimestralmente e remova desligados imediatamente. Treine responsáveis sobre phishing, secrets, LGPD, uploads e incidentes.

## OWNER-010 — fornecedores e custos

Registre região, subprocessadores, retenção, SLA, contato de incidente e saída/migração de cada fornecedor. Configure limites e alertas de custo para compute, banco, Redis, storage, e-mail e tráfego.
