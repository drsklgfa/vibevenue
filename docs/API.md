# API principal

Todas as respostas usam JSON. Toda requisição recebe um protocolo no cabeçalho `x-request-id`; erros também incluem `requestId` no corpo.

## Saúde

```text
GET /live   # processo HTTP vivo, sem depender das integrações
GET /ready  # prontidão de banco, Redis e storage
GET /health # alias de compatibilidade para /ready
```

As respostas incluem `service`, `release` e `timestamp`. Use `/ready` como health check do deploy.

## Autenticação administrativa

O navegador usa cookie de sessão `HttpOnly`, `Secure` em produção e `SameSite` configurável. As chamadas usam:

```ts
fetch(url, { credentials: "include" })
```

Operações mutáveis validam `Origin` contra `WEB_ORIGINS`. O modo comercial exige `RETURN_ADMIN_TOKEN=false`. O suporte a `Authorization: Bearer` fica restrito a ferramentas privadas e não deve ser usado pelo frontend.

```text
POST   /api/auth/login
POST   /api/auth/demo
GET    /api/auth/me
POST   /api/auth/change-password
POST   /api/auth/logout
GET    /api/auth/sessions
DELETE /api/auth/sessions/:sessionId
DELETE /api/auth/sessions
```

## Portal do visitante

A sessão temporária usa `Authorization: Bearer <token-do-visitante>` e fica limitada à organização, unidade, área e período.

```text
GET  /api/public/venues/:slug
POST /api/public/join # inclui aceite e versões legais quando exigidos
GET  /api/public/me
POST /api/public/music
POST /api/public/music/:id/vote
POST /api/public/service
POST /api/public/orders
POST /api/public/polls/:pollId/vote
POST /api/public/quiz/answer
POST /api/public/feedback
POST /api/public/loyalty/checkin
POST /api/public/events/:eventId/reserve
POST /api/public/campaigns/redeem
POST /api/public/media
```

## Administração

```text
GET   /api/admin/team
POST  /api/admin/team
PATCH /api/admin/team/:userId
GET   /api/admin/snapshot
GET   /api/admin/billing
GET   /api/admin/audit?limit=50&beforeId=ID&action=AÇÃO&entityType=TIPO
GET   /api/admin/notifications?limit=30&unreadOnly=true
PATCH /api/admin/notifications/:id/read
POST  /api/admin/notifications/read-all
PATCH /api/admin/organization
POST  /api/admin/venues
PATCH /api/admin/venues/:venueId
POST  /api/admin/venues/:venueId/zones
PATCH /api/admin/venues/:venueId/zones/:zoneId
PATCH /api/admin/venues/:venueId/music/:id
POST  /api/admin/venues/:venueId/playback
PATCH /api/admin/venues/:venueId/service/:id
PATCH /api/admin/venues/:venueId/orders/:id
POST  /api/admin/venues/:venueId/polls
POST  /api/admin/venues/:venueId/quizzes
POST  /api/admin/venues/:venueId/events
POST  /api/admin/venues/:venueId/campaigns
POST  /api/admin/venues/:venueId/announcements
PATCH /api/admin/venues/:venueId/media/:id
```

- faturamento: `owner`, `manager` e `viewer`;
- auditoria: `owner` e `manager`;
- dados da empresa e documentos legais: somente `owner`;
- unidade, módulos e áreas: `owner` e `manager`;
- avisos internos: qualquer usuário autenticado da organização;
- equipe e operações continuam submetidas às permissões por função e organização.

## Administração da plataforma

Estas rotas exigem `isPlatformAdmin=true` dentro da organização interna da plataforma. Elas usam o mesmo cookie `HttpOnly`, proteção de origem e `cache-control: no-store` do painel administrativo.

```text
GET   /api/platform/overview
GET   /api/platform/clients
POST  /api/platform/clients
PATCH /api/platform/clients/:organizationId/commercial
PATCH /api/platform/clients/:organizationId/status
GET   /api/platform/invoices?organizationId=ORG_ID
POST  /api/platform/invoices
PATCH /api/platform/invoices/:invoiceId
POST  /api/platform/users/reset-password
```

A organização interna nunca é retornada por essas consultas. O reset de senha aceita somente usuários vinculados a organizações de clientes e recusa administradores da plataforma.

## Socket.IO

O painel envia o cookie com `withCredentials: true`; o visitante envia o token temporário.

Cliente:

```text
venue:watch
guest:watch
admin:watch
playback:control
```

Servidor:

```text
venue:update
playback:update
```

`venue:update` funciona como invalidação: a interface busca um snapshot novo na API.

## Regras transversais

- senha temporária bloqueia as demais operações;
- módulos desativados são recusados no painel, HTTP e Socket.IO;
- sessões administrativas são vinculadas ao usuário e à organização;
- empresas suspensas, canceladas ou fora da janela comercial perdem acesso;
- respostas administrativas usam `cache-control: no-store`;
- o service worker não armazena API nem uploads;
- ações críticas são auditadas com usuário, organização, entidade, protocolo e hash anonimizado da origem;
- limites de unidades, usuários ativos e áreas são aplicados transacionalmente no servidor;
- aceite legal obrigatório exige URLs válidas e versões atuais;
- limites, unicidade, deduplicação e travas transacionais são aplicados no servidor.

## Erros

Formato típico:

```json
{
  "ok": false,
  "message": "Não foi possível concluir a operação.",
  "requestId": "support-case-123456"
}
```

Códigos comuns: `400` validação/regra, `401` sessão ausente, `403` permissão ou situação comercial, `404` recurso, `409` conflito, `429` limite, `500` infraestrutura inesperada e `503` prontidão indisponível.
