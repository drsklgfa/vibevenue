# Casos de abuso

| ID | Ator | Abuso | Resultado esperado do sistema | Evidência atual |
|---|---|---|---|---|
| AB-01 | usuário de tenant A | consultar ID do tenant B | 404/403 sem indicar existência | filtros por organização; testes completos pendentes |
| AB-02 | operador | alterar equipe/plano | 403 | `requireRole` e console separado |
| AB-03 | visitante | enviar muitas imagens | 429 e limite de 8 MB/1 arquivo | limitadores locais + Multer |
| AB-04 | visitante | votar/reservar repetidamente | operação deduplicada | chaves únicas/travas |
| AB-05 | atacante | brute force de login | resposta genérica e bloqueio temporário | dummy hash + lockout |
| AB-06 | script externo | usar cookie admin sem Origin | 403 em métodos mutáveis | `requireAdmin` |
| AB-07 | cliente suspenso | usar sessão já aberta | sessão rejeitada | condição comercial na autenticação |
| AB-08 | suporte | redefinir admin interno pelo fluxo de cliente | operação negada | proteção da organização interna |
| AB-09 | invasor com token antigo | continuar após inatividade | sessão apagada/rejeitada | Checkpoint 07 |
| AB-10 | atacante com hash de token | reutilizar valor | inviável sem token; HMAC com pepper em produção | Checkpoint 07 |
| AB-11 | usuário compartilhado | abrir PWA após outro visitante | token antigo não persiste após fechar aba | `sessionStorage` |
| AB-12 | upload malicioso válido como imagem | explorar parser | Sharp limita pixels e reencoda | antivírus/quarentena pendentes |
| AB-13 | dependência comprometida | entrar no build | pipeline deve bloquear | SCA/SBOM pendentes |
| AB-14 | admin plataforma | exclusão/alteração crítica acidental | confirmação, auditoria e step-up | step-up pendente |
