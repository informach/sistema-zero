# Auditoria completa — Chuva de Meteoros e extensão Jogo 2D

**Data:** 2026-08-14
**Escopo:** `packages/studio/src/official-extensions/game-2d`, integrações de IR/Blockly/gerador/parser usadas pela extensão e o exemplo **Chuva de Meteoros**.
**Versão observada no worktree:** `0.78.1`

> O worktree já continha alterações concorrentes e não commitadas na extensão durante esta auditoria. Este relatório não atribui autoria a essas alterações e nenhuma fonte de produção foi modificada como parte da revisão.

## Parecer executivo

O exemplo **Chuva de Meteoros está funcional e coberto de ponta a ponta**. Não é necessário adicionar, remover ou mudar a interface de nenhum bloco da extensão para esse jogo funcionar corretamente.

Foi identificado um problema real, de alcance geral na extensão, na semântica interna do bloco de recarga/cooldown. A implementação anterior consumia a recarga por quantidade de chamadas ao bloco, em vez de por quadros simulados. Isso podia impedir eventos acionados por borda de voltarem a disparar. O worktree passou a usar um prazo absoluto baseado em `_frameStamp`; a correção está presente na versão `0.78.1` observada e foi validada com testes repetidos e com a suíte completa.

A divergência de baixa prioridade encontrada no código-fonte canônico também foi resolvida. Chuva de Meteoros informava margem `80` para remover meteoros fora da tela, embora o bloco/IR não exponha margem e o gerador JavaScript sempre emita `40`. A busca completa encontrou o mesmo drift, com margem `60`, em Sobrevivente. Os dois fontes agora usam `40`, o contrato compartilhado dos exemplos compara fonte e código gerado, e o parser mantém valores não representáveis como código avançado em vez de alterar silenciosamente a semântica.

## Inventário e arquitetura

| Item | Resultado |
| --- | ---: |
| Arquivos TypeScript no diretório da extensão | 149 |
| Módulos de produção | 74 arquivos / 44.563 linhas |
| Arquivos de teste | 58 arquivos / 21.608 linhas |
| Arquivos geradores `__gen_*` | 17 |
| Definições de blocos | 283 |
| Blocos visíveis | 276 |
| Blocos ocultos/legados | 7 |
| Blocos repórter | 50 |
| Blocos de instrução | 233 |
| Chaves públicas da API de runtime | 280 |
| Exemplos registrados | 33 |

A extensão tem uma fonte canônica de catálogo de blocos, dividida por fundamentos, interação, grupos, kits, mundos e blocos clássicos. `blocks.ts` deriva a caixa de ferramentas colorida desse catálogo. O runtime é composto por fragmentos modulares e sua API pública é gerada a partir do inventário do contrato de runtime.

O pipeline de cada bloco visível é auditado automaticamente em quatro direções:

1. definição → IR válido, sem `rawJS`;
2. IR → Blockly → IR estável;
3. IR → JavaScript, com todos os helpers presentes no runtime;
4. JavaScript → IR estável.

As opções de todos os campos dropdown também fazem parte dessa auditoria.

Não foram encontrados módulos de produção sem importadores, exports mortos com confiança suficiente para remoção, duplicações críticas, `any`, `@ts-ignore`, `@ts-expect-error` ou marcadores `TODO/FIXME/HACK` no escopo de produção.

O único ciclo estático observado é:

`src/ir/schema.ts` → `official-extensions/game-2d/classicIR.ts` → `src/ir/schema.ts`

O retorno de `classicIR.ts` é somente `import type`, portanto é apagado na compilação e não constitui ciclo de runtime.

## Revisão do exemplo Chuva de Meteoros

### Fluxo do jogo

| Área | Comportamento verificado |
| --- | --- |
| Inicialização | Canvas 480 × 300, ajuste à tela em 100%, nave posicionada em `(216, 230)` e hitbox em 75%. |
| Início | `Enter` ou `Espaço` inicia a partida. |
| Movimento | Setas e WASD, movimento superior em quatro direções normalizado e limite nas bordas. |
| Tiro | `Espaço` cria laser para cima; a API converte corretamente centro/raio para a posição interna. |
| Meteoros | Criação periódica a cada 0,5 s apenas durante `jogando`, com posição, tamanho e velocidades variadas. |
| Dificuldade | Velocidade aumenta a cada 6 s até o limite 4. |
| Pontuação | `+1` por segundo e `+2` por meteoro destruído. |
| Colisões | Laser × meteoro remove ambos; nave × meteoro encerra a partida. |
| Reinício | O estado é reconstruído sem conservar entidades ou temporizadores da rodada anterior. |
| Apresentação | Campo de estrelas, áudio e partículas; o ciclo de vida desenha as partículas uma vez após os loops. |
| Acessibilidade | Canvas acessível e controles apresentados no fluxo E2E. |

Os testes de playthrough exercitam movimento, tiro, destruição, temporizador de pontos, colisão/derrota e reinício, sem erros ou avisos de runtime. O teste de navegador abre o card na galeria, renderiza o primeiro quadro e valida o canvas e os controles.

## Achados

### G2D-01 — Recarga era consumida por chamadas, não por quadros

**Severidade:** alta para jogos que combinam cooldown com eventos de borda
**Estado:** corrigido no worktree observado (`0.78.1`)
**Confiança:** alta

Na implementação anterior, cada chamada a `cooldownReady` decrementava um contador. Um bloco avaliado somente no quadro em que uma tecla era pressionada podia nunca completar sua recarga, pois deixava de ser chamado nos quadros seguintes.

A implementação atual em `runtime/utilities.ts` registra um prazo absoluto (`_frameStamp + duração`) e compara esse prazo com o quadro atual. Isso preserva recargas independentes por ID de bloco, avança no tempo de simulação e respeita a pausa. A suíte de **Duelo de Heróis**, que cobre o cenário de evento por borda, passou repetidamente após a estabilização dessa alteração.

**Ação recomendada:** manter a correção de runtime, testes e sincronização de versão/documentação como uma mudança coerente. Não é necessária mudança visual ou estrutural no bloco.

### G2D-02 — Margens não representáveis eram descartadas pelo parser

**Severidade:** baixa
**Estado:** resolvido
**Confiança:** alta

O fonte canônico `__gen_chuvaDeMeteoros.ts` chamava `pruneOffscreen` com margem `40` para tiros e `80` para meteoros. A varredura completa encontrou também margem `60` em `__gen_sobrevivente.ts`. Porém:

- o nó `g2d:pruneOffscreen` em `src/ir/schema.ts` não possui campo de margem;
- o parser em `src/parsers/js.ts` ignora o terceiro argumento;
- o bloco em `blockCatalogGroups.ts` não possui entrada de margem;
- o gerador em `src/generators/js.ts` sempre emite margem `40`.

Consequentemente, o programa compilado usava `40` nos dois grupos. Essa margem remove o meteoro apenas depois que ele já saiu da área visível e não prejudica a partida.

**Resolução aplicada:** o fonte canônico de Chuva de Meteoros foi alterado de `80` para `40` e seu comentário documenta a margem fixa. O fonte canônico de Sobrevivente, encontrado pela varredura do mesmo padrão, foi alterado de `60` para `40`. O parser agora só produz `g2d:pruneOffscreen` quando o terceiro argumento é literalmente `40`; outro valor permanece como `rawJS`, preservando o programa no modo Código. O harness compartilhado confere a margem de todos os exemplos contra o JavaScript realmente gerado pelos blocos.

Adicionar um socket/campo de margem ao bloco e ao IR continua desnecessário enquanto a intenção de produto for oferecer essa operação com uma margem pedagógica fixa.

## Verificação final

Todos os comandos abaixo foram executados novamente sobre o snapshot final observado:

| Verificação | Resultado |
| --- | --- |
| Suíte completa de `game-2d` após as correções | **1.607 passaram, 0 falharam**, 46.219 asserções, 58 arquivos executados |
| Contratos/playthroughs focados em Chuva, cooldown e runtime | **26 passaram, 0 falharam**, 185 asserções |
| Parser Jogo 2D | **49 passaram, 0 falharam**, 262 asserções |
| TypeScript `tsc --noEmit` do Studio | Não concluiu por uma alteração concorrente fora do escopo em `game-2d-advanced/__tests__/reinoZeroProPlaythrough.test.ts:38` (campanha sem `version`); o `runtimeTypecheck` da Jogo 2D passou **4/4** |
| Biome nos arquivos alterados | **8 arquivos verificados, sem correções** |
| Playwright/Chromium — card Chuva de Meteoros | **1 passou** |
| Testes adicionais de integração da extensão | **52 passaram, 0 falharam**, 237 asserções |
| `git diff --check` no escopo | **passou** |

A suíte completa precisou ser executada localmente com `--timeout 20000` porque havia suítes antigas de outro trabalho consumindo CPU no ambiente compartilhado. O timeout configurado no projeto não foi alterado; os testes de regressão focados passaram com o limite padrão.

## Conclusão

**Chuva de Meteoros pode permanecer com o conjunto atual de blocos.** O fluxo principal, as conversões Blockly/IR/JavaScript, o runtime, o reinício e a execução em navegador estão coerentes e verdes.

O escopo foi fechado com as seguintes garantias:

1. recarga baseada em `_frameStamp`, coberta pelo playthrough;
2. fontes canônicos alinhados à margem fixa `40`, sem ampliar o bloco;
3. parser sem perda silenciosa para margens não representáveis;
4. testes de playthrough, auditoria de blocos e contrato dos exemplos como barreiras de regressão.
