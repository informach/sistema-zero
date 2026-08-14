# Remediação do full review do Pinta

## Objetivo

Corrigir os sete achados do relatório de 14/08/2026 sem alterar os contratos públicos do pacote nem sobrescrever o lote do Pathfinder ainda não commitado.

## Alternativas consideradas

### Persistência

1. **Aguardar o `flush` apenas no botão Voltar.** Mudança pequena, mas mantém o estado `dirty` oculto, a publicação prematura de mapas e o resync de revisão não confirmada.
2. **Transformar o editor em uma transação observável.** `dirty`, `saving`, `saved` e `error` passam pelo store; `flush` devolve sucesso/falha; asset principal e ligados chegam à galeria depois do `setMany`; o resync usa a revisão confirmada. Escolhida porque corrige a causa comum.
3. **Persistir cada gesto sem debounce.** Simplifica a saída, mas aumenta I/O e ainda exige coordenação de falhas concorrentes.

### Pathfinder

1. **Reduzir o limite de shapes.** Evita parte do freeze, mas contradiz o modelo e só desloca o limite ruim.
2. **Worker para qualquer operação.** Mantém a UI responsiva, mas ainda gasta segundos antes de uma recusa previsível e amplia o lote.
3. **Preflight + componentes desconectados + orçamento de trabalho.** Rejeita cedo saídas impossíveis, concatena uniões desconectadas sem clip e limita o custo antes do algoritmo quadrático. Escolhida; um Worker fica como defesa futura para geometrias complexas que passem do orçamento.

Para a robustez geométrica, a primeira regressão determinística guiará a correção do noding/encadeamento. Nenhuma tolerância será afrouxada sem prova de área e golden outputs.

### Diálogos e orçamento

- O modal terá uma pilha global por documento. Apenas o topo captura Escape e foco. `stopImmediatePropagation` isolado foi rejeitado porque o listener do pai costuma registrar primeiro.
- A medição do backup manterá um cache exato da codificação por identidade/revisão e montará o envelope uma vez. O resultado continuará byte a byte igual a `galleryToPintaJson`.

## Fluxo de dados escolhido

1. Um comando do editor altera `asset/currentLinked`, marca `dirty` e mostra estado pendente.
2. O autosave captura `{asset, linkedAssets}` e chama o único `persistAssets` atômico.
3. Em sucesso, o editor publica o snapshot inteiro na galeria e atualiza a revisão confirmada usada pelo resync.
4. Em falha, a galeria e o Estúdio permanecem na revisão anterior; o editor preserva o snapshot sujo.
5. Voltar aguarda `flush`; sucesso fecha, falha mantém a tela e o erro visível.

## Testes

- Store: estado pendente imediato, resultado de `flush`, retry, publicação ligada só no sucesso e concorrência durante save.
- UI: Voltar fecha somente após sucesso e mantém o editor em erro.
- Resync: revisão suja não envia; revisão confirmada envia; unmount não publica falha.
- Pathfinder: caso geométrico reduzido, invariantes de área, 100/200/500 formas e recusa rápida.
- Dialog: dois modais, Escape em duas etapas e foco restaurado em cada camada.
- Orçamento: igualdade exata com o serializer e contagem de codificações invalidada somente pelo asset alterado.
- Lockfile: audit direcionado confirma a remoção do advisory de `nanoid` no caminho do Pinta.

## Critérios de aceite

- Todos os testes novos falham antes da respectiva correção e passam depois.
- A suíte completa, typecheck, Biome, build e testes do host passam.
- O caso de 500 formas conclui em menos de 100 ms na máquina de referência.
- Nenhuma revisão não persistida chega à galeria ou ao Estúdio.
- O tamanho calculado do backup permanece idêntico ao UTF-8 do JSON canônico.

