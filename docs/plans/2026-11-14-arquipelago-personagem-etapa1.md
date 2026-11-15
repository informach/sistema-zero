# Arquipélago: etapa 1, o personagem novo e a pista de conferência

Data: 14/11/2026. Base: o levantamento `2026-11-14-arquipelago-personagem-levantamento.md`, com as
decisões D1 a D6. O pedido à arte que anda junto desta etapa está em
`2026-11-14-pedido-arte-personagem.md`.

## Objetivo

O avatar do pack volta a andar, correr, pular, cair e subir escada no jogo, já na estrutura
definitiva:
- as medidas do corpo saem do esqueleto e da escala que o mundo declara;
- as animações do pack são importadas sem deslocamento;
- os pés se ajustam ao chão por IK;
- os acessórios usam os ossos novos.

A pista de conferência passa a ser o lugar onde o personagem é ajustado e onde as entregas da
arte são conferidas.

O mundo de hoje continua no ar só para a equipe, pela ponte de escala 1,85 (D1). Os mundos novos
vão declarar escala 1.

## Fora desta etapa

- Os modos que dependem de animações que o pack não tem (nadar, borda, cipó, equilibrar,
  escorregar, sentar, deitar, montar, planar, patinar). Nesta etapa eles usam uma pose de reserva
  (seção 1.4) e ganham a animação própria quando a arte entregar.
- O salvamento por ilha, a Morada, os mundos novos e a casa livre. Cada um terá a sua etapa.

## 1.1 O contrato do personagem no catálogo

O `avatar:migrar` (`scripts/avatar/`) passa a levar para o `catalog.generated.ts`, na parte
`base.skeleton`, dados que hoje só existem no catálogo do esqueleto, no repositório de arte:

- **Ossos em repouso:** posição de cada osso na pose de descanso, em metros. Vem de
  `lista_ossos[].cabeca`.
- **Pontos de encaixe:** osso + deslocamento, vindos de `pontos_de_segurar`, mais os que a arte
  acrescentar (pedido, seção 3).
- **Por clipe:** duração, laço, passada (deslocamento horizontal do `Hips` por ciclo), subida
  (deslocamento vertical do `Hips`) e, quando a arte entregar, os quadros em que cada pé toca o
  chão.

Os números são medidos uma vez, na migração. Os testes do Sistema Zero leem o catálogo, sem
baixar nenhum GLB, porque os arquivos ficam no bucket privado e não chegam ao CI.

O `avatar:conferir` passa a apontar quando essas medidas mudam na arte. Uma passada nova muda a
velocidade do personagem, e isso precisa aparecer.

Teste: `core/src/avatar/avatar.test.ts` confere que cada clipe usado pelo jogo existe, tem passada
quando é de andar ou correr, e que os ossos que o jogo procura existem.

## 1.2 As medidas do corpo (puro, no core)

`medidasDoCorpo(esqueleto, escala)` vai em `@sistemazero/core/avatar`, num arquivo novo
(`corpo.ts`). Ela devolve, em metros:

- altura;
- olhos (topo do rosto, quando a arte não der o ponto);
- topo da cabeça;
- ombro;
- quadril;
- mão com o braço caído (do comprimento do braço);
- alcance acima da cabeça;
- largura do tronco;
- raio da cabeça;
- comprimento da perna e do pé.

Dessas medidas sai o **corpo físico**: a cápsula (raio e altura), a distância do centro ao pé e a
linha d'água, por regras escritas uma vez só. As regras são calibradas para que, **na escala
1,85, o corpo derivado fique a no máximo 10% das constantes de hoje** (`CORPO` em
`sistemas/corpo.ts`). Isso protege os 60 a 70 testes do mundo atual, e o teste diz qual número
mudou e quanto.

Teste novo: `core/src/avatar/corpo.test.ts`, com um esqueleto de exemplo e o do catálogo.

## 1.3 O mundo declara a escala e a física

Cada mundo passa a ter uma declaração (`MundoDoJogo`):
- a escala do herói;
- as regras de física: gravidade, degrau automático, rampa que sobe, rampa que escorrega,
  velocidade do pulo e folga.

| Mundo | Escala | Física |
|---|---|---|
| Atual | 1,85 | a de hoje: gravidade 24, degrau 0,45, rampa 52°, escorrega acima de 60°, pulo 8,5 |
| Novos | 1 | as regras de jogo da arte: degrau 0,4, rampa 30°, pulo de 1,5 × 3 m |

O `CORPO` deixa de ser uma constante importada por 51 arquivos e vira `corpoDoMundo(catálogo,
mundo)`, guardado no estado do jogo:
- os componentes leem pelo contexto;
- as funções puras recebem o corpo como parâmetro;
- os testes montam o corpo do mundo atual uma vez só (ajudante em `tests/`).

Com isso, a troca de mundo troca o corpo sem recarregar a página.

O trabalho é mecânico, mas longo. Vai em levas por pasta (`sistemas/modos`, `sistemas`,
`personagem`, `mundo`), e cada leva fecha com a suíte daquela parte verde.

Também viram derivadas do corpo as constantes soltas que o levantamento achou:
- câmera: foco nos olhos, peito, conversa e mergulho;
- Zappy no ombro;
- passarinho acima da cabeça;
- esmaecer de copas e telhados;
- alturas de agarrar da borda, da escalada e do cipó;
- assento, cama e sela;
- barra do planador;
- lanterna.

Os testes que copiavam a cápsula à mão (`casa-na-arvore`, `colisao-da-ilha-central`,
`colisores-da-ilha`) passam a usar o ajudante.

## 1.4 As animações do pack no jogo

- **`semDeslocamento(clipe, osso)` (puro):** tira do `Hips` o deslocamento horizontal (andar,
  correr, subir escada) e o vertical do pulo (a física é quem sobe). Deixa o balanço do passo,
  para a animação ficar no lugar. Os arquivos do pack não mudam: a troca é feita na carga.
- **A regra de locomoção** (`sistemas/locomocao.ts`) troca os 19 clipes Mixamo pelos do pack:

  | Situação | Clipe do pack |
  |---|---|
  | parado | `parado_relaxado` |
  | andar | `andar_frente` |
  | correr | `correr_frente` |
  | pulo | `pulo_inicio` → `pulo_no_ar` → `pulo_fim` |
  | queda longa | `cair` |
  | escada de mão | `subir_escada` |
  | agachado (uso futuro) | `agachado_*` |

  - A velocidade de andar e de correr sai da passada medida (1.1) vezes a escala.
  - A cadência segue o teto de hoje (1,8 ciclo por segundo).
  - Andar de lado e de costas ficam para depois: o corpo vira para onde anda, como hoje.
- **O mixer é controlado pelo jogo,** como no caminho antigo (molde em `56eefdc61^`):
  - o `PackAvatarRig` recebe os clipes em `extraClips`;
  - o jogo assume as ações em `onAnimations`, com escala de tempo 0;
  - a cada quadro, a regra decide o peso e o tempo de cada clipe;
  - na pausa nada anda: corrige o achado de que a pausa não congelava a pose.
- **Poses de reserva** para os modos que ainda não têm animação. Cada uma é trocada quando a arte
  entregar a animação própria:

  | Modo | Reserva |
  |---|---|
  | nado | `pulo_no_ar`, com o corpo inclinado |
  | borda e cipó | `pulo_no_ar`, com as mãos pelo IK (1.5) |
  | escalada | `subir_escada` |
  | equilíbrio | `andar_frente` devagar |
  | escorregar | `agachado_frente`, parado |
  | sentar e deitar | `parado_relaxado`, com o corpo no lugar do assento |
  | montar | `agachado_frente`, parado |
  | planar | `pulo_no_ar` |
  | patins | `andar_frente`; os patins só aparecem quando a arte entregar |

- **No jogo, o rig não faz a "cabine"**, a animação de encolher e girar enquanto as peças
  carregam. Ganha uma propriedade para desligar isso. O retrato e o medidor continuam achando o
  nó `avatar-visual`.

Testes:
- `semDeslocamento` com um clipe montado à mão;
- a regra de locomoção com os números do catálogo;
- pés sem patinar: a velocidade do corpo bate com a passada vezes a cadência, na escala do mundo.

## 1.5 IK dos pés e das mãos

- **IK de dois ossos** (coxa e canela, braço e antebraço), puro e testado. Generaliza o que hoje
  existe só nos braços do cipó (`personagem/bracos.ts`).
- **Pés:** um raio desce de cada pé até o chão de colisão. O quadril baixa o necessário e cada
  perna se ajusta no degrau e na rampa. Só vale no chão, andando devagar ou parado. Desliga no
  ar, no nado e montado.
- **Mãos:** o cipó passa a usar os ossos do esqueleto novo (`LeftArm`, `LeftForeArm`,
  `LeftHand`…), com o comprimento do braço tirado do catálogo. A escada, a borda e o tronco
  ganham alvos de mão vindos dos pontos que os modos já calculam (`c.maos`, as quinas, os
  degraus). É o primeiro uso dos pontos de interação da D6.
- **Lanterna:** presa no `RightHandProp`.

Teste: IK com braço e perna de comprimentos conhecidos (alcance, cotovelo para o lado certo,
alvo fora de alcance).

## 1.6 Um avatar só

- O fantasma da família usa o `PackAvatarRig` com o material translúcido de hoje e o clipe de
  correr do pack. Nesta etapa vai com o avatar padrão do pack. Usar o avatar de quem correu pede
  guardar as peças junto do fantasma, e isso fica para a etapa do salvamento.
- O pé do fantasma passa a ser calculado igual ao do jogador. Hoje ele não desconta a folga.
- Os moradores ficam como estão (têm modelos próprios). A escala deles é revista na etapa dos
  mundos novos.

## 1.7 A pista de conferência

A sala de movimento (`playground/sala-de-movimento.ts`, rota `/movimento`) vira a pista:

- **Estações calculadas pelas regras do mundo declarado:**
  - degrau que sobe e degrau que não sobe;
  - rampa que sobe e rampa que escorrega;
  - vão que o pulo passa e vão que não passa;
  - beirada que agarra;
  - escada de mão, tronco caído, escorregador e laguinho.
  
  Ela roda com os dois mundos: o atual (escala 1,85) e o novo (escala 1).
- **Uma foto por estação:** o personagem faz a ação sozinho, por um roteiro de entrada, e a foto
  é comparada com a referência aprovada. O roteiro segue o molde dos scripts
  `playground/verificar-*-browser.ts`.
  - As referências são aprovadas por você, numa página com as fotos.
  - Depois disso, uma diferença acima do limite reprova.
- **Peças reais da biblioteca entram na pista quando o sistema de conteúdo existir** (etapa dos
  mundos novos). Nesta etapa a pista usa a geometria calculada que já tem.

## 1.8 O que sai no fim da etapa

Sai só quando o caminho novo cobrir tudo:
- `assets/avatar/locomocao.glb`;
- `arte/avatar/mixamo.py`;
- os testes que abrem o esqueleto Mixamo (`locomocao.test.ts` no bloco do GLB, `patins-nos-pes.test.ts`);
- o `AvatarRig` antigo, se o fantasma já não o usar.

Os 43 MB de `public/avatar3d` dos apps saem junto, porque a plataforma já não os usa. É preciso
conferir se o palco de gravação ainda copia a pasta.

## Ordem e entregas

1. **1.1 e 1.2: o contrato e as medidas.** Puro, com teste.
2. **1.3: o mundo declara.** Em levas por pasta, cada uma com a suíte verde.
3. **1.4: as animações.** É aqui que o boneco volta a andar no jogo.
4. **1.5: o IK.**
5. **1.6: um avatar só.**
6. **1.7: a pista**, com as fotos de referência aprovadas por você.
7. **1.8: a limpeza.**

Cada passo termina com:
- os testes do pacote tocado verdes, um pacote por vez;
- o typecheck pelo CI;
- um commit;
- para o que muda a tela, prints na pista.

O jogo vai para a staging ao fim dos passos 3, 5 e 6, para a equipe jogar.

## Riscos

- **A troca do `CORPO` (1.3) mexe em muitos arquivos.** As levas por pasta e o limite de 10% na
  escala 1,85 seguram o mundo atual. Se um teste acusar mais de 10%, a regra do corpo é ajustada;
  o número velho não é escrito à mão.
- **O deslocamento no `Hips` pode ter mais que só a translação**, por exemplo um giro no ciclo. A
  passada medida na migração (1.1) mostra. Se o pé escorregar, a pista mostra na foto.
- **As poses de reserva ficam estranhas** nos modos sem animação. É aceitável porque o jogo só
  abre para a equipe. A ordem do pedido à arte prioriza os modos mais usados.
