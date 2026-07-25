# Análise final de lacunas

## Implementado nesta árvore

- MFA TOTP, recovery codes, recuperação por e-mail e step-up;
- sessão HttpOnly com expiração absoluta/inativa e revogação;
- isolamento por tenant com teste PostgreSQL/HTTP real no CI;
- rate limiting distribuído Redis;
- upload com magic bytes, ClamAV obrigatório em comercial e reencode;
- CSP com hash de script, PWA segura e no-store;
- secrets, criptografia e rotação;
- backup AES-GCM e restore autenticado;
- read-only/revogação de emergência;
- CI, CodeQL, dependency review, SBOM e release atestável;
- staging/produção IaC e pre-deploy migrations;
- threat model, riscos, controles, runbooks e checklist.

## Sem lacuna de código planejada para esta fase

Não há P0 conhecido e nenhum controle P1 do blueprint foi omitido silenciosamente. Controles incompatíveis ou externos estão classificados abaixo.

## Dependências externas antes de produção

- pipeline completo verde no GitHub;
- infraestrutura privada e persistente;
- ClamAV, S3 e e-mail reais;
- monitoramento, WAF/CDN e alertas;
- restore comprovado;
- jurídico/LGPD;
- pentest independente e reteste.

## Decisões técnicas conscientes

- **RLS:** não ativado nesta arquitetura porque a autorização explícita e os testes cross-tenant são o controle primário. Introduzir RLS exigirá conexão contextual e papel sem bypass; não deve ser feito superficialmente.
- **Passkeys/WebAuthn:** MFA TOTP está implementado e obrigatório. Passkeys são melhoria futura, não bloqueador desta fase.
- **CSP de estilo:** `style-src` ainda permite inline por compatibilidade com o CSS do framework; scripts inline dependem de hash.
- **Gateway de pagamento:** não aplicável até integração com provedor; livro de faturas manual permanece server-side.
- **IA:** não aplicável ao produto atual.
