# VibeVenue — estado final da implementação

## Classificação desta entrega

Esta árvore é o **candidato final seguro do produto**, contendo código, testes, infraestrutura como código, documentação, runbooks e automações de segurança. O desenvolvimento planejado para esta fase está concluído.

A expressão “seguro” não significa invulnerável. A liberação para clientes reais exige que o mesmo commit passe no GitHub Actions, seja implantado em infraestrutura real, tenha restauração comprovada e seja submetido a revisão independente.

## Implementado no produto

- SaaS multiempresa com isolamento por organização/unidade e suíte de testes cross-tenant em PostgreSQL real;
- painel do estabelecimento, portal, TV e console interno da plataforma;
- autenticação por cookie HttpOnly, sessões absolutas e por inatividade, bloqueio progressivo e revogação;
- MFA TOTP obrigatório para proprietários e administradores da plataforma;
- códigos de recuperação, recuperação de senha por e-mail e notificações de segurança;
- step-up com senha e MFA para ações críticas;
- papéis, módulos, plano, cobrança e situação comercial validados no servidor;
- tokens com HMAC e pepper, senhas scrypt versionadas, rehash de legado e chaves de aplicação em AES-256-GCM;
- rotação transacional da chave usada pelos segredos MFA;
- rate limiting distribuído por Redis com fallback seguro;
- upload validado por magic bytes, limites, ClamAV e reencode seguro antes do S3;
- CSP com hash de script, bloqueio de frame, arquivos ocultos e source maps;
- logs estruturados com redaction, request ID, auditoria e eventos de segurança;
- consentimento legal versionado, retenção, exportação e exclusão controlada;
- faturas, inadimplência, avisos e limites de plano;
- backup PostgreSQL criptografado com AES-256-GCM, checksum e restauração autenticada;
- modo emergencial somente leitura, revogação global e scripts de contenção;
- staging e produção separados por modelos de Blueprint;
- CI com PostgreSQL/Redis, build, tipos, testes, lint, audit, SBOM e smoke;
- CodeQL, dependency review, Dependabot, release com checksums e atestação opcional;
- runbooks, threat model, registro de riscos, matriz de controles e escopo de pentest.

## Validado neste ambiente

- integridade e origem do lockfile;
- validação estrutural de TypeScript/TSX;
- validação semântica offline com contratos e aliases internos;
- Blueprints de demonstração, staging e produção;
- varredura de secrets e arquivos proibidos;
- sintaxe de todos os scripts Node;
- servidor estático, CSP e cabeçalhos em teste local sintético;
- criptografia de backup com round-trip e rejeição de chave incorreta;
- geração de secrets com permissão `0600` e verificação comercial sem exposição de valores;
- manifesto SHA-256 e integridade do ZIP final após extração limpa.

## Evidências que precisam ser produzidas fora deste ambiente

- execução verde do workflow `quality` no GitHub;
- build oficial Next.js/TypeScript, Vitest, ESLint e `npm audit` no commit final;
- migração e smoke em PostgreSQL/Redis reais;
- teste com bucket S3 privado e scanner ClamAV;
- entrega de e-mail com domínio autenticado;
- backup e restauração em banco e bucket separados;
- alertas recebidos pelos responsáveis;
- pentest independente, correção e reteste;
- aprovação jurídica de política, termos, contratos, retenção e fornecedores.

## Decisão de go-live

O sistema só deve receber dados reais quando todos os itens obrigatórios de `docs/operations/GO_LIVE_OWNER_CHECKLIST.md` estiverem marcados e as exceções restantes estiverem registradas em `docs/security/SECURITY_EXCEPTIONS.md` com responsável e prazo.

## Atualização de portfólio e CI

- Os erros de `exactOptionalPropertyTypes` observados no run real foram corrigidos.
- Foi incluído um workflow dedicado para publicar a demonstração visual no GitHub Pages.
- A demonstração não depende de infraestrutura externa nem usa dados reais.
- A release continua classificada como candidata até os novos runs do GitHub Actions concluírem com sucesso.
