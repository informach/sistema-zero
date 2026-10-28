# Arquipélago: especificação dos modos de movimento

Escrita em 28/10/2026, a ponte que a dona pediu entre o levantamento de mecânicas de exploração
(`docs/pesquisa/2026-10-28-animacao-camera-controles.md`, seção 4) e o código. Cada modo tem:
como entra e sai, controles, números, animações do Blender, câmera e testes de aceitação. Os
números dos modos que já existem são os do código (com o arquivo); os dos modos novos são de
partida e mudam na sala de testes. Plano geral:
`docs/plans/2026-10-28-arquipelago-controlador-universal.md`.

## O contrato comum

Cada modo é um objeto com quatro partes, como nos modos de movimento de Psychonauts 2:

```ts
interface ModoDeMovimento {
  id: ModoDoCorpo
  /** Pode entrar agora? (o corpo, o que está perto, o que a pessoa pede) */
  podeEntrar(contexto: ContextoDoMovimento): boolean
  entrar(contexto: ContextoDoMovimento): void
  /** Um passo da física (sempre `PASSO_DA_FISICA`): devolve o deslocamento pedido ao Rapier. */
  passo(contexto: ContextoDoMovimento, dt: number): void
  /** Sai deixando a velocidade para o próximo (soltar o cipó vira pulo; o fim do escorregador
   *  continua correndo). */
  sair(contexto: ContextoDoMovimento): void
}
```

- O `ContextoDoMovimento` tem o controle (as ações, nunca o dispositivo), o corpo (posição,
  velocidade, no chão ou não), o que a ilha registrou por perto (`movimento.cipos`, `troncos`,
  `aguas` e os novos) e a hora do jogo. Nada de React nem de three: os modos são regras puras em
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

### Subir a escada ou o cipó vertical (`escada`)

- **No Blender:** `escada-*` com o eixo (base e topo) e o ponto de saída no topo. A escada em
  espiral da casa na árvore é chão (degraus); este modo é para escada reta e corda vertical.
- **Entra:** E ou andar contra a escada na base. **Sai:** no topo, o corpo vai até o ponto de
  saída (sem ficar preso na borda); embaixo, solta; pular solta para trás.
- **Números de partida:** 1,5 m/s; o encaixe no eixo em 0,2 s (o mesmo do cipó).
- **Animação nova:** Subir Escada, andando pela distância (como o Escalar).
- **Testes:** subir e sair no topo sem prender; descer e sair embaixo; pular solta.

### Agarrar a borda e subir (`borda`)

- **No Blender:** as bordas pegáveis marcadas (`borda-*`: segmento da quina e a normal para fora),
  nos deques e na casa na árvore.
- **Entra:** no ar, caindo, com as mãos a até 0,35 m da borda e espaço para o corpo pendurado
  (consulta de forma no Rapier); a assistência de alcance aceita até 0,25 m de erro. **Sai:**
  frente sobe (o corpo vai do pendurado ao ponto em cima da borda em 0,5 s, a animação ajustada ao
  alvo); trás solta; pular sai para longe da parede.
- **Animações novas:** Pendurar na Borda, Subir a Borda.
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
