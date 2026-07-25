# Arquitetura do VibeVenue

## Princípios

1. projeto independente e multiempresa;
2. servidor como fonte de verdade;
3. experiência por QR sem instalação;
4. autorização por organização, unidade, papel e módulo;
5. PostgreSQL como fonte permanente;
6. tempo real como invalidação, não como banco;
7. integrações substituíveis;
8. segurança, auditoria e continuidade por padrão.

## Componentes

```text
Cliente por QR ───────┐
Painel administrativo ├── HTTPS / Socket.IO ── API Node/Express
Modo TV ──────────────┘                            │
                                                   ├── PostgreSQL
                                                   ├── Redis / adapter Socket.IO
                                                   └── Storage local ou S3
```

### Frontend

Next.js exportado estaticamente contém landing, painel, portal temporário e modo TV. O service worker guarda apenas o shell público; API e uploads nunca entram no cache.

### Backend

A API concentra autenticação, autorização, regras operacionais, uploads, snapshots, tempo real, auditoria, cobrança e manutenção. Módulos relevantes:

- `auth`, `cookies` e `commercial`: identidade, sessão e acesso comercial;
- `platform`: domínios operacionais e isolamento;
- `billing`: faturas e reconciliação de inadimplência;
- `plans`: catálogo, sobrescritas e limites transacionais;
- `notifications`: avisos deduplicados de cobrança e teste;
- `audit` e `observability`: trilha, correlação e anonimização;
- `maintenance`: expiração, retenção, limpeza e reconciliação;
- `storage`: local/S3 e URLs assinadas;
- `migrations`: evolução transacional do banco.

### Saúde e observabilidade

`/live` verifica o processo; `/ready` verifica dependências; `/health` mantém compatibilidade. Cada requisição recebe `x-request-id`; logs estruturados ocultam segredos e a auditoria preserva a correlação.

### Banco de dados

Domínios: organizações, planos, documentos legais, usuários, vínculos e sessões; unidades e áreas; visitantes e aceite versionado; música; atendimento; pedidos; enquetes e quiz; eventos e reservas; campanhas e fidelidade; mural, avaliações e comunicados; faturas; avisos internos; auditoria.

### Tempo real

Salas `venue:<id>` recebem notificações leves. A interface busca um snapshot novo pela API, evitando duplicar regras no navegador.

### Continuidade

- dump PostgreSQL em formato customizado com checksum;
- restauração validada em destino separado;
- exportação por organização para portabilidade;
- bucket S3 versionado e privado;
- Redis nunca é fonte única de dados.

## Isolamento

Consultas administrativas usam a organização da sessão. Rotas públicas derivam organização e unidade da sessão temporária. Referências cruzadas de outro estabelecimento são rejeitadas.

## Extensões

Gateways de pagamento, POS, reservas externas, WhatsApp, e-mail, emissão fiscal, marca branca e analytics podem ser conectados sem alterar os contratos centrais. O livro de faturas atual não simula confirmação de pagamento externo: o provedor deve validar webhook e idempotência antes da atualização.
