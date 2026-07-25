# GitHub Pages — demonstração visual de portfólio

O repositório inclui o workflow `.github/workflows/pages.yml`, responsável por publicar o frontend em:

```text
https://drsklgfa.github.io/vibevenue/
```

## Ativação única no GitHub

1. Abra o repositório `drsklgfa/vibevenue`.
2. Entre em **Settings → Pages**.
3. Em **Build and deployment**, selecione **GitHub Actions** como fonte.
4. Abra **Actions → portfolio-pages**.
5. Execute **Run workflow** ou faça um novo push na branch `main`.

## Como a demonstração funciona

O workflow define:

```text
NEXT_PUBLIC_BASE_PATH=/vibevenue
NEXT_PUBLIC_PORTFOLIO_MODE=true
NEXT_PUBLIC_DISABLE_SERVICE_WORKER=true
```

O build gera um export estático em `apps/web/out`, preparado para o subdiretório do GitHub Pages. A demonstração possui dados ilustrativos e permite alternar entre:

- painel administrativo;
- experiência do cliente;
- modo TV.

Nenhum banco, Redis, S3, e-mail ou segredo é necessário para a demonstração visual. A aplicação SaaS completa continua exigindo backend e infraestrutura próprios.

## Diagnóstico

Se o site retornar 404:

- confirme que a fonte do Pages está definida como **GitHub Actions**;
- confirme que o workflow `portfolio-pages` ficou verde;
- aguarde a criação do ambiente `github-pages`;
- abra a URL exibida no job `Deploy portfolio`.
