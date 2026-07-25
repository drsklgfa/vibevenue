# Checklist de segurança para go-live

## Bloqueadores técnicos

- [ ] workflow `quality` verde no commit exato;
- [ ] CodeQL/dependency review/audit sem crítico/alto não aceito;
- [ ] staging isolado e teste cross-tenant aprovado;
- [ ] MFA e step-up exercitados;
- [ ] ClamAV/S3/Redis/PostgreSQL/e-mail reais aprovados;
- [ ] ambiente commercial aprovado pelo verificador;
- [ ] backup criptografado e restore comprovado;
- [ ] alertas e modo de emergência testados;
- [ ] P0/P1 sem mitigação inexistentes.

## Contas e infraestrutura

- [ ] MFA em GitHub/cloud/DNS/e-mail/storage;
- [ ] secrets distintos e guardados;
- [ ] serviços privados, persistentes e TLS;
- [ ] produção com aprovação humana;
- [ ] WAF/CDN/limites de custo avaliados;
- [ ] `security.txt` real.

## Independente/jurídico

- [ ] pentest e reteste;
- [ ] política/termos/contratos/retenção/fornecedores aprovados;
- [ ] riscos residuais aceitos;
- [ ] piloto e rollback autorizados.

O checklist operacional detalhado está em `docs/operations/GO_LIVE_OWNER_CHECKLIST.md`.
