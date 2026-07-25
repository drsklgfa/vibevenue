# Resposta a incidentes

## Severidade

- **SEV-1:** vazamento cross-tenant, plataforma/identidade comprometida, perda ampla, ransomware ou domínio desviado;
- **SEV-2:** conta de tenant comprometida, indisponibilidade extensa, upload perigoso ou restore falho;
- **SEV-3:** abuso limitado, degradação preventiva ou vulnerabilidade sem exploração/dado real.

## Processo

1. declarar incidente, severidade, líder e horário;
2. conter sem destruir evidência;
3. preservar logs, request IDs, releases, banco, bucket e decisões;
4. revogar sessões/secrets afetados;
5. identificar tenants, dados e período;
6. corrigir e criar teste negativo;
7. restaurar/reconciliar quando necessário;
8. avaliar comunicação legal e contratual;
9. realizar pós-incidente e atualizar ameaças, riscos e controles.

## Runbooks

Use [`runbooks/INDEX.md`](runbooks/INDEX.md). Cada procedimento define gatilho, responsáveis, passos, verificação, rollback, comunicação e evidências.

## Preparação externa

O proprietário precisa preencher contatos, fornecedores, canais alternativos, autoridade decisória, jurídico/privacidade, plantão e local seguro das credenciais de recuperação. Execute exercício tabletop antes de clientes reais e ao menos anualmente, além de após mudanças críticas.
