# GitHub e Render — configuração externa

## GitHub

1. envie o conteúdo para repositório privado;
2. substitua `@OWNER_GITHUB` em `.github/CODEOWNERS`;
3. crie ruleset para `main` exigindo PR, aprovação, Code Owners, resolução de conversas e checks;
4. bloqueie force push e exclusão;
5. crie environments `staging` e `production`, com aprovação humana;
6. ative dependency graph, Dependabot, secret scanning/push protection, code scanning e private vulnerability reporting quando disponíveis;
7. deixe `quality` verde antes de merge/deploy;
8. habilite `ENABLE_ARTIFACT_ATTESTATION=true` apenas quando a conta/repositório suportar a atestação desejada.

## Render

- use `render.staging.example.yaml` e `render.production.example.yaml` como modelos separados;
- não administre o mesmo recurso em Blueprints diferentes;
- cadastre variáveis `sync: false` diretamente no dashboard;
- não coloque secrets no YAML;
- use banco/Redis privados, sem allowlist pública;
- use `AUTO_MIGRATE=false`; migrations rodam em `preDeployCommand`;
- configure URLs HTTPS exatas e bucket/ClamAV/e-mail;
- valide `/ready` e logs antes de promover.

## Verificação

- push direto em `main` bloqueado;
- PR sem `quality` verde não mescla;
- produção exige aprovação;
- staging não acessa recursos de produção;
- secrets não aparecem no Git, Blueprint ou logs;
- rollback e restore testados.
