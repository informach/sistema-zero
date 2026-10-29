# Saltos entre nuvens, corrida de balão e constelações, fase4-07

**Objetivo:** a aventura da Ilha das Nuvens (proposta: "Saltos entre nuvens, corrida de balão,
constelações escondidas"; coleção "Estrelas e constelações").
**Arquitetura:** os saltos no percurso genérico (`sistemas/percurso.ts`, `mundo/corrida-na-ilha.tsx`);
a corrida de balão com regra pura própria (`sistemas/corrida-de-balao.ts`) e a mesma tela de
cronômetro e resultado; as constelações com regra pura (`sistemas/constelacoes.ts`), o mirante em
`mundo/constelacoes-das-nuvens.tsx` e o visor em `interface/estrelas.tsx`. Tudo montado pelo
`NuvensVivo`, só com a ilha completa ativa. Arte que já existe; nenhum `.glb` nem gerador muda.

## Salvamento: nada é gravado (pedido de campos para a versão nova)

O pior caso tem 29 bytes de folga e `PERCURSOS` não pode crescer. Por isso os recordes das duas
corridas e as constelações achadas valem só na sessão (a loja guarda, o salvamento não). Os ids
das corridas ficam fora de `PERCURSOS` (`PERCURSOS_DA_SESSAO` em `sistemas/percurso.ts`). Campos
pedidos para a versão nova do salvamento (Vale e Nuvens juntos):

| Campo | Formato | Pior caso |
|---|---|---|
| `percursos['nuvens-saltos']` | o `ResultadoDoPercurso` de sempre (3 estrelas e o melhor tempo) | ~90 B |
| `percursos['nuvens-balao']` | idem | ~90 B |
| `nuvens.constelacoes` | número de 0 a 63, um bit por figura | ~20 B (`,"nuvens":{"constelacoes":63}`) |

Com a versão nova, `percursoGravado` passa a aceitar os dois ids, e a tela já mostra o melhor de
sempre.

## Decisões

### Saltos entre nuvens (`nuvens-saltos`)

- **Largada** no chão, antes do primeiro degrau de nuvem (−10,3; −2,2 no modelo), virada para os
  degraus: "Começar os saltos entre nuvens".
- **Paradas:** o terceiro degrau de nuvem e as plataformas 1, 2 e 3; **chegada** no tampo da
  plataforma 4 (`topo-plataforma-4`), lá no alto. Os tampos se movem (fase4-06): cada parada conta
  com o pé acima do tampo na posição de baixo, e a chegada vale em qualquer altura do ciclo (o
  teste confere as 20 s do ciclo).
- **Queda:** voltar ao chão da ilha leva à última parada pelo corte suave. Numa plataforma, a volta
  é o tampo dela onde ele estiver agora (mais 0,3 m de folga, que o tampo anda até 0,16 m no
  corte).
- **Fitas do arco-íris** (a terceira estrela): três, uma em cada vão entre as plataformas, no meio
  do vão, na altura do pulo. O terceiro degrau fica por baixo da beira da plataforma 1 (dele para
  ela é um passo, sem vão), então ali não há fita. O teste confere que a parábola do pulo correndo,
  saindo da beirada (ou até 0,3 m antes) no momento em que as duas plataformas param, passa a menos
  de 0,64 m de cada fita (80% do alcance de pegar).
- **Tempo-alvo 60 s.** Cada salto entre plataformas só cabe na janela em que a de trás está no alto
  e a da frente embaixo, as janelas vêm a cada 10 s, e a plataforma 1 só recebe do degrau quando
  está embaixo. O teste conta a volta sem perder nenhuma janela em cada fase do ciclo na largada:
  no pior caso, 54,5 s. 60 s dá a estrela a quem não perde nenhuma janela.

### Corrida de balão (`nuvens-balao`)

- **Seis argolas** grandes e de pé, uma de cada cor do arco-íris (as cores dos `fio1` a `fio6`), em
  volta da ilha, a 15 m do meio, na volta que fica livre das plataformas, da árvore do ninho e do
  mirante (de −60° a 110°). Raio de 4,2 m: o balão inteiro passa dentro (o envelope tem 2,35 m de
  raio). Desenhadas no código (toro), como as coisas de pegar dos percursos.
- **Passar por dentro** conta quando o meio do balão (3,3 m acima da base do cesto) cruza o plano da
  argola a menos de 1,8 m do meio dela, na ordem. A primeira argola começa a corrida (o
  cronômetro aparece); a sexta é a chegada.
- **Fitas do arco-íris:** três, uma entre as argolas 1 e 2, 3 e 4, 5 e 6, um pouco fora da linha
  reta. O balão pega a 1,6 m do meio dele.
- **Tempo-alvo 45 s.** Um piloto no teste, que voa pelas regras do balão (`passoDoBalao`) e freia
  chegando, faz a volta em 28,8 s pegando as três fitas. 45 s dá a estrela a quem pilota com calma.
- **Ajuste no balão (fase4-09):** soltando o fogo, o embalo para cima freia a 1,5 m/s² (uns 1,1 m)
  em vez de 0,7 m/s² (2,3 m). Com o freio antigo o piloto passava 2,2 m acima das argolas: ficaria
  difícil para uma criança acertar a altura. A descida continua a 0,7 m/s.
- **Desistir:** descer do balão no meio da corrida ou "Parar". "Correr de novo" volta a esperar a
  primeira argola (sem levar o balão a lugar nenhum).

### Constelações escondidas

- **O mirante** (`nuvens-constelacoes.glb`) fica onde o arquivo diz, no mesmo referencial do
  `nuvens.glb` (meio em −6; −8). Como ainda não há âncora `mirante` no `nuvens.glb`, o lugar fica
  na constante `MIRANTE_DAS_NUVENS`, conferida por teste contra os colisores (chão livre e alcance
  a pé). Carga privada, sai com a ilha. Os 16 colisores do mirante entram junto.
- **De dia** "Olhar pela luneta" faz o Zappy dizer que as estrelas só aparecem à noite.
- **À noite** abre a vista pela luneta: a câmera vai para a frente do tubo e as setas (ou o
  direcional, ou os quatro botões do visor, para o toque) miram o céu. Mirar uma figura (o centro
  das estrelas dela a menos de 7° do meio da vista; o pivô do nó fica fora do desenho) por 1,2 s a
  acende: as estrelas aparecem uma por uma em 1 s (todas de uma vez com menos movimento), as linhas
  entram por último e o Zappy diz o nome dela. O tubo da luneta acompanha a mira.
- **Escondidas:** a olho nu, a figura não achada não aparece. Pela luneta ela aparece bem fraca
  (estrelas a 30% de opacidade, sem linhas), para a criança ter o que procurar. Achada, fica acesa
  todas as noites da sessão. Seis figuras: a arara, o balão, o vagalume, o peixe, o farol e a nota
  musical.

## Pedidos de arte

1. `nuvens.glb`: âncora `mirante` no meio do deque do mirante (−6; 1; −8 no modelo), para o jogo
   trocar a constante `MIRANTE_DAS_NUVENS` pela âncora.
2. (Opcional) Um modelo de argola de nuvem para a corrida de balão; hoje as argolas são toros
   desenhados no código.
   Feito em 29/10: `nuvens-argola.glb` (`arte/ilhas-b/argola_nuvem.py`), tufos de nuvem por fora
   de uma faixa no raio 4,2 que o jogo pinta com a cor de cada argola; o toro fica só enquanto o
   arquivo carrega.

## Etapas

- [x] Percurso: ids da sessão fora de `PERCURSOS`, recorde da sessão na loja, a tela sem família
  para eles.
- [x] Saltos: pontos, fitas, plataformas que andam (volta viva), testes de alcance e da chegada no
  ciclo inteiro.
- [x] Corrida de balão: regra pura, argolas, fitas, testes (cruzar, ordem, tempo, desistir) e
  conferência das argolas contra os colisores.
- [x] Constelações: regra pura (mira, acender, nomes), mirante e colisores, vista, visor, testes.
- [x] `playground/verificar-nuvens-aventura-browser.ts`, computador e celular emulado.
- [x] Regras, `CLAUDE.md`, revisão completa, testes, tsc e Biome, commit local e merge no staging.

## Resultado (29/10/2026)

- Testes novos: `saltos-das-nuvens.test.ts` (8: tampos com a ilha girada, largada a pé, fitas no
  pulo, chegada em todo o ciclo, paradas em qualquer altura, queda e volta viva, tempo-alvo pelas
  janelas), `corrida-de-balao.test.ts` (6: cruzar a argola, ordem, fitas, argolas e fitas livres
  dos colisores, e o piloto que completa a volta com as três fitas), `constelacoes.test.ts` (9:
  mira, busca, acender, textos, mirante livre e alcançável a pé até a luneta, as seis figuras
  separadas e dentro da inclinação, 57 estrelas). Os do balão continuam passando com o freio novo.
- Navegador: `verificar-nuvens-aventura-browser.ts` aprovado no computador e no celular emulado:
  saltos (começar, paradas, queda e volta para a plataforma 2, chegada e a tela sem recordes da
  família), o aviso da luneta de dia, a corrida de balão (a vermelha começa, a laranja conta,
  "Parar" tira o cronômetro, pousar e descer) e, de noite, a arara achada pela mira (no celular,
  também os botões do visor). O `verificar-nuvens-browser.ts` da fase4-06 (pulos de verdade até a
  plataforma 4) continua aprovado. Prints e limites em `docs/qa/2026-10-29-nuvens-aventura/`.
- Achados na conferência e corrigidos: os colisores da ilha preparada vêm girados (os pontos dos
  saltos giravam duas vezes); o painel aberto conta como pausa (as estrelas não acendiam na
  vista); a neblina apagava as estrelas; a classe `arq-estrelas` já era da tela de resultado; a
  dica da câmera tomava o lugar da fala da luneta.
- Na conferência a máquina estava com pouca memória livre (1,2 a 2,3 GB de 16): duas rodadas
  estouraram tempo esperando a ilha carregar e passaram depois, com cada parte num contexto novo.
