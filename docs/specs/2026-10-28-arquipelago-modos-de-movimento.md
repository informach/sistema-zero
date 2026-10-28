# Arquipélago: especificação dos modos de movimento

Escrita em 28/10/2026, a ponte que a dona pediu entre o levantamento de mecânicas de exploração
(`docs/pesquisa/2026-10-28-animacao-camera-controles.md`, seção 4) e o código. Cada modo tem:
como entra e sai, controles, números, animações do Blender, câmera e testes de aceitação. Os
números dos modos que já existem são os do código (com o arquivo); os dos modos novos são de
partida e mudam na sala de testes. Plano geral:
`docs/plans/2026-10-28-arquipelago-controlador-universal.md`.

## O contrato comum

Cada modo é um objeto com entrar, atualizar e sair, como nos modos de movimento de Psychonauts 2.
No código (`src/sistemas/modos/`, desde 28/10/2026), a atualização tem duas metades, porque o
Rapier fica entre elas (os modos são puros e não chamam o Rapier):

```ts
interface ModoDeMovimento {
  id: ModoDoCorpo
  /** O modo ainda tem onde se segurar? (o cipó e o tronco somem com a ilha) */
  valendo(c: EstadoDoCorpo, mundo: MundoDoMovimento): boolean
  /** Um passo da física: escreve o deslocamento pedido (ou o lugar) e diz quem leva o corpo:
   *  o controlador do chão, o do cipó (sem grudar no chão) ou direto. */
  passo(c: EstadoDoCorpo, e: EntradaDoPasso, mundo: MundoDoMovimento): 'chao' | 'cipo' | 'direto'
  /** Depois do controlador (o deslocamento de verdade e se pisou): acerta o lugar e troca de
   *  modo quando for a hora. Devolve se gastou o "usar". */
  depois(c, e, mundo, mov, pisou, aviso): boolean
}
```

- **Entrar** é uma função do modo que recebe o corpo e o objeto (`pegarCipo`, `agarrarTronco`), e
  o **pode entrar** é a pergunta que o modo do chão faz depois de cada passo (`cipoAoAlcance`,
  `troncoContra`). **Sair** é `mudarModo` com a velocidade deixada no `embalo` e no `velY`
  (soltar o cipó solta a corda; soltar o tronco marca a hora).
- `MODOS` (`sistemas/modos/index.ts`) liga cada `ModoDoCorpo` ao seu modo; o `personagem.tsx`
  chama o ativo, roda o controlador que ele pediu e desenha. Testes: `tests/modos.test.ts`.

- A `EntradaDoPasso` tem o controle (as ações, nunca o dispositivo, já na direção da tela), o
  corpo antes do passo e a hora; o `EstadoDoCorpo`, a posição, as velocidades, no chão ou não; o
  `MundoDoMovimento`, o que a ilha registrou por perto (`movimento.cipos`, `troncos`, `aguas` e
  os novos). Nada de React nem de three: os modos são regras puras em
  `sistemas/`, testadas sozinhas, e o `personagem.tsx` só liga o modo ativo ao Rapier e ao desenho.
- Transições guardam a continuidade: a velocidade de saída de um modo é a de entrada do outro
  (`embalo`), e nenhuma troca pode deixar o corpo preso dentro de um colisor (teste em cada modo).
- O avatar é sempre o mesmo corpo cinemático (cápsula de raio 0,35, do centro aos pés 0,9). Roupas,
  cabelo e acessórios nunca entram nas regras.
- Cada objeto que abre um modo vem do Blender com nome fixo (`escalada-*`, `cipo-*`, e os novos
  abaixo): colisor simples, área de entrada, pontos de entrada e saída e, quando precisa, uma
  trajetória em pontos amostrados.
- Os controles abaixo valem para teclado, toque e controle físico pelo mesmo `Controle`.

## Modos que já existem

### Chão e ar (`chao`)

- **Entra:** o começo do jogo; pisar depois de qualquer modo.
- **Controles:** mover (WASD, setas, joystick, analógico esquerdo) relativo à câmera; correr (Shift,
  joystick no fim do curso, gatilho); pular (espaço, botão Pular, botão de baixo); usar (E, botão
  Usar, botão da direita).
- **Números:** andar 2,2 m/s, correr 4,6 m/s, pulo 8,5 m/s, gravidade 24 m/s²; aceleração 18 e
  freio 24 m/s² no chão, 7 e 3 no ar; coyote time e jump buffer de 0,12 s; degrau de 0,45, sobe
  rampa de até 52°, escorrega acima de 60° (`personagem/personagem.tsx`, `sistemas/movimento.ts`,
  `sistemas/corpo.ts`).
- **Animações:** Idle (da plataforma), Andar e Correr na mesma fase, Pulo, Queda, Aterrissagem
  (`assets/avatar/locomocao.glb`, `sistemas/locomocao.ts`).
- **Câmera:** exploração (braço com colisão, transparência das copas, grua por cima do ombro).
- **Testes:** `tests/movimento-com-peso.test.ts`, `tests/locomocao.test.ts`; no navegador, andar
  2,28 m/s a 1,6 quadro por segundo, um toque um pulo.

### Nadar (dentro do `chao`, `nadando`)

- **Entra:** a água passa da cintura por 0,12 m (mar em `NIVEL_DA_AGUA`, lagos registrados em
  `movimento.aguas`). **Sai:** pisa e a cintura sai da água por 0,02 m.
- **Números:** 2,6 m/s, aceleração 6 e freio 4 m/s², sem pulo, a cintura boia na linha da água.
- **Animação:** Nado. **Câmera:** exploração.
- **Testes:** `tests/lago-do-bosque.test.ts` (o fundo e a rampa); no navegador, a cintura na linha
  da água no meio do lago.

### Cipó (`cipo`), o pêndulo controlado

- **Entra:** E perto da corda (1,3 m) ou as mãos passando a 0,65 m dela no ar. **Sai:** pular ou
  usar, com a velocidade do balanço vezes 1,15 e mais 3,2 m/s para cima.
- **Números:** bombear 9 m/s², ângulo máximo 63°, comprimento mínimo 1,6, encaixe em 0,22 s
  (`sistemas/cipo.ts`); a corda que se mexe é uma corrente Verlet de 18 elos (`sistemas/cordas.ts`).
- **Animação:** Pendurado, com as mãos fechadas na corda por IK (`personagem/bracos.ts`).
- **Câmera:** olha para o meio do cipó e segue mais devagar.
- **Testes:** `tests/movimento.test.ts` (balanço, bombear, soltar, pegar no ar).

### Escalar o tronco (`escalada`)

- **Entra:** andar contra a casca por 0,2 s, ou pular nela. **Sai:** pular (para longe e para
  cima, 4,5 e 6,5 m/s), descer até o chão ou usar.
- **Números:** sobe 1,7 m/s, de lado 1,6 m/s (`sistemas/escalada.ts`).
- **Animação:** Escalar, andando pela distância percorrida.
- **Testes:** `tests/movimento.test.ts`, `tests/movimento-do-bosque.test.ts`.

## Próximos modos (a demonstração do Bosque)

A sequência que ela propôs como marco de qualidade: chegar, andar sobre um tronco caído, escalar
uma árvore, agarrar um cipó, balançar até uma plataforma, subir à casa da árvore, achar um bicho e
descer pelo escorregador. Faltam quatro peças.

### Equilíbrio no tronco caído (`equilibrio`)

- **No Blender:** `equilibrio-1` (o eixo do tronco: dois pontos) e o colisor do tronco. Tronco
  largo (mais de 0,5 m de tampo) é chão normal e não precisa de modo.
- **Entra:** pisar no tampo do tronco estreito andando ao longo dele. **Sai:** chegar numa ponta
  ou pular.
- **Regra:** o movimento fica preso ao eixo; o pedido de lado vira uma inclinação que volta
  sozinha (correção suave). Kids não cai por erro pequeno: só sai do tronco pulando.
- **Números de partida:** 1,6 m/s ao longo do eixo, correção lateral em 0,3 s.
- **Animação nova no Blender:** Equilibrar (braços abertos, passo curto), no mesmo esqueleto.
- **Testes:** atravessar de ponta a ponta sem sair; pedir de lado não derruba; pular sai.
- **Feito em 28/10/2026** (`sistemas/modos/equilibrio.ts`, `EQUILIBRIO`): entra pisando no tampo
  andando ao longo do tronco (o passo a menos de 45° do eixo; de través passa por cima como chão),
  a mais de 0,15 m das pontas. O lado inclina até 0,25 rad e volta sozinho. Além de pular e das
  pontas, pedir o lado com força por 0,8 s desce para aquele lado com um passinho: um erro pequeno
  nunca derruba, mas quem subiu sem querer não fica preso. No Bosque, o tronco fica ao lado da
  trilha do lago (`TRONCO_CAIDO` no `bosque.py`, raio 0,19, tampo a 0,36 m: sobe-se pela ponta);
  na sala de testes, a estação "Tronco caído". Conferido no navegador: 5,5 m em 3,1 s, o lado por
  0,4 s não tira do tronco e na ponta sai andando.

### Subir a escada ou o cipó vertical (`escada`)

- **No Blender:** `escada-*` com o eixo (base e topo) e o ponto de saída no topo. A escada em
  espiral da casa na árvore é chão (degraus); este modo é para escada reta e corda vertical.
- **Entra:** E ou andar contra a escada na base. **Sai:** no topo, o corpo vai até o ponto de
  saída (sem ficar preso na borda); embaixo, solta; pular solta para trás.
- **Números de partida:** 1,5 m/s; o encaixe no eixo em 0,2 s (o mesmo do cipó).
- **Animação nova:** Subir Escada, andando pela distância (como o Escalar).
- **Testes:** subir e sair no topo sem prender; descer e sair embaixo; pular solta.
- **Feito em 28/10/2026** (`sistemas/modos/escada.ts`, `ESCADA`): embaixo, andar contra os degraus
  por 0,15 s pega (no ar, na hora); em cima, no deque, andar para a escada a menos de 0,9 m do alto
  pega para descer. Frente e trás sobem e descem a 1,5 m/s; no alto, pedindo para subir, o corpo
  sobe e avança até a saída em 0,4 s; embaixo solta com um passinho para trás; usar solta onde está.
  No Bosque, uma escada de mão de 4,2 m até o deque da T4 (onde começa o escorregador: dá para subir
  e escorregar de novo), a 60° da borda, com o guarda-corpo aberto ali (`ESCADA_RETA` no
  `bosque.py`); os degraus colidem como tábua fina, só para o corpo. Na sala de testes, a estação
  "Escada" (torre de 3 m). Conferido no navegador nos dois.

### Agarrar a borda e subir (`borda`)

- **No Blender:** as bordas pegáveis marcadas (`borda-*`: segmento da quina e a normal para fora),
  nos deques e na casa na árvore.
- **Entra:** no ar, caindo, com as mãos a até 0,35 m da borda e espaço para o corpo pendurado
  (consulta de forma no Rapier); a assistência de alcance aceita até 0,25 m de erro. **Sai:**
  frente sobe (o corpo vai do pendurado ao ponto em cima da borda em 0,5 s, a animação ajustada ao
  alvo); trás solta; pular sai para longe da parede.
- **Animações novas:** Pendurar na Borda, Subir a Borda.
- **A ajuda escondida de hoje:** o degrau automático do Rapier também vale no ar, então no alto do
  pulo o pé ainda sobe 0,45 e a beirada mais alta fica em uns 1,95 m em vez de 1,5 (medido na sala
  de testes, `/movimento`, em 28/10/2026). Com este modo, o degrau no ar sai (o controlador só sobe
  degrau pisando) e quem alcança a beirada passa a fazer isso pendurando e subindo, à vista. Antes
  de tirar, medir de novo os pulos do percurso nas copas.
- **Testes:** agarra quando chega perto; não agarra sem espaço; subir termina em pé e livre.

### Escorregar (`escorregar`)

- **No Blender:** a trajetória do escorregador em pontos amostrados (`escorregador-curva`); hoje há
  só a âncora `escorregador-fim`.
- **Entra:** pisar no começo da pista. **Sai:** no fim, com a velocidade virando embalo no chão
  (continua correndo um pouco).
- **Regra:** o corpo segue a curva; a velocidade cresce com a inclinação
  (`a = g × (sen θ − μ × cos θ)`, com o atrito do material da pista); um pouco de controle de lado
  dentro da pista.
- **Animação nova:** Escorregar (sentado, braços para trás). **Câmera:** atrás, olhando à frente.
- **Testes:** a descida é sempre igual (mesmo tempo, mesma saída); o percurso nas copas continua
  dentro do tempo-alvo; sai correndo sem tropeçar.

## Modos das outras ilhas (decididos só em linhas gerais)

Ficam para quando cada ilha chegar, sobre o mesmo contrato:

| Modo | Ilha | O que já está decidido |
|---|---|---|
| Mergulho | Recife | Volume de água por sensor; superfície, mergulho e emergir; corrente como velocidade somada; sem fôlego que castiga no Kids |
| Barco | Recife | Assistido para a travessia; flutuação física (a do tronco do lago) para boias e caixas |
| Patins | Vila Doce | Inércia nas regras (o cinemático não desliza pelo atrito): aceleração gradual, freio menor ao soltar, freio próprio |
| Gelo e trenó | Pico Gelado | Inércia e gravidade nas encostas; descidas longas por trajetória; trenó controlado antes do dinâmico |
| Planar | Pico Gelado, copas, Nuvens | Descida lenta, deslocamento horizontal, correntes ascendentes |
| Montaria | Vale dos Dinos | Vínculo lógico e visual com o assento do esqueleto do bicho; o controle passa para o controlador dele |
| Balão | Nuvens | Calmo: subir, descer, vento |
| Plataforma móvel | Várias | Corpo cinemático que carrega o personagem (o controlador do Rapier acompanha) |

## Como avaliar cada modo

Os quatro critérios do levantamento: resposta (o comando aparece na hora), previsibilidade (o mesmo
gesto dá o mesmo resultado), continuidade (as trocas guardam a velocidade) e recuperação (errar não
castiga: sai, solta, tenta de novo). Assistência de alcance opcional e pontos de recuperação perto
valem para Kids e Adultos.
