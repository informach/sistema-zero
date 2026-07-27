# Auditoria completa da extensão Jogo 2D — 2026-07-20

## Resultado executivo

Os **15 achados** desta auditoria foram corrigidos: um P0, quatro P1, oito P2 e
dois P3. Cinco correções eram de experiência pedagógica e visual; as outras dez
tratavam comportamento do runtime, arquitetura, tipagem e documentação.

A paleta permanece extensa por decisão de produto: são 209 definições de bloco
(207 visíveis e 2 legadas ocultas). A seleção do conteúdo apresentado continua
sendo responsabilidade do perfil de aprendizagem e de cada aula.

A correção técnica desta auditoria foi publicada como **Jogo 2D 0.34.0**. O
manifesto vigente está em **0.48.0** após os fechamentos subsequentes: grupos
seguros também no modo Código, ciclo de vida gerenciado e HUD acessível em todos
os caminhos públicos e legados, o full review de 23/07 (inimigo "patrulha" que
respeita jogos sem gravidade, cartão de porta de entrada "Pegue a moeda" e redes
de teste para blocos antes sem execução), a reforma semântica dos kits
Equilibrista e Balão (26/07, 0.42.0): o personagem virou um SPRITE comum (com
tamanho e cores configuráveis, compatível com os blocos genéricos de figura e
imagem) e as regras moram num objeto "caminho"; a leitura do mouse ficou
explícita (novo valor "o mouse ou dedo está segurado?" montado num se/senão) e o
placar passou a ser variável da criança. Os blocos monolíticos antigos dos dois
kits foram removidos; o cenário passou a respeitar o tamanho lógico do "Preparar
a tela" em todos os quadros. O lote de fundação dos cursos de jogos (26/07,
0.43.0, princípios do estudo Clear Code — ver `docs/orientacao-cursos-jogos.md`)
somou três blocos: **Depois de N segundos fazer** (raiz one-shot re-armada pelo
reinício), **Usar área de colisão de N% do tamanho** (o dial da colisão
perdoadora — vale para as perguntas de encostar; a física de empurrar segue com
o tamanho cheio, e "Mostrar a caixa de colisão" desenha a área efetiva) e
**Desenhar o grupo ordenado pela base** (profundidade top-down por y+h).
O 0.44.0 (27/07) fechou o full review dos exemplos Clear Code B na Batalha de
Monstrinhos: abertura em duas peças que não trava na tela de título e Poção
limitada a 3 usos por partida (derrota alcançável), com playthroughs novos.
O 0.45.0 (27/07) somou o exemplo "Chuva de Meteoros" (recriação do Space
Shooter do curso raylib_intro: nave nas 4 direções, chuva vertical de meteoros
girando e placar por tempo), com drift test e playthrough próprios.
O 0.46.0 (27/07) somou dois exemplos recriando jogos do Chris Courses no básico:
"Muralha do Reino" (tower-defense: invasores em fila, torres compradas no clique
que atiram sozinhas, ondas e vidas) e "Escalada do Guerreiro" (vertical-platformer:
pulo entre plataformas com câmera que sobe até a bandeira do topo), ambos 100%
procedurais, com drift tests e playthroughs próprios.
O 0.47.0 (27/07) somou mais dois exemplos Chris Courses no básico: "Duelo de
Heróis" (fighting-game: dois jogadores no mesmo teclado, caixa de golpe, barras de
vida e cronômetro) e "Portas do Castelo" (kings-and-pigs: plataforma por fases em
que a porta troca de salão com fade), ambos 100% procedurais, com drift tests e
playthroughs próprios; junto entraram as teclas a/d/w/s/f nos dropdowns on_key/
key_down (2 jogadores). Um full review depois corrigiu o alinhamento da faixa de
tiro da "Muralha do Reino" (as balas voavam numa faixa vazia; agora encostam nos
invasores).
O 0.48.0 (27/07) somou mais dois exemplos Chris Courses no básico: "Vale
Ensolarado" (sunnyland-platformer: pulo entre plataformas, gemas para juntar,
gambá e águia como inimigos, câmera que segue) e "Vila Ninja" (ninja-adventure:
aventura top-down num mini-mundo, ataque com espaço e câmera que segue), ambos
100% procedurais, com drift tests e playthroughs próprios.
Não há achados abertos no escopo desta revisão.

## Escopo revisado

- 43 arquivos próprios da extensão;
- 209 definições de blocos e 24 subcategorias;
- 208 métodos e valores públicos em `window.SZGame2D`;
- dez fragmentos que compõem o runtime injetado;
- definição → Blockly → IR → JavaScript → parser → workspace state;
- manifesto, permissões, documentação do aluno e contexto da IA;
- 19 exemplos, assets, classificação pedagógica e execução no Chromium;
- ciclo de vida, pausa, reinício, câmera, grupos, colisões, áudio, DPR,
  segurança, desempenho e tratamento de erros;
- testes da extensão e integrações externas de Blockly/parser.

## Situação dos achados

| Prioridade | Achado | Situação |
|---|---|---|
| P0 | Geometria lógica confundida com backing store em DPR alto | Corrigido |
| P1 | Pausa não congelava o tempo lógico e efeitos autônomos | Corrigido |
| P1 | `pruneOffscreen` ignorava a posição da câmera | Corrigido |
| P1 | Erros de callbacks infantis eram engolidos | Corrigido |
| P1 | `A cada N quadros` aparecia com soquete vazio | Corrigido |
| P2 | Mesmo grupo gerava autoc colisões e pares duplicados | Corrigido |
| P2 | Asteroide da borda não seguia realmente ao centro | Corrigido |
| P2 | Contrato público validava nomes, mas não assinaturas | Corrigido |
| P2 | Reinício conhecia o estado privado de todos os domínios | Corrigido |
| P2 | Toolbox usava áreas do projeto como taxonomia | Corrigido |
| P2 | Rótulos misturavam posicionamento e semântica | Corrigido |
| P2 | Foco do canvas dependia do outline do navegador | Corrigido |
| P2 | Texto acessível tornava o bloco de preparação pesado | Corrigido |
| P3 | Sorteio “inteiro” aceitava limites fracionários | Corrigido |
| P3 | Guia interno continha versão e limite de docs antigos | Corrigido |

### Revisão de combinações — 0.34.0

Uma segunda passagem sobre combinações do runtime corrigiu mais oito pontos:

- todos os helpers de borda, chão, ponteiro e sorteio usam o viewport da câmera;
- imagem e animação substituem corretamente uma figura anterior do sprite;
- eventos de inimigo derrotado coexistem e isolam apenas o callback defeituoso;
- imagens assíncronas não apagam nem cobrem o cenário enquanto carregam;
- colisão grupo × grupo mantém custo O(N×M), inclusive com remoções no callback;
- o contrato de imagem representa `img` nulo, falha, URL e fonte vazia;
- um bloco `Ao iniciar` defeituoso é removido também antes de um reinício;
- a recarga de N quadros volta a ficar pronta exatamente após N chamadas.

O campo infantil `objetivo e controles` foi removido dos dois blocos
`Preparar`. O runtime continua atribuindo ao canvas uma descrição interna
automática, sem exigir que a criança aprenda acessibilidade nesta etapa.

## Correções técnicas

### P0 — Geometria lógica e backing store

`drawTileMap`, `createStickHero` e `createBalloon` deixaram de usar
`canvas.width/height` como coordenadas do jogo. A geometria agora passa por
`stageW(ctx)` e `stageH(ctx)`; o tamanho físico do canvas fica reservado para
nitidez, transformação e limpeza.

O comportamento foi coberto no runtime real com palco lógico 800×480 e DPR 2 e
3. Tilemap, Equilibrista e Balão mantêm o mundo lógico, enquanto o backing store
é multiplicado pelo DPR. O Playwright também exerce os três exemplos em DPR 1,
2 e 3 e confirma primeiro frame, controles, acessibilidade e dimensões físicas.

### P1 — Pausa congela a partida inteira

O runtime ganhou um relógio monotônico de jogo que desconta o período pausado.
Temporizadores, animações e demais consumidores de `now()` deixam de avançar
durante a pausa.

Os domínios podem registrar hooks de `pause` e `resume`. Música e tremor de tela
suspendem seus agendamentos, preservam o estado e retomam do ponto correto. As
ações deliberadamente disponíveis para sair da pausa, como teclado e ponteiro,
continuam funcionando.

Há regressões específicas para:

- `everySeconds` não vencer durante a pausa;
- animação não saltar quadros;
- tremor não continuar em RAF independente;
- música não avançar por `setTimeout` enquanto o jogo está congelado.

### P1 — Remoção fora da tela respeita a câmera

`pruneOffscreen` calcula agora o viewport no espaço do mundo:
`camera.x..camera.x+stageW` e `camera.y..camera.y+stageH`. Com câmera em (0,0), o
comportamento anterior é preservado. Os quatro lados foram cobertos com câmera
deslocada.

### P1 — Uma única fronteira para erros do aluno

Callbacks compostos de grupos, colisões, figuras e inimigos não capturam mais a
exceção do código infantil antes do driver. O erro sobe até a raiz responsável,
que diagnostica uma vez e remove somente o handler culpado. Outros loops seguem
rodando.

Uma regressão executa uma exceção dentro de `forEachInGroup`, por sua vez dentro
de um loop raiz: o handler defeituoso roda uma vez, o saudável continua e apenas
um diagnóstico pedagógico é emitido.

### P2 — Colisão do grupo consigo mesmo

Quando os dois argumentos representam o mesmo grupo, `overlapGroups` percorre
somente pares distintos e não ordenados. Um sprite não colide consigo mesmo e o
par A/B não é repetido como B/A. O snapshot da coleção também evita que remoções
durante o callback corrompam a iteração.

### P2 — Trajetória do asteroide

O asteroide é criado primeiro e sua velocidade é calculada a partir do centro
real do sprite recém-posicionado até o centro lógico do palco. O vetor é
normalizado e multiplicado pela velocidade pedida. A regressão verifica
magnitude, produto vetorial e sentido do vetor.

### P2 — Contrato público tipado

`runtimeContract.ts` deixou de reduzir os membros públicos a
`(...args: unknown[]) => unknown`. A API foi dividida em contratos explícitos de
ciclo de vida, palco, sprites, física, áudio, matemática/estado, entrada/movimento,
mundo, HUD/cenas e kits.

Estruturas compartilhadas — sprite, grupo, tilemap, inimigo, spritesheet,
animação e estados dos kits — têm tipos próprios. A lista de chaves continua
funcionando como inventário exato, e a cobertura reversa impede um membro tipado
de ficar fora dela.

### P2 — Reset por domínio

Cada fragmento com estado registra seu próprio hook por
`_registerRuntimeDomain`. O `restart` apenas chama `_resetRuntimeDomains()` e
reinicia o ciclo de vida; ele não conhece mais variáveis privadas de áudio,
input, partículas, câmera, mapas, inimigos ou kits.

O teste de arquitetura exige o registro nos oito domínios com estado e impede
que o orquestrador volte a manipular esse estado diretamente.

### P3 — Sorteio inteiro

`randomBetween` normaliza os limites com `ceil(min)` e `floor(max)`, troca pontas
invertidas e devolve sempre um inteiro dentro do intervalo inclusivo. Quando não
existe inteiro entre limites fracionários, usa explicitamente o inteiro mais
próximo do ponto médio. Tooltip e manual descrevem o mesmo contrato.

### P3 — Fonte de verdade da documentação interna

A seção de Jogo 2D 0.23.0 em `CLAUDE.md` está identificada como registro
histórico. Naquela rodada, a versão vigente passou a 0.37.1, e o limite de documentação é
obtido do schema em `src/extensions/manifest.ts` (`MAX_DOCS_CHARS = 60_000`), sem
manter um segundo teto divergente no guia.

## Correções de experiência e pedagogia

### Soquete de `A cada N quadros`

O input `N` recebeu sombra numérica 30 tanto na toolbox quanto na restauração de
sombras. A criança vê e pode editar a cadência; o fallback do IR não precisa mais
mascarar um bloco visualmente incompleto.

### Taxonomia por assunto

As três áreas de comportamento continuam sendo `Ao iniciar`, `Quando acontecer`
e `Enquanto estiver rodando` no workspace. Na toolbox, os blocos foram distribuídos pelos assuntos
`Controles`, `Colisões` e `Tempo e repetição`, coerentes com as demais categorias.

### Rótulos curtos e semânticos

Instruções como `Dentro de “A cada quadro”` saíram da face dos blocos. O local de
uso fica em tooltip, manual e aulas. A linguagem agora distingue:

- eventos reais: `Quando apertar...`, `Quando clicar...`, `Quando ... começar a
  encostar...`;
- varreduras contínuas: `Para cada colisão entre...` e `Para cada tiro que
  acertar...`;
- configuração: `Animação do sprite no estado...`.

### Foco intencional do canvas

O palco usa um seletor próprio: remove o outline externo padrão e mostra um
indicador interno em `:focus-visible`. O canvas continua focável e acessível por
teclado sem alterar tamanho ou criar barras.

### Metadados automáticos dos blocos de preparação

Os facilitadores não pedem mais `objetivo e controles`. O runtime cria uma
descrição interna a partir do título do projeto e continua alimentando
`aria-label`, `aria-describedby` e os anúncios de cenas sem expor esse conceito
à criança iniciante.

## Pontos aprovados e preservados

- **Paleta e pedagogia:** catálogo global extenso, com seleção por aula e perfil;
- **Pipeline:** os blocos atravessam definição, Blockly, IR, geração, runtime,
  parser e reconstrução;
- **Campos semânticos:** sprites, grupos, mapas, imagens e animações usam pickers;
- **Ciclo de vida:** preparação, eventos e loops têm áreas próprias e múltiplas
  raízes coexistem;
- **Exemplos:** 15 cartões classificados, com objetivo/controles e primeiro frame;
- **Acessibilidade:** canvas nomeado, descrição associada, foco e anúncio de cena;
- **Segurança:** sem `eval`, `new Function`, scripts remotos ou armazenamento
  próprio no bootstrap;
- **Namespace:** blocos `sz_g2d_`, API `SZGame2D` e conflitos declarados;
- **Limites:** grupos, partículas e catch-up do scheduler continuam protegidos.

## Evidência de verificação

### Ciclo vermelho → verde

As regressões novas reproduziram 14 falhas antes das correções: DPR dos kits,
tilemap em DPR alto, pausa de temporizador/animação/música/tremor, câmera,
callback aninhado, mesmo grupo, asteroide, sorteio fracionário e os dois guardas
arquiteturais de reset. Depois das alterações, os mesmos cenários passaram.

### Resultado após todas as correções

- **Gate focado do Jogo 2D e integrações:** 758 aprovados, 0 falhas, 18.689
  asserções, 25 arquivos;
- **Suíte completa do Studio:** 4.571 aprovados, 0 falhas, 43.145 asserções,
  296 arquivos;
- **Contrato público:** compilação TypeScript isolada aprovada e inventário
  exato das 195 chaves aprovado;
- **TypeScript global:** `tsc --noEmit` aprovado;
- **Biome global:** 692 arquivos aprovados, sem correções pendentes;
- **Chromium:** 24 cenários focados aprovados — todos os exemplos introdutórios,
  geometria em DPR 1, 2 e 3 e viewport estreito;
- **CI:** o mesmo subconjunto Chromium do Jogo 2D passou a integrar o check
  obrigatório do monorepo.

### Fechamento do full review subsequente — 0.35.1

- o guard do runtime composto voltou a passar ao concatenar o contexto de projeto
  sem criar um template literal adicional;
- uma descrição explícita para leitor de tela sobrevive independentemente da
  ordem dos blocos e a novas preparações do palco;
- duas regressões cobrem descrição antes/depois de `setupStage` e
  `setupStageFull`;
- o inventário documental de blocos e API ganhou um teste contra as fontes reais;
- o Playwright focado do Jogo 2D agora roda no CI.

### Fechamento dos achados complementares — 0.37.0

- mapas de tiles grandes desenham somente as linhas e colunas que cruzam a
  viewport, inclusive com câmera, deslocamento e linhas irregulares;
- `moveToward` não ultrapassa o alvo e registra `vx/vy` coerentes; `arrowsX`
  preserva o eixo vertical e WASD normaliza letras e códigos físicos;
- placar, barra e vidas alimentam uma região viva própria, agrupada e limitada a
  duas atualizações por segundo, sem disputar os anúncios de cena;
- o preview mostra direcional, Espaço e Enter automaticamente em dispositivos
  touch quando a IR usa teclado; os controles podem ser ocultados e restaurados;
- os dois roteiros da aula de asteroides protegem também a raiz periódica com
  `se a tela atual é jogando?`, impedindo acúmulo durante início, vitória ou derrota;
- a allowlist de blocos oficiais deriva do catálogo, e a montagem de
  `window.SZGame2D` deriva do inventário tipado da API;
- o JavaScript final injetado passa por checagem semântica do TypeScript com um
  contrato explícito das propriedades fornecidas pelo host.

A disponibilidade dos 194 blocos visíveis no perfil `iniciante-2d` foi mantida
por decisão de produto. A progressão é definida pelo professor dentro de cada
aula, não por ocultação gradual na extensão.

O gate final desta rodada aprovou 641 testes próprios do Jogo 2D e a suíte
completa do Studio, com 4.642 testes. O package `studio-aulas` aprovou teste,
TypeScript e Biome. O typecheck global e o Playwright ficaram temporariamente
bloqueados pela migração paralela de `src/parsers/js.ts` para `@babel/types`: o
primeiro aponta somente estreitamentos pendentes nesse arquivo, e o segundo para
no boot do Vite com `process is not defined` antes de abrir a galeria.

### Alinhamento do ciclo de vida de áudio — 0.37.1

- **Tocar música de fundo** passou a usar o contrato compartilhado de recurso
  persistente: pode iniciar em **Ao iniciar**, **Quando acontecer** ou diretamente
  numa função, mas a conexão e a IR recusam qualquer laço;
- repetir a mesma música mantém a faixa e seu agendamento atuais, sem voltar à
  primeira nota;
- o teste de conformidade agora deriva todos os `resource-creator` das cinco
  extensões oficiais, evitando que novas categorias escapem do registro central.

### Fechamento do full review — 0.37.9

- grupos criados pelo runtime rastreiam também mutações diretas de `items` no
  modo Código, mantendo snapshots e colisões coerentes;
- “Mostrar fim de jogo” usa um helper acessível do runtime e preserva o mesmo
  bloco no round-trip Blocos → Código → Blocos;
- o bloco legado de corações continua compatível visualmente e agora anuncia a
  quantidade de vidas para leitores de tela;
- relatório, manifesto e guia interno compartilham a mesma versão vigente, com
  regressão automática contra novo drift.

### Fechamento dos achados de posicionamento e documentação — 0.37.10

- `Pôr o gorila` segue o mesmo contrato dos demais criadores nomeados de sprite e
  só encaixa em **Ao iniciar**, impedindo recriação e perda de estado a cada quadro;
- o manual localiza as duas colisões sólidas em **💥 Colisões**, a categoria que
  realmente contém esses blocos;
- regressões cruzam todos os criadores nomeados com o contrato de posicionamento e
  cada localização explícita do manual com a categoria real da toolbox.

### Entrega inicial do full review de 23/07 — 0.38.0

- a primeira implementação fez a patrulha distinguir jogos top-down de jogos de
  plataforma por um sinal implícito dos helpers de movimento; esse desenho foi
  substituído pelo contrato explícito descrito na correção 0.38.1 abaixo;
- a vitrine ganhou o cartão **Pegue a moeda**, o primeiro jogo completo e mínimo
  (andar, encostar na moeda, placar e vitória), levando os exemplos de 14 para 15;
- o manual do aluno passou a nomear as categorias **🎮 Sprites**, **💨 Velocidade**
  e **🏆 Placar e HUD** e a documentar os leitores de velocidade;
- novas redes de teste cobrem `randomChance`, `tileAtSprite` e o reporter `touches`,
  antes só auditados estruturalmente.

### Correções dos achados do full review — 0.38.1

- a gravidade do mundo agora possui estado explícito de configuração: patrulhas
  só caem quando `setGravity` declara valor não zero, e valores negativos mantêm o
  mesmo sentido em sprites, patrulhas, saltadores e demais helpers físicos;
- `platformer` e `jumpOnGround` não deixam mais um modo global pegajoso, e
  `topDown` remove o estado aéreo anterior antes de `autoAnimate` escolher a pose;
- entradas públicas críticas rejeitam `NaN`/`Infinity` usando o saneamento numérico
  compartilhado, sem contaminar gravidade, câmera, tamanho ou transformação;
- **Pegue a moeda** possui playthrough completo de cinco coletas, vitória, reinício
  e placar zerado; `playJump` percorre o `AudioContext` controlado e verifica
  frequência inicial, rampa e duração reais;
- o título da galeria deriva a quantidade dos contratos de QA, eliminando o número
  manual que havia ficado em 67, e o inventário documental registra os 43 arquivos.

### Verificação da correção — 0.38.1

- os 19 arquivos de teste próprios do Jogo 2D aprovam 694 testes e 3.774
  asserções;
- os 25 cenários Chromium da categoria aprovam a criação, o primeiro frame, os
  controles, o novo jogo completo, DPR 1/2/3 e o layout estreito;
- o typecheck do workspace Studio e o Biome sobre 795 arquivos passam sem erros;
- a suíte global ainda encontra uma falha fora deste pacote: o contrato exaustivo
  de “Programação” instancia `FieldColourSZ` sem DOM e recebe
  `ReferenceError: document is not defined`; a falha também se reproduz sozinha.

## Conclusão

Todos os achados desta auditoria foram resolvidos sem reduzir a paleta. O runtime
agora separa coordenadas lógicas da resolução física, trata pausa e reinício como
responsabilidades de domínio, mantém erros do aluno numa fronteira única e expõe
um contrato TypeScript verificável. A experiência dos blocos permanece curta e
organizada por assunto, deixando posicionamento e sequência para documentação e
aulas.
