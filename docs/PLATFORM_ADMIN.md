# Administração da plataforma VibeVenue

Este documento descreve o console reservado ao proprietário da plataforma. Ele é diferente do painel de cada estabelecimento e não deve ser disponibilizado a clientes.

## Separação de acesso

A administração da plataforma usa:

- uma organização interna marcada com `is_platform_internal=true`;
- usuários exclusivos marcados com `is_platform_admin=true`;
- associação do administrador à organização interna com perfil `owner`;
- cookie administrativo `HttpOnly`, as mesmas proteções de origem e a mesma política de sessões do restante do painel;
- rotas `/api/platform/*`, que exigem simultaneamente sessão válida e identidade de plataforma dentro da organização interna.

A organização interna:

- não aparece na lista de clientes;
- não entra no cálculo de MRR;
- não recebe faturas ou notificações comerciais automáticas;
- não pode ser excluída pelo comando de encerramento de clientes;
- não pode ser alvo do reset de senha destinado aos clientes.

Use um e-mail exclusivo para o administrador da plataforma. O bootstrap recusa elevar uma conta que já pertença a um cliente.

## Primeiro administrador

Depois que a API aplicar as migrações no PostgreSQL, execute em um shell seguro do serviço:

```bash
npm run platform:bootstrap -- \
  --email administrador@seudominio.com \
  --name "Administrador VibeVenue"
```

O comando cria ou atualiza a organização interna, gera uma senha temporária forte, revoga sessões antigas e exige a troca da senha no primeiro acesso.

Também é possível fornecer uma senha inicial forte:

```bash
npm run platform:bootstrap -- \
  --email administrador@seudominio.com \
  --name "Administrador VibeVenue" \
  --password "SENHA_FORTE_TEMPORARIA"
```

A senha exibida deve ser copiada uma única vez, entregue por canal seguro e descartada depois da troca.

## Acesso ao console

Abra:

```text
https://app.seudominio.com/?admin=1
```

Entre com o administrador da plataforma. Após a troca obrigatória da senha, o sistema abre automaticamente o console interno, sem misturá-lo ao painel dos estabelecimentos.

## Funções disponíveis

### Visão geral

- total de clientes;
- clientes ativos, em teste, inadimplentes, suspensos ou cancelados;
- receita mensal recorrente cadastrada;
- faturas abertas e vencidas;
- pagamentos registrados nos últimos 30 dias.

### Clientes

- criação transacional de empresa, proprietário, primeira unidade, área principal e estado de reprodução;
- escolha do plano, mensalidade, teste e limites contratados;
- exibição única da senha temporária e do endereço inicial do estabelecimento;
- alteração posterior de nome, e-mail de cobrança, plano, preço e limites;
- mudança de situação comercial;
- reset seguro da senha do proprietário.

A redução de limites é bloqueada quando o uso atual do cliente já excede o novo contrato. Primeiro reduza o uso de forma controlada; depois aplique o plano menor.

### Faturas

- emissão manual de cobrança;
- referência, valor, vencimento, período e observações;
- registro de pagamento manual;
- cancelamento de cobrança incorreta;
- reconciliação posterior pela manutenção para inadimplência e reativação.

O livro interno é independente de gateway. Integrações futuras com PIX ou cartão devem validar assinatura do webhook, origem, valor, moeda, identificador externo e idempotência antes de marcar uma fatura como paga.

### Segurança

- troca da própria senha;
- revisão de dispositivos conectados;
- encerramento de uma sessão específica;
- encerramento de todas as outras sessões.

## Operação segura

- mantenha no mínimo duas contas internas individuais para continuidade, sem compartilhar senhas;
- conceda acesso somente a pessoas autorizadas a visualizar contratos e cobrança;
- use gerenciador de senhas e MFA no provedor de infraestrutura, GitHub e e-mail;
- registre pagamentos somente após confirmação real;
- nunca envie senha temporária em canal público;
- revise a auditoria e o protocolo `x-request-id` ao investigar falhas;
- faça backup antes de alterações em massa ou exclusões;
- teste restauração em banco separado.

## Recuperação do administrador da plataforma

O reset de clientes, por desenho, não alcança contas internas. Em caso de perda de acesso, execute novamente `platform:bootstrap` com o mesmo e-mail da conta interna. O comando redefine a senha, força nova troca e revoga as sessões anteriores.
