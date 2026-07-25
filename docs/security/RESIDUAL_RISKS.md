# Riscos residuais e limites da garantia

1. nenhum software conectado à internet possui risco zero;
2. o código não controla a segurança das contas, DNS, computadores ou fornecedores do proprietário;
3. a ausência de RLS não é tratada como falha automática: o produto usa autorização explícita e testes cross-tenant, mas regressões continuam sendo risco relevante;
4. ClamAV reduz risco de malware, mas não detecta todas as ameaças;
5. CSP ainda permite estilo inline por compatibilidade com o framework;
6. backups preservam dados durante a retenção definida e precisam de acesso rigoroso;
7. e-mail pode ser alvo de comprometimento; MFA e recuperação devem ser testados;
8. WAF, DDoS, alertas e disponibilidade dependem do provedor;
9. SBOM/SAST/SCA não substituem pentest e revisão humana;
10. a homologação só vale para o commit, infraestrutura e configuração efetivamente testados.
