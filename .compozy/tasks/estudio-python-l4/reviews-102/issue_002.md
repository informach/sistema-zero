---
status: resolved
file: packages/core/src/studio/python-builder-types.ts
line: 127
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Workspace parcial recebe passed para a revisão completa

## Review Comment

O cliente filtra os arquivos pelo perfil isPythonLanguageSourcePath e depois associa o resultado projectDiagnostics à revisão de execução inteira. O contrato portátil do projeto admite fontes .py/.pyi em diretórios como venv/site-packages que o perfil de análise exclui. Esses arquivos continuam no CAS e no metadata de execução, mas não entram no sync; assim, um resultado sem erros pode certificar passed sem ter analisado toda a fonte Python da revisão.

Reprodução independente `packages/members/.cache/review102-types-source-coverage.test.ts` com PythonLanguageSession e Pyright REAIS locais: projeto canônico contém `n: int = "wrong type"` em src/typed.py (controle) ou venv/typed.py. Controle é sincronizado e recebefailed. Variantevenv aparece no metadata de execução, é omitida do sync (somente src/main.py+src/helper.py enviados) e retorna types.status=passed.1pass1fail/7asserts exit1, expectedfailed/receivedpassed. NativeNode/Pyright e filesystem temporário reais; fetchport controlado para transportar protocolo, não DO/SDK/Cloudflare nem HTTP real nesse probe. Sessão é disposed no finally; nenhum arquivo Python do aluno é executado.

Antes de abrir a sessão, recusar ou marcar indisponível/incompleto qualquer arquivo Python do pacote que o perfil não possa analisar. Não ampliar silenciosamente o perfil do editor nem remover a fonte da identidade de execução. Só certificar passed quando todo arquivo .py/.pyi da revisão estiver coberto; quotas e diagnósticos truncados continuam failclosed.

## Triage

- Decision: `VALID`
- Notes: Resolvido após confirmação e revalidação independente. Preflight recusa toda fonte.py/.pyi não admitida pelo perfil antes de montar sync/open. Mesmo próprio probe mantém erro de tipos e metadata contendo venv/typed.py, agora exige unavailable e zero requests; controle src/typed.py ainda usa PyrightREAL e retornafailed. Próprioscoverage+responseownership+permanentes29pass0fail/76asserts exit0, incluindo venv/typed.py, src/venv/typed.py, site-packages/typed.pyi, quota/diagnostics100/cancel/latecleanup e doisTCPPyrightreais. Biome2exit0nofixes. Perfil do editor e fonte/recipeexec não foram ampliados/removidos. Revisor alterou apenas probes/docs, não produção/permanentes; nenhumTSC/Docker/browser/SQL. Provas nativas locais não qualificam DO/SDK/produção. Não confundir com101 nem novo recorte B2.3 de lease.
