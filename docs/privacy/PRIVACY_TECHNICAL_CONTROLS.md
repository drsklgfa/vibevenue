# Controles técnicos de privacidade

- consentimento e versões legais por organização;
- reaceite quando versão muda;
- sessão temporária do visitante;
- token somente como hash no banco;
- PII temporária em `sessionStorage`, não `localStorage`;
- HMAC de origem, sem IP puro na auditoria;
- exportação sem senha/token e exclusão confirmada;
- retenção configurável de sessão/auditoria;
- S3 privado e links temporários;
- segregação por organização;
- logs com redaction.

Pendências: DSR operacional completo, prazo por tabela, exclusão de objetos/backups comprovada, minimização de campos livres, fornecedores/regiões e DPIA quando aplicável.
