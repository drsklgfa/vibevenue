# Módulos funcionais

## Vibe Music

- pedidos por link do YouTube;
- extração segura do ID;
- aprovação ou rejeição;
- voto único por visitante;
- ordenação por status e votos;
- controle do host: tocar, pausar, volume e troca;
- player visível na TV.

## Vibe Service

- chamados identificados por área/mesa;
- prioridades normal e alta;
- atribuição, resolução e cancelamento;
- histórico com horário e responsável.

## Vibe Menu & Orders

- categorias e itens disponíveis;
- preços em centavos;
- carrinho no cliente;
- validação dos produtos no servidor;
- cálculo do total no backend;
- transação PostgreSQL para pedido e itens;
- estados: novo, aceito, preparando, pronto, entregue e cancelado;
- deduplicação transacional de reenvios equivalentes.

## Vibe Games

- enquete ao vivo com voto atualizável;
- quiz com resposta única por visitante;
- contagem de respostas;
- criação pelo painel;
- exibição no portal e TV.

## Vibe Events

- publicação de eventos;
- capacidade;
- reserva por contato e tamanho do grupo;
- bloqueio quando não há vagas;
- contagem no painel.

## Vibe Loyalty & Campaigns

- conta de fidelidade por identificador do cliente;
- check-in diário;
- níveis visitante, frequente, VIP e embaixador;
- campanhas com validade;
- cupom de uso único por identificador estável do cliente;
- normalização de e-mail ou telefone no servidor.

## Vibe Media

- upload de imagem;
- limite de tamanho e tipos aceitos;
- rotação, redução e conversão WebP;
- fila de moderação;
- mural aprovado no portal e modo TV.

## Vibe Analytics

- visitantes ativos;
- chamados e pedidos pendentes;
- músicas aguardando aprovação;
- reservas do dia;
- satisfação média;
- interações diárias;
- distribuição por área;
- histórico recente de avaliações e fidelidade.

## Vibe Network

- múltiplas unidades;
- criação de estabelecimentos;
- criação de áreas/mesas;
- QR Code individual;
- papéis administrativos;
- auditoria de alterações.

## Integrações comerciais futuras

A arquitetura está pronta para conectores, mas estes exigem credenciais, contratos e regras externas:

- gateway de pagamento;
- POS/ERP/cardápio existente;
- WhatsApp Business;
- Google Wallet;
- e-mail transacional;
- streaming musical comercial licenciado;
- ferramentas de monitoramento e CRM.


## Ativação por unidade

Cada módulo é habilitado na lista `venues.modules`. A aplicação valida essa lista no portal, painel, API e Socket.IO. Desativar um módulo impede novas ações e remove seus dados dos snapshots entregues à interface, sem apagar o histórico do banco.
