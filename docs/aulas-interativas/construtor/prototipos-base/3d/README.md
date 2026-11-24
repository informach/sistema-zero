# Patrulha Espacial 3D: jogo e projeto inicial para aprovação

Esta versão usa **modelos provisórios já existentes na galeria**. A nave, o meteoro e o laser foram retirados do exemplo Patrulha Espacial e empacotados como GLB. As artes definitivas e suas variações serão feitas por Helena no Blender.

## Arquivos para importar

| Arquivo | Conteúdo |
| --- | --- |
| `patrulha-espacial-3d-completo.szproject.json` | Jogo completo para conferir controles, acertos, pontos, vidas, começo, fim e reinício |
| `patrulha-espacial-3d-inicial.szproject.json` | Apresentação e apoios preparados; sistemas da partida ainda por construir |

Os três GLBs estão **embutidos nos dois arquivos**. Basta importar o `.szproject.json` como projeto do Estúdio. Não é necessário enviar os modelos separadamente, instalar Blender ou colar o JSON no editor de JavaScript.

## Arte no projeto: um bloco para cada modelo

A preparação contém os blocos nativos **Criar o objeto … com o modelo …** para:

| Objeto | Modelo provisório | Tamanho no bloco |
| --- | --- | --- |
| Nave | `patrulha-nave-provisoria` | 3 |
| Molde de asteroide | `patrulha-asteroide-provisorio` | 1,8 |
| Molde de tiro | `patrulha-laser-provisorio` | 0,9 |

O programa entregue não monta corpo, asas, bico, pedras ou lasers por dezenas de blocos de formas. Também não possui variáveis de escolha de aparência ou alternativas artísticas novas para o 3D. O alvo vazio usado para apontar a câmera é somente apoio de enquadramento, sem geometria.

O céu e a névoa usam a configuração do exemplo de origem. A câmera foi enquadrada atrás e acima da nave para deixar visível a faixa de aproximação dos asteroides.

### Origem dos modelos

Fonte: [`packages/studio/src/official-extensions/game-3d/__gen_patrulhaEspacial.ts`](https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-3d/__gen_patrulhaEspacial.ts), commit `9ca0696aef5a536846525704b9d01261e2bd0da7` da `staging` de `informach/sistema-zero`.

- Nave: corpo prateado, duas asas azuis e bico ciano do exemplo existente.
- Asteroide: o meteoro esférico cinza do mesmo exemplo.
- Laser: o projétil verde do mesmo exemplo.

As mesmas geometrias, dimensões, cores e materiais foram exportados com o `GLTFExporter` do Three.js. O carregador nativo do Estúdio centraliza o arquivo e ajusta seu maior lado ao tamanho indicado no bloco. Os arquivos não usam texturas, links ou binários externos.

## Como jogar

- Enter começa a partida.
- Setas esquerda/direita movem a nave; a altura permanece fixa.
- Cada aperto de Espaço cria um tiro. Segurar não dispara automaticamente.
- Cada asteroide acertado dá um ponto. A meta é 20.
- Uma batida tira uma das três vidas. Há proteção breve após dano.
- Um asteroide que passa sem bater é retirado e não tira vida.
- No fim, o botão **Voltar ao início** prepara uma nova partida; Enter começa novamente.

No projeto inicial, Enter libera o movimento para conhecer a nave. Antes de começar, as setas não a movem. Espaço ainda não cria tiros; não há pontos, vidas ou surgimento de asteroides. Os textos de vitória e derrota e o botão **Voltar ao início** já estão configurados para quando a criança construir as condições de encerramento.

## O que vem preparado no inicial

- Cena, câmera fixa e três blocos de modelos provisórios.
- Abertura, variável `estado = "inicio"` e evento Enter que muda o estado para `"jogando"`.
- Textos finais e botão nativo **Voltar ao início**, que reiniciará o projeto quando uma condição construída nas aulas encerrar a partida.
- Nave com movimento lateral e limite.
- Moldes de tiro e asteroide escondidos.
- Grupos vazios `tiros` e `asteroides`.
- Transporte dos grupos com velocidades inicialmente zero.
- Percursos que apresentam um asteroide e um tiro por vez, com guarda de consumo preparada e miolo vazio.
- Movimento, transporte e percursos executados somente quando `estado === "jogando"`.

Nas aulas, a criança construirá a criação dos tiros e asteroides, direção configurada, relógio, retirada, regra de acerto, pontuação e dano. Também conectará as condições de vitória e derrota à mudança de estado e ao encerramento da partida, usando as telas já preparadas, e aplicará a guarda `estado === "jogando"` aos novos eventos. Personalização permanece limitada à aparência; as opções de arte 3D serão produzidas no Blender.

## Preparação das artes definitivas no Blender

A substituição futura acontecerá no campo **modelo** do bloco, com o arquivo correspondente embutido no projeto. Antes de fechar as aulas, conferir orientação para a frente em Z negativo, posição de saída do tiro, dimensões, visibilidade e caixa de colisão dos novos modelos. O tamanho máximo de referência é 3 para a nave, 1,8 para o asteroide e 0,9 para o laser. A revisão da arte deve preservar as regras de jogo aprovadas.

## Verificação realizada

Os dois projetos passaram no parser/schema, na importação oficial do Estúdio e na ida e volta pelos blocos reais do Blockly. O completo contém 198 blocos; o inicial, 114. Cada um usa três blocos de carregamento para as artes GLB.

A execução com o runtime oficial passou em 13 grupos de verificações. No completo, foram conferidos carregamento assíncrono dos três modelos sem forma de reserva, cópias, movimento, contatos, pontuação, vidas, prioridade do resultado simultâneo, botão de reinício e duas reinicializações. No inicial, foram conferidos abertura sem movimento, Enter liberando a nave, 30 segundos sem sistemas antecipados e ausência de regras extras ao apertar Espaço ou Enter novamente. A verificação também acionou os dois resultados externamente para conferir os textos e o botão nativo restaurando abertura, posição e modelos; essas chamadas de encerramento não foram incluídas no JSON inicial.

Foram usados DOM, geometrias Three.js e leitores GLB reais; somente o desenho WebGL foi substituído por um renderer vazio. Não houve erro ou aviso no console. Os scripts nos arquivos exportados coincidem exatamente com a versão testada.


A validação técnica confere estrutura e comportamento. A sensação de jogo e a aparência no Estúdio serão avaliadas por Helena ao importar os projetos.

## Fontes e reprodução

O gerador `../fontes/3d/generate-sources.py` prepara os dois programas. Os modelos embutidos e sua origem estão em `../fontes/3d/assets.json` e `../fontes/3d/gallery-models-origin.json`. Os três GLBs também estão em `modelos/` para referência, sem necessidade de importá-los separadamente.

O exportador compartilhado é `../fontes/exportar-projetos.ts`. A conversão opcional da arte existente da galeria é reproduzida por `../fontes/3d/export-gallery-models.mjs`, usando a dependência Three.js do Estúdio e conferindo o hash da fonte de origem. Veja a sequência no [README principal](../README.md#reprodução-no-repositório).

Os relatórios de geometria, comportamento, importação e conversão de blocos estão em `../validacao/`. Referência do motor: commit `9ca0696aef5a536846525704b9d01261e2bd0da7` da `staging`.
