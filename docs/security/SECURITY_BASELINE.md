# Baseline de segurança do VibeVenue

## Objetivo

Esta baseline transforma o AI Secure Project Blueprint em requisito rastreável do VibeVenue. Ela não representa certificação nem garantia de invulnerabilidade. O produto só pode receber dados reais depois dos portões de go-live e da validação independente.

## Princípios obrigatórios

- deny-by-default e fail-secure;
- servidor como autoridade de autenticação, autorização, preço, status e tenant;
- menor privilégio e separação entre plataforma e clientes;
- dados mínimos, retenção definida e exclusão controlada;
- secrets fora do código e diferentes por ambiente;
- evidência reproduzível para cada controle;
- backup antes de alteração destrutiva;
- revisão humana para mudanças críticas;
- nenhum P0/P1 aberto no go-live.

## Estado do Checkpoint 07

Implementado neste checkpoint:

- inventário técnico, dados, fluxos e fronteiras;
- threat model STRIDE, casos de abuso, análise de lacunas e registro de riscos;
- matriz inicial de controles e autorização;
- hash de senha versionado com migração transparente;
- pepper HMAC obrigatório para tokens no modo comercial;
- expiração absoluta e por inatividade para sessões;
- sessão da plataforma com duração menor;
- token e identificador de fidelidade do visitante movidos para `sessionStorage`;
- remoção do script inline criado pelo projeto para registrar o service worker;
- gerador local de secrets e verificador de ambiente;
- documentos de proprietário, rollback, incidentes, pentest e go-live.

Controles ainda prioritários:

- MFA/passkey e step-up para administração;
- RLS/contexto obrigatório de tenant e suíte cross-tenant executada;
- quarentena e antivírus para uploads;
- rate limit distribuído;
- staging isolado, DevSecOps, SBOM e Actions fixadas por SHA;
- monitoramento/alertas e restore real;
- CSP sem `unsafe-inline` após validação do build Next;
- pentest independente.

## Status permitidos

`IMPLEMENTADO`, `IMPLEMENTADO_PARCIALMENTE`, `EXIGE_CONFIGURACAO_EXTERNA`, `BLOQUEADO_POR_DEPENDENCIA`, `NAO_APLICAVEL` e `RISCO_ACEITO_TEMPORARIAMENTE`.
