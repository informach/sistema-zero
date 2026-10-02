# Cenários, sprites e Descida da Neve

As extensões agora recebem sprites comuns na pista. A câmera, a perspectiva, a composição
dos cenários, o avanço e os encontros ficam no motor. A criança escolhe imagens, sprites,
animações, posições e acontecimentos usando blocos.

Os 19 blocos anteriores de camadas/perspectiva foram retirados dos registros, das paletas,
dos contratos e da API pública. Não há categoria legada nem aliases de compatibilidade.
Essa substituição foi autorizada porque o produto está em staging, sem projetos de alunos.
Versões: Jogo 2D 2.0.0 e Jogo 2D Avançado 0.63.0.

## Jogo 2D: comportamentos prontos

Em **Ao iniciar**, adicione cenários, crie a pista e o sprite do jogador. Escolha uma
animação do Pinta no grupo **Animação**. **Usar como jogador**, **Setas e toque** e
**Percorrer pista** cuidam de câmera, tempo, controles e vidas. A criança escolhe movimento
suave, normal ou rápido e espaço estreito, normal ou amplo. O ritmo também tem escolhas prontas.

**Colocar no centro/à esquerda/à direita** evita coordenadas na primeira montagem. A posição
exata fica em **Mais controles**, para personalizar o percurso e a decoração. **Repetir**
distribui cópias, incluindo o original no total. Colocar e repetir funcionam durante a partida.

**Quando o jogador encontrar** recebe ações de recolher, pontuar e tirar vida. **Mostrar vidas
e placar** e **Usar telas prontas** cuidam da apresentação. As regras comuns também esperam
o início e param nas telas finais. O bloco comum **Limpar a tela** mantém os cenários automáticos.
O botão de pausa e a tecla P do placar também funcionam sem usar telas prontas.

## Jogo 2D Avançado: combinar ações

O Avançado compartilha projeção e sprites, mas tem outro contrato. **Na pista … acompanhar …**,
**Velocidade de avanço**, **Controlar pelos**, **Limitar a lateral** e **Chegada da pista**
são ações separadas. Nenhuma exige contas de perspectiva ou uma função criada pelo aluno.
Uma pista pode movimentar personagens sem jogador ou linha de chegada.

Vida usa **Dar … vidas a …**, **Machucar … tirando … de vida** e **a vida de …**. As telas usam **Na tela pronta …, escrever título**
e **Mudar o estado do jogo para**. O placar combina **Mostrar no placar** e **Desenhar uma barra de** no **Desenhar por cima (HUD)**.
Esses blocos também servem a plataforma, nave e outros gêneros. O exemplo usa os botões nativos
para começar, continuar e recomeçar; P ou o botão Pausar interrompe a partida.

O evento de encontro dá um nome ao personagem encontrado. **Para cada … vivo de … na pista** permite
aplicar os blocos comuns de aparência, vida e animação. A família continua acessível depois de
recolher o original. As cópias de moldes participam da lista nativa de personagens vivos;
recolher devolve a instância ao motor sem misturar sua identidade com a onda seguinte.
**Quando encontrar alguém do molde** atende ondas futuras: o evento fica em **Eventos**,
recebe o molde pela lista e oferece o personagem encontrado às ações do corpo.
**Recolher do molde … quem saiu … px da tela** considera a projeção e preserva personagens que ainda vão chegar.
**Desenhar a barra de vida de** acompanha posição, escala e visibilidade do personagem na pista.

Nos dois motores, o sprite mantém imagem, animação, flip e opacidade. Sprites de texto e figuras
do básico também entram na pista. A projeção não altera seu tamanho físico. Use o evento da
pista para encontros: ele considera a passagem em profundidade, inclusive com movimento próprio.

## Três exemplos refeitos

| Exemplo | Aprendizado | Estrutura |
| --- | --- | --- |
| Jogo 2D | Controles, sprites, animação e coleta | Padrões de cópias e três eventos de encontro |
| Jogo 2D Avançado | Combinar ações reutilizáveis | Controles, movimento, vida, encontros, placar e telas nativas; exige seis estrelas na chegada |
| Canvas, sem extensão | Construir o funcionamento manual | Funções separadas para controles, atualização, projeção de cada item e desenho do quadro |

A arte original e as 108 colocações do percurso foram preservadas: 12 estrelas, 12 bandeiras,
12 manchas de gelo e 72 pinheiros. As versões com extensão incluem a animação **deslizar**.
Todos mantêm teclado, toque, pausa, três vidas e reinício. O Canvas deixa objetos, listas,
funções e contas de tempo visíveis para o estudo avançado.

| Medida | Jogo 2D | Jogo 2D Avançado | Canvas |
| --- | ---: | ---: | ---: |
| Blocos serializados antes, sem sombras | 1.084 | 1.086 | 1.130 |
| Blocos serializados agora, sem sombras | 42 | 92 | 1.137 |
| Comandos/eventos agora | 40 | 64 | 152 |
| Objetos de dados no percurso | 0 | 0 | 108 |
| Funções próprias no jogo | 0 | 0 | 5 |

Os blocos serializados incluem valores, estruturas e marcadores das áreas; essa contagem não
mede dificuldade sozinha. Comandos/eventos contam as instruções da IR e os corpos aninhados,
sem os valores.
O jogo completo inclui a decoração; a primeira atividade abaixo tem 18 comandos/eventos.

## Primeira atividade: pegar três estrelas

Use as imagens da Descida da Neve em um projeto com Jogo 2D. A criança começa com dois
cenários, um jogador e uma estrela. Sem bandeiras, gelo ou pinheiros nesta primeira montagem.

Em **Ao iniciar**:

1. Preparar a tela em 640 × 720.
2. Descrever o jogo e os controles.
3. Adicionar `neve-ceu` bem ao fundo.
4. Adicionar `neve-pista` atrás dos personagens.
5. Criar a pista `pista`.
6. Criar o sprite `jogador` com `neve-esquiador`, tamanho 26 × 42.
7. Animá-lo com `neve-esquiador-animado`, animação `deslizar`, repetindo.
8. Usá-lo como jogador da pista, com três vidas.
9. Habilitar setas e toque com movimento normal e espaço normal.
10. Percorrer a pista em ritmo normal até 1.800 passos.
11. Criar o sprite `estrela` com `neve-estrela`, tamanho 22 × 22.
12. Colocá-lo no centro da pista, distância 600.
13. Repeti-lo em linha: três estrelas a cada 480 passos.
14. Mostrar vidas e placar: Estrelas de 3.
15. Usar telas prontas, com título e instrução de pegar as estrelas.

Em **Eventos**, acrescentar **Quando o jogador encontrar estrela ou suas cópias**. Dentro,
colocar **Recolher o sprite encontrado** e **Somar 1 ao placar**. São mais três blocos,
totalizando 18 comandos/eventos. A criança pode experimentar outra lateral, velocidade ou
animação antes de acrescentar os obstáculos do exemplo completo.

Código correspondente para o educador conferir na Ponte; os objetos de configuração abaixo
são gerados pelos blocos normais de criação de sprite, não montados pela criança:

```javascript
SZGame2D.setupStage(640, 720, "#102d46");
SZGame2D.setStageDescription("Pegue três estrelas. Use setas ou arraste na pista.");
SZGame2D.addSceneBackdrop("ceu", "neve-ceu", "far");
SZGame2D.addSceneBackdrop("chao", "neve-pista", "back");
SZGame2D.createSpriteTrack("pista");
const jogador = SZGame2D.createSprite({ x: 0, y: 0, w: 26, h: 42, image: "neve-esquiador" });
SZGame2D.sceneAnimation(jogador, "neve-esquiador-animado", "deslizar", false);
SZGame2D.trackPlayer("pista", jogador, 3);
SZGame2D.trackControls("pista", 140, 120);
SZGame2D.trackTravel("pista", 320, 1800);
const estrela = SZGame2D.createSprite({ x: 0, y: 0, w: 22, h: 22, image: "neve-estrela" });
SZGame2D.putTrackSpriteAt("pista", estrela, "center", 600);
SZGame2D.repeatTrackSprite("pista", estrela, 3, 480, "line");
SZGame2D.trackHud("pista", "Estrelas", 3);
SZGame2D.sceneGameScreens("TRÊS ESTRELAS", "Pegue as três estrelas.");
SZGame2D.onTrackEncounter("pista", estrela, function () {
  SZGame2D.collectTrackItem();
  SZGame2D.trackScore("pista", 1);
});
```

## Introdução em etapas

1. Monte apenas cenário, pista e jogador. Experimente os controles e a animação.
2. Acrescente a estrela, as cópias e o evento de coleta da atividade acima.
3. Acrescente placar e telas prontas. Teste início, pausa e chegada.
4. Abra o exemplo completo para acrescentar bandeiras, dano, pinheiros e camadas transparentes.

A atividade curta tem 18 comandos/eventos ao final das etapas. O exemplo completo continua
como demonstração da arte e dos recursos; não precisa ser explicado inteiro na primeira aula.

## Outra composição: ondas de asteroides

No Avançado, em **Ao iniciar**, crie a pista, uma nave e um molde de asteroide. Use
**Na pista … acompanhar …** para escolher a nave. Em **A cada 1 segundo**, faça nascer um
asteroide, coloque-o à frente na pista, repita três vezes e dê velocidade de aproximação.
Use **Para cada … vivo de … na pista** para mudar aparência ou vida.

Em **Eventos**, acrescente **Quando encontrar alguém do molde** e selecione a pista e o molde
de asteroide. Dentro, use o nome do personagem encontrado para mudar sua vida ou aparência,
some um ponto e recolha o encontrado. O evento atende também as ondas que ainda não nasceram;
não precisa colocá-lo dentro do temporizador nem criar uma função.

Para uma animação de cenário sem encontros, dispense a nave: os alvos continuam se movimentando.

Essa composição tem testes de execução com três ondas, nove encontros e nove coletas, além de conversão
código → blocos → código, escopo do nome da cópia e validação das áreas do projeto.

## Manutenção e validação

`gen:snow-descent` gera as três IRs a partir das fontes; `check:snow-descent` verifica deriva.
`gen:server-examples` atualiza o índice. Os testes verificam conversão código/blocos,
salvamento/reabertura, as 108 posições, coleta de uma cópia, encontros em passos grandes,
animação, desenho, controles, pausa, chegada, derrota e reinício nos motores reais.

Os testes de navegador conferem a galeria e as versões com extensão em desktop e celular,
incluindo quadros reais da animação e console. A avaliação de compreensão por crianças ainda
depende de uma atividade observada; a redução técnica de blocos não substitui essa avaliação.


Os resultados da última revisão e das correções estão em
`.audits/architectural-analysis-2026-10-02-jogo-2d-pos-correcao.md`, na raiz do repositório.
