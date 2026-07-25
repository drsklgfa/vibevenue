# Operação e implantação

## Rotina diária

1. Confirme `/live` e `/ready`.
2. Abra o painel, selecione a unidade e confira áreas, QR Codes e módulos.
3. Revise cardápio, disponibilidade, TV, comunicados e campanhas.
4. Acompanhe pedidos, chamados, música e moderação.
5. Confira avisos internos, faturas, auditoria e indicadores conforme o perfil.

## Papéis

- `owner`: proprietário e governança completa;
- `manager`: gestão operacional, equipe e configurações;
- `operator`: pedidos, atendimento e música;
- `moderator`: música e mural;
- `marketing`: campanhas, eventos, quiz, enquetes, comunicados e mural;
- `viewer`: leitura de visão geral, métricas e faturamento.

Apenas o proprietário cria ou altera proprietários e gerentes. Cada pessoa deve usar uma conta individual.

## Conta e dispositivos

- a senha temporária deve ser trocada no primeiro acesso;
- o painel usa cookie `HttpOnly`, nunca token administrativo no armazenamento do navegador;
- a área de conta lista dispositivos, última atividade e expiração;
- encerre sessões desconhecidas ou use **Sair dos outros dispositivos**;
- redefinição administrativa de senha revoga sessões anteriores;
- falhas sucessivas de login geram bloqueio temporário sem revelar se o e-mail existe.

## Saúde e suporte

- `/live`: confirma que o processo HTTP está respondendo;
- `/ready`: confirma prontidão de PostgreSQL, Redis e armazenamento quando exigidos;
- `/health`: alias de compatibilidade para `/ready`.

Toda resposta inclui `x-request-id`. Erros JSON também retornam `requestId`. Solicite esse protocolo ao cliente e procure o mesmo valor nos logs e na auditoria. Logs removem cookies, autorização, senhas e tokens; nunca peça ao cliente que envie esses segredos.

## Cobrança

Use o livro de faturas para registrar cobranças, vencimentos, pagamentos e cancelamentos. A manutenção periódica:

- transforma fatura aberta vencida em `overdue`;
- muda a empresa para `past_due`;
- mantém acesso durante `BILLING_GRACE_DAYS`;
- reativa a empresa quando não restarem débitos vencidos.

Uma integração futura com gateway deve validar assinatura de webhook e idempotência antes de chamar os comandos de pagamento. A mesma manutenção cria avisos deduplicados para fatura vencida e teste a até três dias do fim.

## Limites e autogestão

- criação de usuário considera somente usuários ativos; reativação também valida o limite;
- criação de unidade e área trava a organização durante a contagem;
- limites padrão vêm do plano, com sobrescritas contratuais por empresa;
- proprietários atualizam empresa e documentos legais; proprietários e gerentes atualizam unidade, módulos e áreas;
- desativar uma área preserva histórico e impede novas entradas públicas.

## Consentimento do visitante

Quando habilitado, o portal busca a política corrente antes da entrada, limpa aceitações antigas ao trocar o identificador do local e envia as versões exibidas. A API rejeita aceite ausente ou versão desatualizada. Não habilite a opção sem URLs públicas válidas.

## Incidentes

### API indisponível

- teste `/live`; se falhar, verifique processo, deploy e logs;
- se `/live` funcionar e `/ready` falhar, confira banco, Redis, S3 e variáveis;
- use o `requestId` para correlacionar falhas;
- faça rollback somente para versão previamente aprovada.

### Login ou sessão

- confirme HTTPS, `WEB_ORIGINS` e configurações do cookie;
- confira situação comercial e prazo de acesso da empresa;
- redefina a senha quando necessário e revise dispositivos ativos.

### Upload

- limite de 8 MB;
- formatos JPEG, PNG, WebP, HEIC ou HEIF;
- confirme bucket, credenciais e permissões;
- armazenamento local não é adequado para produção.

### Reenvio ou clique duplicado

O servidor aplica deduplicação e travas transacionais em pedidos, chamados, músicas, reservas, enquetes, quizzes, avaliações e fidelidade. Webhooks financeiros continuam exigindo idempotência própria do provedor.

## Retenção e privacidade

- sessões de visitantes expiradas são removidas após `EXPIRED_GUEST_RETENTION_DAYS`;
- auditoria é mantida por `AUDIT_RETENTION_DAYS`;
- IP não é armazenado puro: a auditoria usa HMAC com `AUDIT_IP_SALT`;
- mídias rejeitadas e metadados órfãos são limpos;
- exporte a organização antes de exclusão definitiva;
- trate separadamente os objetos do bucket S3.

## Backup, restauração e encerramento

Consulte `BACKUP_RESTORE.md` e `COMMERCIAL_SETUP.md`. Nenhum ambiente deve receber cliente pagante antes de uma restauração testada em banco separado. Use os comandos de exportação e exclusão controlada para portabilidade ou encerramento contratual.
