# Inventário técnico

## Aplicação

| Componente | Tecnologia | Função | Exposição |
|---|---|---|---|
| Web/PWA | Next.js, React, TypeScript | landing, portal QR, painel e console | internet |
| API | Node.js, Express, TypeScript | autenticação, regras, administração e arquivos | internet via HTTPS |
| Tempo real | Socket.IO + Redis adapter | invalidação e playback | internet via WSS |
| Contratos | Zod | validação de entradas e tipos compartilhados | interno |
| Banco | PostgreSQL | fonte permanente de verdade | privado |
| Cache/pub-sub | Redis | tempo real e infraestrutura | privado |
| Arquivos | S3 compatível | imagens privadas e URLs temporárias | privado/presigned |
| CI | GitHub Actions | qualidade e build | fornecedor |
| Deploy atual | Render Blueprint | API, site, PostgreSQL e Redis | fornecedor |

## Perfis

- visitante temporário por QR;
- proprietário;
- gerente;
- operador;
- moderador;
- marketing;
- visualizador;
- administrador interno da plataforma.

## Interfaces e integrações

- HTTP JSON sob `/api/public`, `/api/auth`, `/api/admin`, `/api/platform`;
- Socket.IO para observação e controle de playback;
- PostgreSQL por `DATABASE_URL`;
- Redis por `REDIS_URL`;
- S3 por endpoint, bucket e credenciais;
- YouTube iframe para reprodução de mídia solicitada;
- nenhuma IA/LLM, gateway de pagamento, e-mail ou WhatsApp ativo no Checkpoint 07.

## Jobs e scripts

- manutenção periódica no processo da API;
- backup/restore PostgreSQL;
- exportação e exclusão de organização;
- provisionamento de cliente e administrador da plataforma;
- smoke test e validadores offline.

## Secrets necessários

- `DATABASE_URL`;
- `REDIS_URL`;
- credenciais do object storage;
- `AUDIT_IP_SALT`;
- `TOKEN_HASH_PEPPER`;
- credenciais administrativas criadas no banco, nunca em `.env` versionado.

Valores reais nunca devem aparecer neste documento.
