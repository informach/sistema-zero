# Revisão de camadas, perspectiva e progressão do Jogo 2D

Data: 02/10/2026. Estado: revisão inicial aprovada para implementação. A decisão posterior do usuário substitui integralmente os blocos antigos, sem compatibilidade. Resultado documentado em `packages/studio/docs/jogo-2d-cenarios-e-neve.md`. As medidas e os achados abaixo registram o estado anterior à implementação.

## Recomendação

Preservar a qualidade visual da Descida da Neve e refazer sua interface de programação nas duas extensões. A criança deve trabalhar com **sprites, cenários, movimentos e acontecimentos**. A extensão deve cuidar da câmera, da projeção, da ordem de desenho, das cópias e dos encontros na pista.

Jogo 2D é a entrada para iniciantes. Jogo 2D Avançado é o nível intermediário, ainda para crianças e adolescentes. Objetos de dados, funções próprias e matemática da projeção pertencem ao percurso de programação manual, sem extensão. Eventos com um espaço “fazer” continuam adequados: a criança não precisa declarar uma função para usá-los.

O problema identificado exige integração de sprites e mudança de responsabilidade entre blocos e motor. Trocar apenas o texto dos blocos não resolve.

## Escopo e evidências

Revisados: catálogo, campos, documentação, contratos e execução de `scene-2d`; integração com os dois motores; desenho e animação de sprites/personagens; organização das paletas; fontes e blocos gerados das três versões da Descida da Neve; testes de execução e de conversão entre blocos e código. A revisão é focada nessa experiência e nas fronteiras pedagógicas das extensões, não uma auditoria exaustiva de todos os kits.

Medição feita a partir das IRs entregues e de `buildWorkspaceStateFromIR`, contando nós de blocos serializados `sz_*`, sem sombras. Inclui números, textos, dados e estruturas; **não é uma contagem de comandos que a criança precisa escrever**.

| Medida | Jogo 2D | Jogo 2D Avançado | Canvas sem extensão |
| --- | ---: | ---: | ---: |
| Blocos serializados, sem sombras | 1.084 | 1.086 | 1.130 |
| Blocos de objeto de dados | 108 | 108 | 108 |
| Declarações de funções próprias | 3 | 2 | 3 |
| Laços de contagem | 5 | 5 | 5 |
| Blocos de lista literal | 16 | 16 | 16 |

Os 108 registros descrevem o percurso: 12 estrelas, 12 bandeiras, 12 manchas de gelo e 72 pinheiros. Compartilhar a arte e o percurso foi útil; compartilhar quase toda a estrutura do programa deixou as extensões próximas demais da versão manual.

O catálogo completo declara 304 blocos não ocultos no básico e 381 no Avançado. Isso não significa que apareçam todos simultaneamente, mas reforça a necessidade de uma entrada curta e de descoberta progressiva.

Fontes principais: [fonte dos três jogos](../packages/studio/src/examples/snowDescentSource.ts), [arte e percurso](../packages/studio/src/examples/snowDescentAssets.ts), [catálogo de cena](../packages/studio/src/official-extensions/scene-2d/catalog.ts), [paleta básica](../packages/studio/src/official-extensions/game-2d/palette.ts) e [paleta avançada](../packages/studio/src/official-extensions/game-2d-advanced/blocks.ts).

## Achados

### 1. A pista não recebe o sprite existente — prioridade alta

`placeTrackObject` recebe nome, imagem, X, Z, largura e altura. Guarda um registro próprio e `drawTrack` desenha a imagem diretamente. O contrato de integração com o motor oferece `image`, mas não oferece desenho de sprite/personagem. O catálogo explicita: “Não altera sprites do jogo”.

Por isso, o sprite que a criança criou não pode simplesmente entrar na pista conservando o caminho normal de animação, aparência, efeitos e interação. Selecionar uma folha de quadros como imagem também não faz a pista recortar e animar os quadros. “Objeto da pista” e objeto de dados JavaScript são problemas diferentes; o exemplo acaba expondo os dois.

Evidências: [contrato](../packages/studio/src/official-extensions/scene-2d/contract.ts), [host](../packages/studio/src/official-extensions/scene-2d/host.ts), `runtime.ts:215–254` da cena. Compare com [desenho dos sprites básicos](../packages/studio/src/official-extensions/game-2d/runtime/sprites.ts) e `drawEntity` no [motor avançado](../packages/studio/src/official-extensions/game-2d-advanced/runtime.ts).

### 2. Os níveis receberam a mesma interface técnica — prioridade alta

As duas extensões geram os mesmos 19 comandos e valores de cena pelo mesmo catálogo. A criança encontra horizonte, foco, altura, recuo, recorte perto/longe, X/Z, projeção e intervalo de avanço. Criar um elemento na pista tem sete entradas.

Os seletores de nomes já existem e são úteis. Eles reduzem a redigitação, mas não reduzem as decisões necessárias. Nomes calculados como `"obj" + i`, usados no exemplo, ainda precisam ser construídos por expressões.

Evidências: [geração dos blocos](../packages/studio/src/official-extensions/scene-2d/blocks.ts), [catálogo](../packages/studio/src/official-extensions/scene-2d/catalog.ts) e [manual compartilhado](../packages/studio/src/official-extensions/scene-2d/docs.ts).

### 3. A versão com extensão conserva trabalho de programação manual — prioridade alta

O básico entrega funções `preparar`, `atualizar(dt)` e `desenhar(ctx)`, listas dentro de listas, acesso a propriedades, índices, nomes calculados e um controle paralelo de itens tratados. Os controles guardam se a tecla já estava pressionada; estados, vidas, placar e desenho de telas também são administrados pelo programa.

No Avançado, o exemplo mantém seu próprio `estado` enquanto coloca o motor em `jogando`, e desenha o painel com operações de Canvas. Os próprios recursos da extensão deixam de esconder parte do trabalho que poderiam assumir.

Evidência: [snowDescentSource.ts](../packages/studio/src/examples/snowDescentSource.ts), especialmente `snowHud`, `populate`, `loop` e o programa retornado a partir da linha 131.

### 4. Compor cenários exige conhecer a execução do motor — prioridade alta

A criança precisa desenhar fundo, pista e frente na ordem correta a cada quadro. A camada usa o tamanho original da imagem, diferentemente do cenário único, que cobre a tela. A paralaxe lê a câmera 2D do motor, enquanto a pista tem outra câmera; o exemplo desloca as montanhas com uma conta própria.

Há ainda uma particularidade no Avançado: com mapa ou campanha já desenhados pelo motor, o adaptador evita apagar o mundo, mas as camadas chamadas de fundo podem aparecer por cima dele. O código avisa no Console. Isso contraria a expectativa simples de “colocar atrás”.

Evidências: [documentação de cena](../packages/studio/src/official-extensions/scene-2d/docs.ts), [adaptadores básico e avançado](../packages/studio/src/official-extensions/scene-2d/runtime.ts), em especial o `clear` de `advancedSceneHost`.

### 5. A revisão deve alcançar animação e linguagem do Avançado — prioridade média

Já há seleção de animação pelo nome vindo do Pinta, preenchendo quadros e velocidade. Mesmo assim, o bloco básico expõe folha, animação, primeiro quadro, último quadro e FPS. A importação da folha exige outro bloco com dimensões de quadro.

O Avançado usa expressões como “jogo profissional” e introduz `dt` no bloco de atualização e em movimentos. Para o nível intermediário solicitado, esses detalhes devem ficar embutidos nos comportamentos comuns. A criança pode aprender mais combinações e regras sem precisar aprender a estrutura interna do motor.

Evidências: [blocos de animação básicos](../packages/studio/src/official-extensions/game-2d/blockCatalogInteraction.ts), [seletor de animação](../packages/studio/src/blockly/fields/FieldAnimationPicker.ts) e [blocos iniciais do Avançado](../packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions01.ts).

## Caminhos considerados

| Caminho | Benefício | Limitação | Decisão |
| --- | --- | --- | --- |
| Renomear, reorganizar e melhorar exemplos | Menor mudança inicial | Mantém a pista separada dos sprites e o trabalho manual | Insuficiente sozinho |
| Criar um kit fechado de esqui | Entrega uma demonstração curta rapidamente | Resolve um jogo; dificulta usar a mesma ideia em corrida, voo ou exploração | Pode virar exemplo, não a base |
| Integrar sprites à cena e oferecer blocos por intenção | Preserva recursos e permite muitos jogos com menos pré-requisitos | Exige integração de desenho, interação e ciclo de vida | Recomendado |

## Contrato pedagógico proposto

| Aspecto | Jogo 2D — iniciante | Jogo 2D Avançado — intermediário | Jogo manual — sem extensão |
| --- | --- | --- | --- |
| Personagens | Sprite escolhido pelo nome | Mesmo conceito, mais comportamentos e cópias | Estrutura escolhida pelo aluno |
| Perspectiva | Vista pronta e distância “à frente” | Posição lateral contínua, distância, velocidade e câmera com controles visuais | X/Z, fórmulas e projeção |
| Movimento | Comportamento pronto, setas e toque | Aceleração, padrões, movimento independente e regras | Laço, tempo e atualização próprios |
| Animação | Nome da animação e repetir/uma vez | Transições por ação/estado e ajustes opcionais | Recorte e relógio explícitos |
| Cenário | Camadas com posição visual e desenho automático | Mais planos, movimento e transições | Ordem de desenho programada |
| Repetição de elementos | Cópias e padrões por blocos | Trechos, grupos e eventos sobre a cópia envolvida | Listas, índices e objetos de dados |
| Regras | Eventos, condições, pontos e vidas | Combinações, fases e variáveis quando úteis | Funções e organização próprias |

Nenhuma das duas extensões deve exigir objetos de dados, funções próprias ou multiplicação por `dt` para uma experiência comum. Recursos visuais completos permanecem disponíveis desde o básico.

## Como os blocos poderiam ficar

Rótulos ilustrativos, ainda não implementados. Os nomes entre colchetes seriam seletores com as imagens, animações e sprites reais do projeto.

### Cenários

- `Adicionar cenário [montanhas] [bem ao fundo]`
- `Cenário [montanhas] acompanha o jogador [devagar]`
- `Adicionar cenário [flocos] [na frente dos personagens]`
- `Mostrar / esconder cenário [flocos]`

O alinhamento e o tamanho inicial usam um padrão consistente com o palco; um ajuste visual permite escolher encaixe ou repetição. O motor desenha fundo → mundo/personagens → frente → placar. Ordem, transparência e movimento podem ser refinados sem exigir números de câmera na primeira montagem.

“Ao fundo” representa uma camada atrás dos personagens. “Na frente” é uma sobreposição. A pista representa distância dentro do mundo. A interface deve distinguir esses três sentidos visualmente.

### Pista e sprites

- `Criar pista [neve] com vista [para o fundo]`
- `Usar [esquiador] como jogador da pista [neve]`
- `Controlar [esquiador] com [setas e toque]`
- `Percorrer [neve] com velocidade [normal]`
- `Colocar [estrela] na pista [neve], [à esquerda], [600] passos à frente`
- `Repetir [estrela] [12] vezes, a cada [480] passos, [alternando os lados]`
- `Tocar animação [deslizar] em [esquiador] [repetindo]`
- `Quando [esquiador] encontrar [estrela ou suas cópias] → fazer …`
- `Quando chegar ao fim da pista → fazer …`

O jogador pode deslizar livremente para os lados; esquerda/centro/direita são atalhos de posicionamento, não uma obrigação de transformar todo jogo em três faixas. A velocidade ganha um número opcional quando a criança quiser refiná-la.

O sprite colocado continua sendo o mesmo sprite. As cópias são criadas e administradas pelo motor, com aparência e animação herdadas. O total da repetição inclui a primeira instância; não sobra um sprite de referência desenhado fora da pista. O evento oferece “a cópia encontrada”, de modo que recolher uma estrela não apague todas. Não há lista de IDs nem vetor de itens tratados nos blocos da criança.

Selecionar uma animação do Pinta deve resolver a folha, os quadros e a velocidade. Arquivos sem metadados precisam de uma configuração visual da folha feita uma vez, com prévia, reaproveitada pelo projeto.

### Esqueleto da nova Descida da Neve

```text
Ao iniciar
  Preparar o jogo
  Adicionar os cenários: céu, montanhas, chão e flocos
  Criar os sprites: esquiador, estrela, bandeira, pinheiro e gelo
  Criar a pista neve com vista para o fundo
  Usar esquiador como jogador, com setas e toque
  Distribuir estrelas, bandeiras e decoração por padrões
  Definir a chegada e a velocidade
  Dar 3 vidas ao esquiador
  Mostrar vidas e estrelas no placar
  Mostrar a tela inicial

Quando começar a partida
  Começar a percorrer a pista

Quando esquiador encontrar estrela ou suas cópias
  Recolher a estrela encontrada
  Somar 1 estrela ao placar
  Tocar som de coleta

Quando esquiador encontrar bandeira ou suas cópias
  Tirar 1 vida e piscar

Quando acabarem as vidas → mostrar derrota
Quando chegar ao fim → mostrar vitória
```

Este é um esqueleto pedagógico, não uma promessa de que cada linha acima corresponde a um único bloco. Pausa, retomada e nova partida usam o ciclo de vida da extensão. A versão completa preserva as artes, os controles e as regras atuais; uma versão curta serve à primeira aula.

O percurso atual é repetitivo e pode ser expresso por trechos e padrões. A versão completa deve reproduzir suas posições de forma determinística. Se os padrões iniciais não conseguirem representar todo o percurso, usar colocações explícitas ou um trecho editável; não embutir no motor uma lista secreta exclusiva do jogo de neve. Um editor visual de pista pode ser uma melhoria posterior, sem bloquear a primeira entrega.

### Diferença concreta no Avançado

O aluno continua usando os mesmos sprites e animações, mas pode:

- Controlar lateral e distância livremente, acelerar e frear.
- Montar trechos do percurso, variar dificuldade e combinar fases.
- Mover um adversário pela pista independentemente do jogador.
- Alterar a câmera por opções visuais e usar mais planos de cenário.
- Criar regras sobre grupos, cópias e acontecimentos, sem declarar funções para registrá-las.

O tempo continua sendo tratado pelo motor. A complexidade extra deve vir das decisões do jogo que o aluno quer criar.

## Implementação sugerida

### 1. Integrar os sprites antes de simplificar a fachada

Manter a projeção matemática compartilhada e acrescentar adaptadores para o sprite básico e o personagem avançado. O vínculo de pista guarda posição no mundo e referência à entidade existente; não cria uma segunda aparência desconectada.

O desenho projetado deve reutilizar a lógica de aparência dos motores: imagens, folhas animadas, animação única e por estado, figuras, texto quando disponível, giro, espelhamento, opacidade e efeitos. Separar os dados de desenho projetados dos dados físicos. Evitar sobrescrever temporariamente `x/y/w/h`, pois desenho, animação, clique e colisão leem esses valores.

Contato na pista deve ser calculado em coordenadas do mundo, considerando movimento relativo do jogador e do outro sprite. Clique/toque usa a área projetada na tela. Respeitar a área de colisão definida no desenho, com uma regra explícita de conversão para a pista. Não reutilizar a sobreposição dos retângulos da tela como colisão em profundidade. Comportamentos físicos existentes precisam de adaptação por espaço; projetar o desenho não transforma automaticamente gravidade de plataforma em física de pista.

### 2. Dar ao motor a responsabilidade pelo andamento e composição

Integrar a pista ao relógio, à pausa e ao reinício existentes. Atualizar uma vez por passo, inclusive quando houver cópias; disparar encontros uma vez por passagem/entrada; limpar inscrições e vínculos ao destruir sprites ou reiniciar. Evitar um segundo laço de animação.

Criar pontos de composição reais antes e depois do mundo. A câmera usada pela paralaxe deve acompanhar o contexto ativo da cena, inclusive a pista. Novos jogos preparados com cena automática têm um único responsável por limpar e desenhar o quadro. Os blocos antigos serão removidos junto da API pública manual, por decisão posterior do usuário; não há projetos de alunos em produção.

### 3. Oferecer uma entrada curta e configurações progressivas

Criar blocos curtos com valores iniciais úteis, seletores de sprites e animações e prévias. Separar a configuração inicial dos comandos e eventos durante a partida nas regras do editor; hoje os novos comandos de cena compartilham o `placement: command` genérico.

Usar uma apresentação “Começar” com o conjunto necessário para o primeiro jogo e “Mais opções” para a exploração. A paleta Avançada acrescenta controle de jogo, mantendo a linguagem concreta. Não transferir simplesmente todo o catálogo técnico atual para ela. Rever também criação de sprites, animação, controles, placar e telas sob a mesma regra de poucos pré-requisitos.

### 4. Refazer os três exemplos da Descida da Neve, o manual e o tutor juntos

**Entrega obrigatória, explicitamente solicitada pelo usuário:** refazer os exemplos da Descida da Neve como parte desta mudança. A entrega não termina ao disponibilizar os novos blocos.

| Exemplo a refazer | Resultado esperado |
| --- | --- |
| Descida da Neve — Jogo 2D | Programa de iniciante com sprites reais, animações, cenários automáticos, padrões de distribuição e eventos; sem funções próprias, objetos de dados ou listas manuais. Oferecer também uma atividade inicial curta. |
| Descida da Neve — Jogo 2D Avançado | Programa intermediário com a mesma base simples, mostrando personalização do percurso e comportamentos adicionais sem exigir contas de tempo ou funções próprias. |
| Descida da Neve — Canvas, sem extensão | Exemplo manual reorganizado e explicado, com objetos, funções, listas e matemática explícitos; independente das extensões. |

Preservar nas três versões a arte e a experiência central aprovadas. Nas duas versões com extensão, incluir sprite animado na pista e orientar como trocar personagem, animação, cenários e regras.

Compartilhar arte e dados autorais entre as três versões, com programas didáticos separados por nível. O gerador atual não deve continuar impondo a mesma estrutura às três. Ensinar o aluno a trocar o personagem, selecionar uma animação, mudar o fundo e criar uma nova regra.

Atualizar blocos, IR, parser, geradores, conversão da Ponte, seletores, catálogos, manuais, contexto da IA, exemplos e referências de aulas. A IA deve preferir as operações simples quando a extensão estiver ativa.

### 5. Preservar projetos existentes

Decisão final do usuário: remover os blocos antigos do registro, das paletas e da API pública, sem aliases, categoria oculta ou execução legada. Os três exemplos são refeitos. Há apenas staging, sem crianças usando o produto.

Não converter silenciosamente imagem de pista em sprite: nome, tamanho, origem, colisão e desenho podem mudar. Uma conversão futura deve atuar sobre uma cópia do projeto e permitir comparação. A implementação inicial pode oferecer os blocos novos sem exigir migração do acervo.

## Critérios de aceitação

1. Nas duas extensões, um sprite animado do Pinta entra na pista e conserva animações, tamanho autoral, efeitos e identidade. Trocar a imagem ou a animação usa o mesmo fluxo do sprite fora da pista.
2. O básico oferece uma primeira atividade jogável sem funções próprias, objetos de dados, listas, índices, fórmulas de projeção nem cálculos de tempo. Meta inicial: até 30 comandos/eventos, contando valores separadamente; validar a meta no protótipo.
3. O Avançado permite um percurso personalizado e um adversário móvel com blocos de domínio, sem tornar aqueles conceitos técnicos pré-requisitos.
4. Os três exemplos da neve são refeitos e publicados nos respectivos catálogos como parte da entrega. As versões completas conservam arte, percurso determinístico, 12 estrelas, três vidas, teclado/toque, começo, pausa, vitória, derrota e reinício. Nas duas extensões, acrescentar pelo menos um sprite animado para demonstrar a integração solicitada.
5. A criança consegue trocar personagem, escolher animação, acrescentar um cenário e mudar a consequência de um encontro sem editar dados internos.
6. Encontros não se repetem indevidamente, não somem em um avanço grande e funcionam com movimento independente. Remover uma cópia não remove as demais; pausa e reinício não duplicam elementos ou eventos.
7. A camada de fundo permanece atrás do mundo também no Avançado com mapas/campanhas. Nenhum sprite é desenhado duas vezes pela combinação dos sistemas.
8. Salvar/reabrir, importar/exportar e alternar Blocos/Ponte/Código preservam o programa e as animações. Nenhum bloco antigo de cena permanece registrado ou exposto na API pública.
9. Verificar visualmente em navegador desktop e tela de celular; medir desempenho com um percurso equivalente ao atual e muitas cópias animadas.
10. Fazer uma validação pedagógica com iniciantes: observar as quatro alterações do item 5, registrar onde precisaram de ajuda e ajustar os blocos. Redução de contagem e testes técnicos não substituem essa observação.

## Verificação realizada nesta revisão

Comando executado em `packages/studio`:

```powershell
bun test src/official-extensions/scene-2d/runtime.test.ts src/official-extensions/scene-2d/codec.test.ts src/official-extensions/scene-2d/names.test.ts src/examples/snowDescent.test.ts src/examples/snowDescentRuntime.test.ts
```

Resultado: **93 testes aprovados, 0 falhas, 541 asserções, 5 arquivos**. Cobrem execução dos jogos, camadas, perspectiva, seletores de nomes e ida e volta entre blocos e código. A medição dos exemplos e do catálogo foi executada separadamente, importando os módulos atuais.

Os testes de execução usam motores reais com DOM/Canvas simulados. Não foi realizada nesta revisão uma sessão visual no navegador, avaliação com crianças nem a suíte completa do Estúdio. As propostas acima ainda precisam de implementação e validação; o resultado dos testes descreve o comportamento atual.
