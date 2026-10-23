---
status: resolved
file: packages/studio-language-service/runtime/pyright.ts
line: 162
severity: high
author: claude-code
provider_ref:
---

# Issue 005: Alinhar a raiz de imports da análise com a execução

## Review Comment

A sessão Pyright usa a raiz do workspace, enquanto o executor Python coloca o diretório do entrypoint em `sys.path[0]`. O protocolo da análise não carrega entrypoint/raiz de imports; a identidade e invalidação da sessão dependem apenas dos arquivos e do projeto. Assim, navegação, diagnóstico e operações de símbolo podem analisar um módulo diferente do executado. O fallback local do Pyright acrescenta outra divergência dentro de subpacotes.

Prova real: `src/main.py` contém `from helper import value; print(value)`, `helper.py` define `value="ROOT"` e `src/helper.py` define `value="SRC"`. CPython 3.14.2 imprime `SRC`; Pyright aponta a definição para `helper.py` da raiz. Renomear `value` para `new_value` pela resposta real de Pyright altera esse arquivo errado e os dois usos em main, mas deixa `src/helper.py` intacto: o programa passa a falhar com `ImportError`. Sem o helper de src, Pyright ainda apresenta diagnóstico vazio e definição na raiz, mas a execução falha com `ModuleNotFoundError`.

Dentro de `src/pkg/child.py`, importado pelo main de src, a divergência também ocorre. Se existem `src/helper.py` e `src/pkg/helper.py` sem o arquivo da raiz, o Pyright usa o irmão de child, enquanto o runtime importa o helper de src. Portanto acrescentar apenas extraPaths não comprova equivalência.

Transportar e validar o contexto de execução como parte do snapshot/identidade da análise; configurar a resolução para refletir a raiz efetiva, incluindo tratamento explícito do fallback local, ou recusar operações que não possam provar a origem. Mudança do entrypoint deve invalidar respostas/sessão mesmo quando nenhum texto mudou. Preservar as regras atuais do runtime e não compensar com reescrita de fonte autoral.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente na implementação real: entrypoint validado no sync, cliente imutável por configuração, guard da sessão antes/depois do await e workspace Pyright enraizado no diretório executável. A conexão recusa trocar entrypoint antes de alterar FS. O fallback estático local do Pyright continua uma limitação documentada para programas cuja importação já falha no runtime; esta revisão não promete equivalência de toda análise estática.

## Verification

- `bun .cache/studio-python-l0/review037-roots.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; cinco variantes com definição/diagnóstico Pyright reais e execução CPython isolada, impondo o mesmo diretório de entrypoint do executor.
- `bun .cache/studio-python-l0/review037-roots-rename.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; aplica as edições reais de renameSymbol. Assert confirma programa válido antes e `ImportError: cannot import name 'new_value'` depois; variações aninhadas exibem a mesma consequência. Processos de análise encerrados em finally.
- Integração de operações revisada sem outra falha confirmada: 13 testes/53 assertions (fileOperations + proWorkspaceOperations); Biome de oito arquivos limpo. Isso não qualifica toda a entrega L5.

## Preliminary direction check (cache only)

- `bun .cache/studio-python-l0/review037-rooted-cases.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; cópia temporária do processo com workspaceUri enraizada em `src`, sem alterar produção. Os três programas válidos antes quebrados agora mantêm a saída após rename. Os dois casos que importavam somente um helper externo à raiz passam a reportMissingImports. Dois pares `.py/.pyi` (módulo e pacote) mantêm execução porque Pyright renomeia ambas as declarações; essa hipótese adicional não virou achado.
- A prova apoia a direção de corrigir a raiz e preservar a limitação estática documentada. Naquela etapa, o protocolo/cliente/epoch da implementação real ainda aguardava a revalidação registrada abaixo.

## Independent production revalidation

- `bun .cache/studio-python-l0/review037-production-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0. Usa o processo real (nenhuma cópia de runtime): sete variantes com CPython/Pyright, definições da raiz correta, rename e execução antes/depois, pares módulo/stub e pacote/stub. Nos sete casos, tentativa de sync com outro entrypoint e alterações de fonte retorna stale-document sem escrever novos arquivos nem alterar a revisão anterior.
- `bun test ./.cache/studio-python-l0/review037-editor-entrypoint.test.ts`: 1 pass/0 fail, exit 0. Modelo Monaco PieceTree real e transporte controlado; entrypoint muda sem alterar o texto e antes de render React; resposta tardia e próximo pedido são recusados, sem novo dispatch.
- `bun test tests/import-root.test.ts tests/concurrency.test.ts` em studio-language-service: 6 pass/0 fail, 28 assertions, exit 0. Inclui boot/queue cancellation, ordenação de syncs e preservação de revisão após recusa de outro entrypoint.
- `bun test src/python/language/client.test.ts src/python/language/fileOperations.test.ts src/state/proWorkspaceOperations.test.ts` em Studio: 17 pass/0 fail, 67 assertions, exit 0.
- `bun test src/studio/python-language.test.ts` em Core: 5 pass/0 fail, 52 assertions, exit 0. Biome dos sete arquivos de produção/teste revisados limpo, sem correções.
- Escopo: fecha a causa037/005 e sua integração de identidade. Não qualifica todo L5, browser, Docker ou deploy.
