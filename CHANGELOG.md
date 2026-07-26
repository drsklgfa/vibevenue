## 1.0.0-ci-pages-fix-2 - 2026-07-25

- Corrige a tipagem das funcionalidades da landing page usando objetos imutáveis com chaves textuais estáveis.
- Normaliza o patch de tema do estabelecimento antes da mesclagem, removendo valores `undefined`.
- Resolve os erros reais encontrados nos workflows `quality` e `portfolio-pages` do commit `d208b93`.
- Revalida os 65 arquivos TypeScript/TSX, segurança estrutural, Blueprints, CSP e criptografia de backup.


## 1.0.0-ci-pages-fix - 2026-07-25

- Corrige incompatibilidades de `exactOptionalPropertyTypes` detectadas pelo build real do GitHub Actions.
- Adiciona GitHub Pages com export estático em `/vibevenue`.
- Adiciona modo de portfólio navegável com prévias estáticas de painel, cliente e TV.
- Torna manifesto, ícones, navegação e service worker compatíveis com `basePath`.


## 1.0.1-ci-fix — 2026-07-25

- Updated Next.js to 16.2.11 to address the high-severity production audit finding.
- Forced Sharp 0.35.3 across the dependency tree.
- Updated pinned checkout and CodeQL actions.
- Made CodeQL analysis portable without requiring repository code-scanning upload.
- Replaced dependency-review with a portable immutable-install and production-audit workflow.
- Revalidated lockfile, source, semantic checks, Render blueprints, repository secret scan, CSP and backup cryptography.
# Changelog

## Candidato final seguro 1.0.0 — 25/07/2026

### Identidade e autorização

- MFA TOTP obrigatório, enrollment, recovery codes e desafios protegidos;
- recuperação de senha por e-mail, tokens curtos e avisos de segurança;
- step-up com senha e MFA em operações críticas;
- eventos de segurança e sessão mais restrita para plataforma;
- rotação AES-GCM dos segredos MFA com chave anterior temporária.

### Tenant, abuso e uploads

- suíte cross-tenant/IDOR com PostgreSQL real no CI;
- rate limit distribuído por Redis;
- magic bytes, limites, ClamAV required e reencode WebP antes do S3;
- read-only de emergência e revogação global.

### Navegador, continuidade e DevSecOps

- CSP com hash de script, headers reforçados e teste do servidor estático;
- backup AES-256-GCM, checksum, restauração autenticada e teste round-trip;
- staging/produção separados, migrations em pre-deploy e AUTO_MIGRATE desligado;
- CI com DB/Redis, audit, SBOM, CodeQL, dependency review e Actions por SHA;
- release com checksums e atestação condicional;
- documentação final de deploy, monitoramento, rotação, evidências, riscos e go-live.

### Validação honesta

- validações offline, CSP, backup crypto, secrets sintéticos, Blueprints e manifesto aprovados;
- pipeline completo permanece dependente do GitHub porque o gateway npm local retornou HTTP 503;
- infraestrutura real, restore e pentest continuam ações obrigatórias externas.

## Checkpoint de segurança 07 — 24/07/2026

### Baseline e governança

- adoção formal do `AI Secure Project Blueprint`;
- inventário técnico, classificação e processamento de dados;
- diagramas textuais de fluxo e fronteiras de confiança;
- threat model STRIDE, casos de abuso, matriz de autorização e isolamento;
- gap analysis, registro de riscos, matriz de controles e exceções;
- escopo de pentest e checklist de go-live;
- ações detalhadas do proprietário para GitHub, Render, secrets e produção;
- runbooks de incidente e rollback, retenção e controles de privacidade.

### Identidade, sessão e criptografia

- hash `scrypt` versionado com parâmetros fixos e migração transparente do formato legado;
- rejeição de hashes com custo adulterado;
- pepper HMAC separado para tokens e exigido em modo comercial;
- expiração absoluta e por inatividade;
- política mais restrita para administrador da plataforma;
- testes escritos para hash versionado, adulteração e política de sessão.

### Navegador e secrets

- token temporário e fidelidade do visitante migrados para `sessionStorage`;
- limpeza de valores legados do `localStorage`;
- registro do service worker movido para componente sem script inline;
- cache PWA versionado novamente;
- gerador local de secrets com permissão restrita;
- verificador de ambiente comercial sem imprimir credenciais;
- fail-fast para TLS, origens HTTPS exatas e storage HTTPS.

### Processo seguro

- `CODEOWNERS`, template de PR e issue de melhoria de segurança;
- `security.txt`, guia de contribuição e inventário criptográfico/fornecedores;
- comparação com o Checkpoint 06: 37 arquivos novos, 22 alterados e nenhum removido.

## Checkpoint comercial 06 — 23/07/2026

### Console da plataforma

- organização interna separada dos estabelecimentos clientes;
- administrador da plataforma com flag própria e associação exclusiva à organização interna;
- console web responsivo com visão de clientes, MRR, faturas, recebimentos e situação da base;
- criação transacional de cliente, proprietário, unidade inicial, área principal e reprodução;
- senha temporária exibida uma única vez e troca obrigatória no primeiro acesso;
- edição de plano, preço, e-mail de cobrança e limites contratados;
- bloqueio de redução de limite abaixo do uso atual;
- alteração de teste, ativação, inadimplência, suspensão e cancelamento;
- emissão, baixa manual e cancelamento de faturas;
- redefinição segura da senha do proprietário;
- gerenciamento das sessões e senha do administrador interno.

### Isolamento e proteção

- identidade de plataforma só é válida quando usuário e organização são internos;
- bootstrap recusa elevar conta já pertencente a cliente;
- reset administrativo não alcança contas internas;
- organização técnica excluída de listagens, MRR, cobrança, notificações e exclusão definitiva;
- exportação comercial passou a incluir limites, documentos legais e marcador de organização interna;
- validadores exigem rotas, arquivos, migrações e proteções do console.

### Documentação e qualidade

- novo guia `docs/PLATFORM_ADMIN.md`;
- implantação comercial, API, README e deploy atualizados;
- teste escrito para geração de credencial temporária da plataforma;
- comparação com o Checkpoint 05: 6 arquivos novos, 22 alterados e nenhum removido.

## Checkpoint comercial 05 — 23/07/2026

### Planos e limites

- catálogo operacional `demo`, `start`, `pro`, `network` e `custom`;
- limites padrão de unidades, usuários ativos e áreas por unidade;
- sobrescritas contratuais por organização;
- criação e reativação de usuário, criação de unidade e criação de área verificadas dentro de transações;
- planos desconhecidos caem no limite seguro do `start`, sem ampliar acesso acidentalmente;
- painel mostra consumo e limites da empresa.

### Autogestão do cliente

- proprietário atualiza empresa, e-mail de cobrança, política e termos;
- proprietários e gerentes atualizam unidade, tema, módulos e áreas;
- áreas podem ser desativadas e reativadas sem apagar o histórico;
- áreas inativas continuam visíveis no painel administrativo, mas são recusadas no portal público;
- provisionamento comercial aceita limites e documentos legais.

### Consentimento e privacidade

- aceite separado de política de privacidade e termos, com data e versões armazenadas;
- documentos obrigatórios precisam de URLs HTTPS reais;
- migração usa consentimento desligado por padrão para não bloquear clientes existentes;
- alteração de versão ou ativação do aceite invalida sessões antigas até novo consentimento;
- portal limpa aceitações ao trocar o identificador do estabelecimento e rejeita preview obsoleto.

### Avisos e qualidade

- central interna com avisos de fatura vencida e teste próximo do fim;
- deduplicação das mensagens e preservação do estado de leitura;
- marcação individual ou coletiva como lida;
- contratos e testes ampliados para planos, URLs legais, booleanos de consulta e configurações;
- validadores offline tornam obrigatórias as rotas, migrações e proteções do Checkpoint 05.

## Checkpoint comercial 04 — 23/07/2026

### Cobrança e acesso comercial

- livro de faturas por organização com situação aberta, vencida, paga ou cancelada;
- criação, listagem, pagamento e cancelamento por utilitário administrativo;
- reconciliação periódica de vencimentos e tolerância configurável;
- painel do cliente exibe faturas conforme o perfil;
- inadimplência automática identificada separadamente de bloqueio manual, impedindo reativação indevida;
- referência externa e forma de pagamento preparadas para futura integração com gateway.

### Auditoria, suporte e observabilidade

- protocolo `x-request-id` em todas as respostas e no corpo dos erros;
- endpoints separados de liveness (`/live`) e readiness (`/ready`), com `/health` como alias;
- logs estruturados com redação de cookies, autorização, senhas e tokens;
- auditoria consultável por proprietários e gerentes, com paginação e filtros;
- IP de origem não é armazenado puro: correlação por HMAC com salt obrigatório em produção;
- release da aplicação incluído nos endpoints de saúde.

### Continuidade, privacidade e retenção

- scripts de backup PostgreSQL em formato customizado, checksum e metadados;
- restauração protegida por confirmação, validação do checksum e destino separado;
- exportação completa por organização sem senhas, tokens ou bytes do S3;
- exclusão definitiva exige confirmação contendo o ID e exporta antes por padrão;
- retenção configurável de auditoria e sessões expiradas de visitantes;
- limpeza de metadados rejeitados e reconciliação comercial na manutenção periódica;
- documentação de operação, API, arquitetura, segurança, cobrança e recuperação atualizada.

### Qualidade

- testes escritos para liveness, protocolo de requisição, observabilidade e contratos de cobrança/auditoria;
- validadores offline exigem rotas, tabelas, configurações, scripts e controles do Checkpoint 04;
- Blueprint atualizado para usar `/ready` e declarar cobrança e retenção.

## Checkpoint comercial 03 — 22/07/2026

### Autenticação administrativa

- painel migrado de token persistente no navegador para cookie de sessão `HttpOnly`;
- cookie configurável por nome, `Secure`, `SameSite`, domínio e expiração;
- modo comercial exige `AUTH_COOKIE_SECURE=true` e `RETURN_ADMIN_TOKEN=false`;
- frontend e Socket.IO usam credenciais do navegador sem acesso ao token;
- operações administrativas autenticadas por cookie validam `Origin` contra `WEB_ORIGINS`;
- suporte `Bearer` preservado apenas para ferramentas privadas fora do modo comercial.

### Proteção de conta e sessões

- bloqueio temporário após sucessivas tentativas inválidas de login;
- verificação simulada de senha para e-mails inexistentes, reduzindo enumeração por tempo;
- registro de último login, última atividade e identificação básica do navegador;
- tela para listar dispositivos conectados, revogar uma sessão ou encerrar todas as outras;
- redefinição e troca de senha removem bloqueios e revogam sessões conforme o fluxo;
- cookie inválido ou expirado é removido automaticamente do navegador.

### Banco, contratos e qualidade

- novas colunas de segurança em usuários e sessões, com índices correspondentes;
- contrato compartilhado `AdminSessionInfo`;
- testes escritos para parsing, emissão e remoção segura de cookies;
- validadores impedem retorno do token administrativo ao `localStorage` e exigem os controles de sessão e bloqueio;
- domínio de cookie sanitizado antes de compor o cabeçalho HTTP;
- documentação de API, segurança, implantação e operação atualizada para o novo modelo.

## Checkpoint comercial 02 — 22/07/2026

### Acesso, sessões e permissões

- senha temporária bloqueia todas as funções, exceto identificação, troca de senha e logout;
- primeira troca de senha encerra as demais sessões do usuário;
- tela de primeira senha permite sair com segurança e usar outra conta;
- sessões administrativas continuam vinculadas à organização selecionada;
- higienização periódica de sessões expiradas;
- validação de origem aplicada também ao upgrade WebSocket;
- painel escolhe automaticamente uma aba permitida ao mudar de unidade ou perfil.

### Módulos e isolamento funcional

- módulo `orders` formalizado nos contratos e adicionado às unidades antigas;
- rotas públicas, administrativas e Socket.IO recusam ações de módulos desativados;
- snapshots públicos e administrativos não expõem conteúdo de módulos inativos;
- indicadores de módulos desativados retornam zero;
- armazenamento e reprodução continuam restritos à unidade correta.

### Idempotência e concorrência

- música repetida pela mesma sessão é reaproveitada dentro da janela de segurança;
- chamados equivalentes não são duplicados por clique ou reenvio de rede;
- pedidos equivalentes são comparados por itens, quantidades, preços, observação e total;
- reservas repetidas retornam a reserva já criada antes de consumir nova capacidade;
- avaliação da mesma sessão é atualizada, não duplicada;
- criação concorrente de enquete e quiz ao vivo é serializada;
- migrações são executadas com trava consultiva transacional;
- check-in de fidelidade e capacidade de eventos permanecem protegidos por transação.

### Dados, mídia e experiência

- fidelidade e cupons exigem identificador estável do cliente, normalizado no servidor;
- datas de eventos e campanhas do navegador são convertidas corretamente para UTC;
- upload removido quando a gravação no banco falha;
- mídia rejeitada é removida do storage e tem sua referência limpa;
- URLs S3 continuam renovadas ao carregar os snapshots.

### Qualidade

- novo comando `npm run check:offline`;
- verificação semântica offline complementar para contratos, aliases e tipos internos;
- novos testes escritos para cupons, reservas, reprodução, módulos e períodos cronológicos.

## Checkpoint comercial 01 — 22/07/2026

### Segurança e isolamento

- sessões administrativas vinculadas à organização escolhida;
- autenticação e portal bloqueados para organizações sem acesso operacional;
- validação pública de unidade ativa também no Socket.IO;
- permissões por perfil aplicadas às rotas e aos controles em tempo real;
- rate limit específico para autenticação, ações públicas e mídia;
- respostas administrativas marcadas como `no-store`;
- service worker impedido de armazenar API, uploads e conteúdo autenticado;
- erros de banco/infraestrutura não são mais expostos diretamente em produção;
- validação de dimensão e tipo real de imagens com Sharp.

### Comercial

- situação da organização: teste, ativa, inadimplente com tolerância, suspensa ou cancelada;
- preço mensal, e-mail de cobrança e datas de acesso no banco;
- utilitário para criar cliente completo, listar clientes e alterar situação;
- redefinição administrativa de senha com revogação de sessões;
- painel com situação da assinatura, troca de senha e gestão de equipe;
- proteção para manter ao menos um proprietário ativo.

### Consistência operacional

- reservas com bloqueio transacional de capacidade;
- check-in de fidelidade protegido contra concorrência;
- criação transacional de enquetes e quizzes;
- validação de opções de quiz e enquete;
- transições válidas para música, atendimento e pedidos;
- reprodução impedida de apontar para música de outra unidade;
- contagem de reservas baseada no total de pessoas;
- atualizações inexistentes deixam de retornar sucesso falso.

### Infraestrutura e mídia

- verificação real do bucket S3 na inicialização;
- URLs assinadas de mídia renovadas ao carregar snapshots;
- `/health` consulta PostgreSQL e Redis em tempo real;
- modo `commercial` recusa configuração insegura.
