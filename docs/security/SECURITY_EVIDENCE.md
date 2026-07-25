# Evidências de segurança

## Evidências locais incluídas no pacote

- manifesto SHA-256 de todos os arquivos;
- checksum do ZIP final;
- saída reproduzível dos validadores offline;
- teste do servidor estático/CSP;
- teste de criptografia de backup;
- verificador comercial de ambiente;
- threat model, riscos, controles e casos de abuso;
- testes unitários e de integração escritos no repositório;
- workflows fixados por SHA.

## Evidências a anexar ao release no GitHub

- URL e conclusão verde do workflow `quality`;
- commit SHA e tag assinada/protegida;
- relatório do `npm audit`;
- SBOM CycloneDX;
- saída de CodeQL e dependency review;
- resultado da suíte cross-tenant;
- checksums do release e atestação quando habilitada;
- relatório de staging security check.

## Evidências operacionais

- captura sem secrets da configuração de ambientes;
- resultado do restore com data, RPO/RTO e responsável;
- teste de alerta e escalonamento;
- inventário de contas e MFA;
- relatório de pentest e reteste;
- aceite de go-live assinado pelo responsável.
