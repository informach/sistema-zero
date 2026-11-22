# "Mostrar o bloco" no Reino Zero Ultra (lote 2 da conclusão, 22/11/2026)

O gesto: os jogos prontos, Reino Zero Ultra, "Procurar no programa", "se tecla", o resultado da
tecla R (`packages/studio/e2e/classic-reveal-scale.spec.ts`, Chromium do Playwright, 1440×900,
playground de produção). Conta o trabalho do gesto, que não depende da máquina: no Chrome conectado
cada medida de texto em SVG custa cerca de 90 vezes mais (a tarefa de 243 s de 21/11).

| Medida | Antes | Lote 2, parte 1 | Lote 2, com o corte do corpo |
|---|---|---|---|
| Leituras de estilo (`getComputedStyle`, o que o Blockly faz para medir texto) | 1.008 | 540 | 444 |
| Blocos redesenhados (caminhos `blocklyPath` refeitos) | 5.752 | 750 | 393 |
| Grupos postos na página | 145 | 145 | 145 |
| Grupos na página no fim | 850 | 850 | 493 |
| Maior tarefa (Chromium local) | 542 ms | 182 ms | 133 a 141 ms |
| O projeto salvo mudou | sim | não | não |

O corte do corpo (parte 2): o corpo comprido da função que envolve o alvo (`updateGame`) é
desenhado só até o alvo e mais uma tela e meia; o resto vira uma cauda adiada dentro da função,
desenhada ao rolar, e a unidade seguinte da área nunca é desenhada antes de o corpo terminar.

O que mudou: o corpo escondido de cada função recolhida no caminho não é mais desenhado; desenhar
a cauda não emite eventos (o rótulo da forma recolhida saía como mudança de campo); a função que
envolve o alvo abre só para mostrar (sem desfazer, sem regerar e salvar, e o estado salvo segue
gravando-a recolhida); o afastamento automático de uma pilha solta, causado por essa abertura, não
é gravado como layout. Os 145 grupos são as unidades da cauda até o alvo, desenhadas de cima para
baixo para a posição do alvo ser exata.
