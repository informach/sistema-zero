---
status: resolved
file: packages/members/src/domain/studio/project-policy.ts
line: 81
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Análise inerte exige dependências prontas para executar

## Review Comment

`createStudioRuntimePolicy.authorize` chama a política compartilhada antes de distinguir a operação. O ramo Python de `project-policy.resolve` exige hash exato de `requirements.txt` e dependências aptas à execução/publicação também quando `operation` é `analyze`. O reader mantém deliberadamente o requirements em edição com o lock anterior, e o analisador recebe fonte como dados, sem executar imports ou instalar pacotes. Reutilizar a mesma regra impede análise durante uma edição permitida, mesmo que nenhum pacote tenha sido solicitado.

Reprodução independente no mesmo harness `.cache/studio-python-l0/review044-runtime-boundaries.ts`, exit 0: o projeto inicialmente autorizado recebe somente `# anotacao em edicao\n` em `requirements.txt`, conservando o lock de arquivo vazio. `refinePythonProjectDocument` aceita e preserva o trabalho; a chamada HTTP `operation: 'analyze'` retorna 400 com erro de correspondência de dependências. O caso não adiciona uma dependência externa, não altera a baseline nem a release.

Parametrizar a conferência compartilhada pelo propósito. Execução, publicação e REPL devem continuar exigindo dependências aprovadas e hash exato. Análise inerte pode operar sobre arquivos em edição, mantendo autorização do ator, contexto, ambiente, extensões e distribuição, sem resolver/instalar dependências e sem reutilizar essa decisão para executar. Acrescentar casos de comentário/declaração em edição: análise permitida, execução e publicação recusadas, nenhuma mutação do documento/lock.

## Triage

- Decision: `FIXED`
- Notes: A política compartilhada recebe explicitamente se deve validar dependências. `analyze` dispensa essa conferência e filtra o resultado para `edit`/`export-source`; execução, publicação e REPL mantêm a conferência. Aprovação do ambiente/extensões, status da release e autorização contextual continuam obrigatórios. O revisor não alterou produção; providers/LSP ainda não são declarados concluídos neste recorte.

## Revalidation

- `bun .cache/studio-python-l0/review044-runtime-revalidate.ts` — execução independente, exit 0, sem avisos. Tanto um comentário novo quanto `requests==2.0.0` em `requirements.txt`, mantendo o lock anterior, são preservados pelo reader e recebem 200 em `analyze`, com capacidades exatamente `['edit', 'export-source']`. Os mesmos assuntos recebem 400 em `execute` e `python-repl`; a política real de publicação também os recusa. Nenhum documento ou lock é alterado pela autorização.
- `bun test tests/unit/studio-runtime-hosts.test.ts tests/integration/studio-runtime.test.ts tests/unit/studio-authoring-policy.test.ts tests/integration/studio-authoring.test.ts`, em `packages/members` — 21 pass, 0 fail, 201 verificações, exit 0. O teste permanente cobre análise com comentário/dependência em edição e execução recusada, junto à regressão da publicação e da autorização contextual.
- A permissão de análise não instala pacotes nem certifica que o programa execute. A execução do analisador/LSP com essa decisão será verificada quando a conexão dos hosts entrar no escopo.
