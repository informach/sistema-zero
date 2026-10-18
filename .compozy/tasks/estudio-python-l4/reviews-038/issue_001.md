---
status: resolved
file: packages/studio/src/python/language/fileOperations.ts
line: 108
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Compilar o candidato antes de aprovar a renomeação

## Review Comment

A validação dos candidatos utilizava somente ast.parse. Essa função pode produzir uma AST sem diagnóstico para programas que o compilador CPython rejeita durante a construção das tabelas de símbolos. A renomeação era apresentada como validada embora transformasse código executável em SyntaxError.

Três provas independentes com Pyright real, createPythonFileOperations e parser CPython 3.14.2: renomear b para a em def f(a,b) resulta em parâmetro duplicado; renomear parâmetro x para y quando o corpo contém global y ou nonlocal y também é aceito pelo parser, mas recusado por compile. Os programas originais imprimiam 3/12/12; todos os candidatos aprovados falhavam antes de executar.

Acrescentar uma verificação de compilação sem executar a fonte, isolada no worker e limitada pelo protocolo existente, antes de oferecer o diff. O parse normal do editor deve continuar aceitando AST parcialmente válida para permitir edição. A resposta precisa comprovar que a opção de compilação foi atendida, para não aceitar silenciosamente um runtime antigo.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente. A opção compilable atravessa controller/session/request, compile(AST) verifica tabelas de símbolos sem execução e a sessão exige confirmação positiva. O parse comum permanece disponível para editar AST ainda não compilável.

## Verification

- `bun .cache/studio-python-l0/review038-compile.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0 antes da correção. Três operações reais Pyright e validateRename aceitas; CPython executa os originais e rejeita os candidatos com duplicate argument, parameter and global, parameter and nonlocal. As árvores originais permanecem idênticas.
- Hipótese adicional de perda de referências NFKC foi refutada: Kelvin K/K e café/cafe+combining são renomeados integralmente pelo Pyright; não foi registrada como issue.

## Independent revalidation

- `bun .cache/studio-python-l0/review038-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; mesmos três repros, com Pyright real e createPythonFileOperations real. O transporte controlado encaminha o quarto argumento compilable ao CPython nativo. Os candidatos inválidos agora são recusados; árvore original preservada.
- `bun .cache/studio-python-l0/review038-unicode-revalidate.ts .cache/studio-python-l0/cpython-3.14.2/python.exe`: exit 0; Kelvin K/K e acento precomposto/combinante mantêm a saída após rename validado com compilação.
- `bun test ./.cache/studio-python-l0/review038-session-marker.test.ts`: 1 pass/0 fail, 6 assertions. Sessão real com peer MessageChannel controlado recusa resposta antiga sem confirmação, aceita confirmação verdadeira e conserva parse comum.
- `.cache/studio-python-l0/cpython-3.14.2/python.exe -I -B -X utf8 .cache/studio-python-l0/review038-no-exec.py`: exit 0. AST de edição normal preservada, modo compilável recusa escopo inválido; fonte com import inexistente, escrita de arquivo e raise é compilada sem qualquer efeito/execução.
- `bun test src/python/language/fileOperations.test.ts src/python/language/readResult.test.ts src/python/language/controller.test.ts src/python/language/client.test.ts`: 18 pass/0 fail, 80 assertions, exit 0. Biome dos nove arquivos do recorte: nenhum erro.
- Escopo: valida este guard e sua integração isolada; não anuncia conclusão de L5 ou equivalência semântica irrestrita de refatorações. Navegador não foi executado pelo revisor.
