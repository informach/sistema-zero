---
status: resolved
file: packages/studio/src/components/preview/PythonProjectPlayer.tsx
line: 115
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Player público descarta a saída do programa Python

## Review Comment

`PythonProjectPlayer` conecta o controller e trata falha/estado/input, mas ignora todos os eventos `console` e não possui uma superfície de saída. O frame também só materializa gráficos quando Turtle está instalado. Assim o núcleo Programação Python, que deve funcionar independentemente de Turtle, executa `print()` numa página branca; num jogo textual com `print`/`input`, o visitante vê a pergunta do formulário, mas perde as instruções anteriores e o resultado depois de responder. Não há outro consumidor de stdout na página pública Kids. O editor possui sua própria projeção de console, que não participa desse player leve.

Reprodução independente em `packages/studio/.cache/review054-player.test.tsx`, último teste, usando PythonProjectPlayer/controller/identidades reais e provider inferior inerte: após estado running, emitir stdout `Pensei num número.`, input-request, enviar42, emitir stdout `Você ganhou!` e completed. O formulário recebe e envia a resposta, porém nenhuma mensagem aparece; após completed o texto DOM do player está vazio. Fonte permanece exata. `bun test ./.cache/review054-player.test.tsx`, em `packages/studio`: 5 pass, 0 fail, 38 verificações, exit0, sem avisos. O teste de reprodução afirma o defeito observado; não é execução CPython/browser.

Adicionar saída textual acessível e limitada por execução para stdout/stderr, preservando ordem/quebras e indicando omissões. Reiniciar/trocar revisão deve limpar somente a sessão correspondente, e eventos tardios não podem contaminar a próxima partida. Mostrar output não deve carregar o console de autoria, Monaco, LSP ou oferecer REPL. Cobrir pelo menos print-only e um jogo input+print até o resultado final, além do comportamento com Turtle.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente. O player renderiza stdout/stderr como texto numa superfície acessível, com buffer limitado e indicação de omissões; saída é preservada no input/conclusão e reiniciada por geração, sem console de autoria. Cache `packages/studio/.cache/review054-player.test.tsx` foi convertido para exigir instruções e resultado do jogo input+print; prova adicional captura callbacks antigos e output ainda no timer, troca a revisão e confirma que somente a saída atual aparece. `bun test ./.cache/review054-classic-history.test.tsx ./.cache/review054-player.test.tsx`: 9 pass, 0 fail, 61 verificações, exit0, sem avisos. Suíte permanente de seis arquivos: 53 pass, 0 fail, 319 verificações; inclui print-only, input+print, flood/omissões, texto sem HTML, troca de revisão e lifecycle. Biome de oito implementações relacionadas passou exit0 após formatação do implementador. Provas DOM usam controller e identidades reais com provider inferior inerte, não CPython/browser. Nenhuma produção modificada pelo revisor.
