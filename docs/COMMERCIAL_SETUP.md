# Implantação comercial

Este roteiro transforma a demonstração em uma instalação destinada a clientes reais. Não use o plano gratuito ou armazenamento local para dados permanentes.

## 1. Infraestrutura mínima

- PostgreSQL persistente com backup automático;
- Redis/Key Value persistente;
- bucket S3 compatível privado;
- API e site em HTTPS;
- domínio próprio;
- GitHub Actions obrigatório antes do deploy;
- logs e alertas de indisponibilidade.

## 2. Variáveis da API

```env
NODE_ENV=production
DEPLOYMENT_MODE=commercial
REQUIRE_CLOUD_SERVICES=true
DEMO_MODE=false
AUTO_SEED_DEMO=false
AUTO_MIGRATE=true
SESSION_TTL_DAYS=30
MAINTENANCE_INTERVAL_MINUTES=60
BILLING_GRACE_DAYS=5
EXPIRED_GUEST_RETENTION_DAYS=30
AUDIT_RETENTION_DAYS=730
AUDIT_IP_SALT=gere_um_valor_aleatorio_com_ao_menos_32_caracteres
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
AUTH_COOKIE_NAME=vv_admin
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
AUTH_COOKIE_DOMAIN=
RETURN_ADMIN_TOKEN=false
STORAGE_DRIVER=s3

WEB_ORIGINS=https://app.seudominio.com
DATABASE_URL=...
DATABASE_SSL=true
REDIS_URL=...

OBJECT_STORAGE_ENDPOINT=...
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
OBJECT_STORAGE_BUCKET=...
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

Com `DEPLOYMENT_MODE=commercial`, a API recusa a inicialização quando demonstração, seed, serviços persistentes, S3, cookie administrativo ou salt de auditoria estiverem configurados de forma insegura. O `AUDIT_IP_SALT` é usado para registrar um identificador irreversível do endereço de origem sem guardar o IP puro.

O painel usa cookie `HttpOnly`; não há token administrativo no `localStorage`. Mantenha `AUTH_COOKIE_DOMAIN` vazio para um cookie restrito ao host da API. `AUTH_COOKIE_SAME_SITE=lax` é suficiente quando site e API compartilham o mesmo site registrável, como `app.seudominio.com` e `api.seudominio.com`. Use `none` somente quando os dois estiverem em sites diferentes e ambos forem HTTPS.

## 3. Variáveis do site

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com
NEXT_PUBLIC_REALTIME_URL=https://api.seudominio.com
```

Depois de definir os domínios finais, atualize `WEB_ORIGINS` com a origem exata do site, sem barra final. O frontend já envia `credentials: include`; não copie tokens para variáveis públicas ou armazenamento do navegador.

## 4. Administrador da plataforma

Depois que as migrações forem aplicadas, crie uma conta interna exclusiva para operar clientes e cobrança:

```bash
npm run platform:bootstrap -- \
  --email administrador@seudominio.com \
  --name "Administrador VibeVenue"
```

O comando gera uma senha temporária, força a troca no primeiro acesso e cria uma organização técnica que não aparece como cliente. Abra `https://app.seudominio.com/?admin=1` para acessar o console da plataforma.

Não reutilize o e-mail de um cliente. O bootstrap bloqueia a elevação acidental de uma conta comercial. A organização interna fica fora de MRR, faturamento, avisos e exclusão de clientes. Consulte `docs/PLATFORM_ADMIN.md`.

## 5. Primeiro cliente

Após o primeiro deploy e a aplicação das migrações, execute o comando no ambiente que possua acesso seguro ao banco:

```bash
npm run client:create -- \
  --company "Empresa Exemplo" \
  --owner-name "Responsável" \
  --owner-email "responsavel@empresa.com" \
  --venue "Unidade Centro" \
  --city "Franca/SP" \
  --plan pro \
  --monthly-cents 29900 \
  --trial-days 14
```

O comando cria, em uma transação:

- organização e situação comercial;
- proprietário e senha temporária;
- vínculo de acesso;
- primeira unidade;
- área `PRINCIPAL` e QR inicial;
- estado de reprodução;
- registro de auditoria.

A senha é exibida uma única vez. Entregue-a por canal seguro. Enquanto ela não for alterada, o usuário só consegue consultar a própria identificação, definir a senha definitiva ou sair; os dados e módulos da empresa permanecem bloqueados.

### Limites e documentos legais no provisionamento

Os limites padrão são aplicados no servidor e podem ser sobrescritos por cliente:

| Plano | Unidades | Usuários ativos | Áreas por unidade |
|---|---:|---:|---:|
| `demo` | 1 | 3 | 20 |
| `start` | 1 | 5 | 50 |
| `pro` | 5 | 25 | 250 |
| `network` | 50 | 250 | 1.000 |
| `custom` | 1.000 | 10.000 | 10.000 |

Exemplo com limites contratados e aceite legal obrigatório:

```bash
npm run client:create -- \
  --company "Empresa Exemplo" \
  --owner-name "Responsável" \
  --owner-email "responsavel@empresa.com" \
  --venue "Unidade Centro" \
  --plan pro \
  --max-venues 8 \
  --max-users 40 \
  --max-zones-per-venue 300 \
  --require-guest-consent true \
  --privacy-url "https://empresa.com/privacidade" \
  --terms-url "https://empresa.com/termos" \
  --privacy-version "1.0" \
  --terms-version "1.0"
```

O consentimento fica desativado quando não há documentos reais. Ele é ativado automaticamente se as duas URLs forem informadas, ou explicitamente com `--require-guest-consent true`. Nunca ative essa exigência com links vazios. Ao publicar nova versão dos documentos, altere também os números de versão; novas sessões terão de aceitar a versão corrente.

## 6. Administração de clientes

Listar clientes:

```bash
npm run client:list
```

Ativar:

```bash
npm run client:status -- --organization-id ORG_ID --status active
```

Reabrir teste exige prazo explícito:

```bash
npm run client:status -- --organization-id ORG_ID --status trial --trial-days 14
```

Inadimplência com cinco dias de tolerância:

```bash
npm run client:status -- --organization-id ORG_ID --status past_due --access-days 5
```

Suspender ou cancelar:

```bash
npm run client:status -- --organization-id ORG_ID --status suspended
npm run client:status -- --organization-id ORG_ID --status cancelled
```

Suspensão e cancelamento revogam sessões administrativas. O portal público e novas sessões de visitantes também deixam de funcionar.

Redefinir uma senha perdida:

```bash
npm run user:reset-password -- --email usuario@empresa.com
```

O comando gera uma senha temporária, marca a troca como obrigatória, revoga as sessões existentes e registra a ação na auditoria.

### Faturas e inadimplência automática

Criar uma fatura usando o valor mensal cadastrado na empresa:

```bash
npm run invoice:create -- \
  --organization-id ORG_ID \
  --reference 2026-08 \
  --due 2026-08-10 \
  --period-start 2026-08-01 \
  --period-end 2026-09-01
```

Também é possível informar `--amount-cents`. O painel do cliente mostra as faturas registradas. Quando uma fatura aberta vence, a manutenção marca a fatura como `overdue`, muda a empresa para `past_due` e mantém acesso pelo número de dias definido em `BILLING_GRACE_DAYS`.

Registrar pagamento:

```bash
npm run invoice:pay -- --invoice-id INV_ID --method pix --external-reference ID_DO_PAGAMENTO
```

Cancelar uma cobrança emitida incorretamente:

```bash
npm run invoice:void -- --invoice-id INV_ID --notes "Cobrança substituída"
```

Listar faturas:

```bash
npm run invoice:list -- --organization-id ORG_ID
```

O livro de faturas é independente do gateway. Ao integrar Asaas, Mercado Pago ou outro provedor, mantenha o identificador externo e atualize a fatura somente após validar a assinatura do webhook e a idempotência do evento.

## 7. Equipe do cliente

Proprietários e gerentes podem criar usuários no painel. Os perfis são:

- `owner`: tudo, inclusive perfis de proprietário e gerente;
- `manager`: gestão operacional, unidades, áreas e usuários inferiores;
- `operator`: música, atendimento e pedidos;
- `moderator`: música e mural;
- `marketing`: enquetes, quiz, eventos, campanhas, comunicados e mural;
- `viewer`: visão geral, métricas e própria senha.

Cada pessoa deve usar uma conta individual. Não compartilhe a conta do proprietário. Desative imediatamente usuários que saírem da equipe; a desativação revoga as sessões daquele vínculo.

Em **Conta e equipe**, cada usuário pode revisar os dispositivos conectados, encerrar uma sessão específica e sair de todos os outros dispositivos. Após suspeita de acesso indevido, redefina a senha e confirme essa lista.


## 8. Módulos por unidade

A lista `venues.modules` define o que cada unidade pode usar. O bloqueio ocorre no portal, painel, rotas HTTP e Socket.IO. O conjunto disponível é:

```text
music, service, orders, polls, quiz, events, loyalty, campaigns, media, feedback, signage, analytics
```

Proprietários e gerentes podem alterar dados da unidade, módulos e áreas no painel. A API continua validando permissões, organização e limites do plano em transações; esconder um botão nunca substitui essas regras. Áreas podem ser desativadas e reativadas sem apagar o histórico.

Fidelidade e cupons exigem um identificador estável informado pelo cliente, como e-mail ou telefone. Esse dado é normalizado no servidor e deve constar na política de privacidade e retenção.

## 9. Avisos internos

A área **Conta e equipe** mostra avisos de faturas vencidas e término do teste. A manutenção usa chaves de deduplicação, portanto não cria uma nova mensagem a cada execução. Avisos podem ser marcados individualmente ou em conjunto como lidos. Eles complementam, mas não substituem, e-mail, WhatsApp ou alertas externos de suporte.

## 10. Exportação e encerramento de cliente

Exportar os dados da empresa, sem senhas, tokens ou bytes das imagens do S3:

```bash
npm run data:export -- --organization-id ORG_ID --output exports/empresa.json
```

A exportação gera também um checksum SHA-256. Para excluir definitivamente uma organização, o comando exige uma confirmação que contém o ID e cria a exportação antes da exclusão por padrão:

```bash
npm run data:delete-organization -- \
  --organization-id ORG_ID \
  --confirm DELETE-ORG_ID \
  --output exports/empresa-final.json
```

Nunca use `--skip-export true` sem autorização documentada e uma cópia já validada. Arquivos de mídia precisam ser tratados também no bucket S3 conforme a política contratual.

## 11. Liberação para faturamento

Antes de cadastrar o primeiro cliente pagante, confirme:

1. GitHub Actions `quality` verde;
2. `/live` respondendo e `/ready` com PostgreSQL, Redis, adaptador Socket.IO e storage saudáveis;
3. criação de cliente pelo utilitário;
4. login, bloqueio após tentativas inválidas, troca de senha, criação de equipe e revogação de outros dispositivos;
5. QR, pedido, chamado, música, TV, reserva e upload em dois navegadores;
6. suspensão bloqueando painel e portal;
7. fatura criada, visualizada no painel, marcada como paga e fluxo de inadimplência testado;
8. backup concluído, checksum conferido e restauração testada em banco separado;
9. exportação da organização validada e procedimento de exclusão documentado;
10. termos, privacidade, suporte, cobrança e responsabilidades definidos;
11. revisão das obrigações fiscais, pagamentos e execução pública de música aplicáveis ao cliente.
