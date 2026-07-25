# Segurança do VibeVenue

## Compromisso

O VibeVenue aplica defesa em profundidade, menor privilégio, segregação por tenant, fail-safe defaults, rastreabilidade e recuperação. Nenhuma versão é descrita como invulnerável. Riscos residuais e controles externos ficam documentados.

## Identidade e acesso

- senhas em `scrypt` versionado, parâmetros fixos e rehash automático de formato legado;
- cookie administrativo `HttpOnly`, `Secure` e `SameSite` configurável;
- sessão absoluta e por inatividade, com prazo menor para o console da plataforma;
- bloqueio progressivo de login, resposta genérica de recuperação e revogação de sessões;
- MFA TOTP obrigatório para `owner` e administradores da plataforma em modo comercial;
- códigos de recuperação armazenados como hash e uso único;
- step-up com senha e MFA para ações sensíveis;
- recuperação por link curto, token HMAC de uso único e aviso após redefinição;
- eventos de novo acesso, senha e recuperação enviados pelo provedor de e-mail configurado.

## Criptografia e secrets

- tokens persistidos como HMAC-SHA-256 com `TOKEN_HASH_PEPPER` separado por ambiente;
- segredos MFA criptografados com AES-256-GCM e AAD contextual;
- rotação com `APP_ENCRYPTION_KEY_PREVIOUS` apenas durante janela controlada;
- backups criptografados com AES-256-GCM e autenticados antes da restauração;
- gerador local de `AUDIT_IP_SALT`, peppers e chaves sem imprimir os valores;
- modo comercial recusa secrets ausentes, fracos ou configurações inseguras.

## Multiempresa e autorização

- toda operação administrativa recebe a organização da sessão validada pelo servidor;
- papéis e permissões são verificados por rota e ação;
- organização interna da plataforma é isolada dos clientes e das rotinas comerciais;
- consultas críticas carregam `organization_id`/`venue_id` e recusam referências cruzadas;
- suíte de integração cria dois tenants em PostgreSQL real e testa leitura/escrita cruzada e IDOR HTTP;
- plataforma, cache, jobs, rate limit, mídia, auditoria e notificações usam namespace de tenant.

RLS PostgreSQL não foi ativado porque o pool e as rotas atuais usam autorização explícita transacional; a suíte cross-tenant é o controle obrigatório. RLS pode ser introduzido futuramente com conexão contextual e testes de regressão, sem ser tratado como substituto da autorização de aplicação.

## Uploads e mídia

- limite de bytes, dimensões, pixels e páginas/metadados;
- magic bytes para tipos permitidos;
- scanner ClamAV por rede privada;
- modo comercial exige scan `required`;
- imagem limpa é decodificada e reencodada em WebP antes do armazenamento;
- arquivo reprovado ou não escaneado não é publicado no S3;
- bucket privado e URLs assinadas temporárias;
- status e detalhes do scan ficam registrados.

## Navegador e PWA

- API, uploads e painel não entram no cache do service worker;
- token do visitante limitado a `sessionStorage`;
- CSP com hashes de scripts e `frame-ancestors 'none'`;
- `connect-src` limitado às origens configuradas;
- HSTS, `nosniff`, COOP, CORP, Permissions-Policy e bloqueio de arquivos ocultos/source maps;
- respostas administrativas e de autenticação usam `no-store`.

`style-src 'unsafe-inline'` permanece como risco residual por compatibilidade com CSS gerado pelo Next.js. Não há `unsafe-inline` em `script-src`.

## Abuso, observabilidade e continuidade

- rate limiting distribuído via Redis para login, MFA, recuperação e operações públicas/administrativas;
- deduplicação transacional e idempotência em fluxos críticos;
- logs com redaction de autorização, cookies, senhas, tokens e credenciais;
- `x-request-id`, auditoria, eventos de segurança e IP pseudonimizado por HMAC;
- `/live` para processo e `/ready` para dependências;
- modo somente leitura, revogação emergencial e rollback documentado;
- backup criptografado, checksum, restauração isolada e exercício obrigatório.

## DevSecOps

- instalação imutável com lockfile;
- Actions fixadas por SHA completo;
- PostgreSQL e Redis reais no CI;
- build, typecheck, Vitest, ESLint, audit, smoke e testes cross-tenant;
- CodeQL, dependency review, Dependabot, secret scan customizado e SBOM CycloneDX;
- release com checksums e atestação quando suportada/configurada;
- staging security check e aprovação do environment de produção.

## Relato responsável

Substitua o placeholder de `apps/web/public/.well-known/security.txt` antes do go-live. Não publique credenciais ou detalhes exploráveis em issue aberta. O processo completo está em `docs/operations/INCIDENT_RESPONSE.md`.
