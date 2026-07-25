# Checklist obrigatório do proprietário

## Contas

- [ ] MFA/passkey ativado no GitHub, Render/cloud, DNS, storage e e-mail;
- [ ] contas individuais, menor privilégio e códigos de recuperação guardados;
- [ ] computador administrativo atualizado, criptografado e sem compartilhamento.

## GitHub

- [ ] CODEOWNERS real;
- [ ] branch `main` protegida, PR e checks obrigatórios;
- [ ] force push/exclusão bloqueados;
- [ ] environments `staging` e `production` com aprovação;
- [ ] secret scanning, Dependabot, dependency review e CodeQL ativos;
- [ ] workflow `quality` verde no commit da produção.

## Infraestrutura

- [ ] staging e produção totalmente separados;
- [ ] PostgreSQL/Redis privados, persistentes e TLS;
- [ ] S3 privado, criptografado, versionado e sem acesso público;
- [ ] ClamAV privado e saudável;
- [ ] domínio, HTTPS e e-mail autenticado;
- [ ] WAF/CDN e limites de custo avaliados.

## Produto

- [ ] verificador commercial aprovado sem imprimir secrets;
- [ ] demo/seed/aut migrate desligados;
- [ ] administrador da plataforma com MFA;
- [ ] dois tenants de homologação sem acesso cruzado;
- [ ] recuperação e avisos de segurança recebidos;
- [ ] upload limpo/inválido testados;
- [ ] modo somente leitura e revogação emergencial exercitados.

## Continuidade

- [ ] backup automático externo;
- [ ] chave de backup guardada separadamente;
- [ ] restore real em destino separado;
- [ ] RPO/RTO medidos e aprovados;
- [ ] bucket restaurável e consistente com o banco;
- [ ] rollback de aplicação e migration ensaiado.

## Monitoramento e incidente

- [ ] alertas de disponibilidade, latência, erros, login, upload, cobrança, storage e backup;
- [ ] contatos e escalonamento testados;
- [ ] `security.txt` com endereço real;
- [ ] tabletop de incidente realizado;
- [ ] retenção dos logs definida.

## Jurídico e independente

- [ ] política, termos, contratos, bases legais, retenção e fornecedores aprovados;
- [ ] pentest independente concluído;
- [ ] achados críticos/altos corrigidos e retestados;
- [ ] riscos residuais aceitos formalmente;
- [ ] cliente piloto autorizado.
