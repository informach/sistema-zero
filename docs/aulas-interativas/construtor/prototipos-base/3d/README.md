# Patrulha Espacial 3D: jogo e projeto inicial para aprovação

Esta versão usa as **peças do Blender** ([docs/design/construtor-espaco-blender](../../../../design/construtor-espaco-blender/README.md)): quatro variações de cenário, nave, asteroide e laser. Os dois arquivos levam as referências da biblioteca de modelos dos cursos; os arquivos portáteis com as malhas embutidas são o `projeto-inicial` e o `projeto-final` do curso (`../../patrulha-espacial/`).

## Arte no projeto: um bloco para cada modelo

| Objeto | Modelo de partida | Variações no seletor do bloco | Tamanho no bloco |
| --- | --- | --- | --- |
| Cenário | `cenario-orbita` | aurora, nebulosa, estação | 180 |
| Nave | `nave-falcao-azul` | exploradora coral, arraia lilás, cometa verde | 3 |
| Molde de asteroide | `asteroide-rocha-lunar` | gelo azul, cristal violeta, lava laranja | 1,8 |
| Molde de tiro | `laser-ciano` | dourado, lilás, verde | 0,9 |

O cenário é um modelo sem luz, fora da área de toque e fora da névoa (`szSemNevoa`): a névoa continua escondendo os asteroides que nascem longe. A câmera fica atrás e acima da nave, como antes.

## Como jogar

- Enter começa a partida.
- Setas esquerda/direita movem a nave; a altura permanece fixa.
- Cada aperto de Espaço cria um tiro. Segurar não dispara automaticamente.
- Cada asteroide acertado dá um ponto. A meta é 20.
- Uma batida tira uma das três vidas. Há proteção breve após dano.
- Um asteroide que passa sem bater é retirado e não tira vida.
- No fim, o botão **Voltar ao início** prepara uma nova partida; Enter começa novamente.

No projeto inicial, os avisos da missão já aparecem e Enter libera o movimento para conhecer a nave. Antes de começar, as setas não a movem. Espaço ainda não cria tiros; não há pontos, vidas ou surgimento de asteroides. Os textos de vitória e derrota e o botão **Voltar ao início** já estão configurados para quando a criança construir as condições de encerramento.

## O que vem preparado no inicial

- Cena, câmera fixa e quatro blocos de modelo (cenário, nave, asteroide e laser) com as peças do Blender.
- Abertura com os avisos da missão, variável `estado = "inicio"` e evento Enter que muda o estado para `"jogando"`.
- Textos finais e botão nativo **Voltar ao início**, que reiniciará o projeto quando uma condição construída nas aulas encerrar a partida.
- Nave com movimento lateral e limite.
- Moldes de tiro e asteroide escondidos.
- Grupos vazios `tiros` e `asteroides`.
- Transporte dos grupos com velocidades inicialmente zero.
- Percursos que apresentam um asteroide e um tiro por vez, com guarda de consumo preparada e miolo vazio.
- Movimento, transporte e percursos executados somente quando `estado === "jogando"`.

Nas aulas, a criança construirá a criação dos tiros e asteroides, direção configurada, relógio, retirada, regra de acerto, pontuação e dano. Também conectará as condições de vitória e derrota à mudança de estado e ao encerramento da partida, usando as telas já preparadas, e aplicará a guarda `estado === "jogando"` aos novos eventos. Personalização permanece limitada à aparência; as opções de arte 3D serão produzidas no Blender.

## Verificação realizada

Os dois projetos passaram no parser/schema, na importação oficial do Estúdio e na ida e volta pelos blocos reais do Blockly. O completo contém 198 blocos; o inicial, 114. Cada um usa três blocos de carregamento para as artes GLB.

A execução com o runtime oficial passou em 13 grupos de verificações. No completo, foram conferidos carregamento assíncrono dos três modelos sem forma de reserva, cópias, movimento, contatos, pontuação, vidas, prioridade do resultado simultâneo, botão de reinício e duas reinicializações. No inicial, foram conferidos abertura sem movimento, Enter liberando a nave, 30 segundos sem sistemas antecipados e ausência de regras extras ao apertar Espaço ou Enter novamente. A verificação também acionou os dois resultados externamente para conferir os textos e o botão nativo restaurando abertura, posição e modelos; essas chamadas de encerramento não foram incluídas no JSON inicial.

Foram usados DOM, geometrias Three.js e leitores GLB reais; somente o desenho WebGL foi substituído por um renderer vazio. Não houve erro ou aviso no console. Os scripts nos arquivos exportados coincidem exatamente com a versão testada.


A validação técnica confere estrutura e comportamento. A sensação de jogo e a aparência no Estúdio serão avaliadas por Helena ao importar os projetos.

## Fontes e reprodução

O gerador `../fontes/3d/generate-sources.py` prepara os dois programas. Os modelos embutidos e sua origem estão em `../fontes/3d/assets.json` e `../fontes/3d/gallery-models-origin.json`. Os três GLBs também estão em `modelos/` para referência, sem necessidade de importá-los separadamente.

O exportador compartilhado é `../fontes/exportar-projetos.ts`. A conversão opcional da arte existente da galeria é reproduzida por `../fontes/3d/export-gallery-models.mjs`, usando a dependência Three.js do Estúdio e conferindo o hash da fonte de origem. Veja a sequência no [README principal](../README.md#reprodução-no-repositório).

Os relatórios de geometria, comportamento, importação e conversão de blocos estão em `../validacao/`. Referência do motor: commit `9ca0696aef5a536846525704b9d01261e2bd0da7` da `staging`.
