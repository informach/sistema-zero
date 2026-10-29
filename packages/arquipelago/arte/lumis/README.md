# Lumis e o borrão do Cinza

Lote 3 do `arte/INVENTARIO.md`. Os Lumis são criaturinhas de luz que nascem do Cinza. À noite os
borrões de névoa saem e desbotam o que está fora; a lanterna prende um borrão e ele vira um Lumi
colorido da família da ilha. Cada ilha do anel tem uma família com duas espécies, a comum e a rara, e
a sua ilha (a praia) também.

Tudo é gerado por script no Blender sem tela (o mesmo `bpy` do Zappy e das peças do quarto):

```sh
/tmp/claude-0/blender-venv/bin/python arte/lumis/build_all.py   # todos os GLB e o relatorio.json
/tmp/claude-0/blender-venv/bin/python arte/lumis/bosque.py      # só uma família
```

Os arquivos saem em `src/assets/lumis/<id>.glb` (o borrão em `borrao.glb`). Ainda não estão ligados
ao jogo: o sistema de Lumis vem depois e, até lá, eles ficam só como arquivo.

## As famílias

| Ilha | Lumi | Raridade | Jeito de ser |
|---|---|---|---|
| Bosque dos Bichos | **Pitanga** (`pitanga`) | comum | Rápida e espevitada: chega primeiro em qualquer canteiro. |
| Bosque dos Bichos | **Ipê** (`ipe`) | rara | Tem mão boa para plantas: o que ela rega cresce mais bonito. |
| Vila Doce | **Quindim** (`quindim`) | comum | Caprichoso na cozinha: mexe a panela sem deixar queimar. |
| Vila Doce | **Brigadeiro** (`brigadeiro`) | raro | Festeiro: quando comemora, o granulado acende e anima a turma. |
| Recife Coral | **Bolha** (`bolha`) | comum | Nada como ninguém: busca coisas no fundo da água. |
| Recife Coral | **Pérola** (`perola`) | rara | Acha coisas perdidas e guarda cada achado na concha. |
| Pico Gelado | **Gelinho** (`gelinho`) | comum | Paciente e firme: faz trabalho comprido sem cansar. |
| Pico Gelado | **Cristal** (`cristal`) | raro | Brilha mais forte à noite: uma lanterna de gelo que anda. |
| Vale dos Dinos | **Ovinho** (`ovinho`) | comum | Pula alto: alcança frutas e prateleiras. |
| Vale dos Dinos | **Brotinho** (`brotinho`) | raro | Fortão: carrega as cargas mais pesadas no lombo. |
| Ilha das Nuvens | **Algodão** (`algodao`) | comum | Levinho: flutua por cima de buracos e poças. |
| Ilha das Nuvens | **Pluma** (`pluma`) | rara | Voa rápido: leva recados de ilha em ilha. |
| Sua ilha (praia) | **Estrelinha** (`estrelinha`) | comum | Fuçadora: acha conchas escondidas na areia. |
| Sua ilha (praia) | **Búzio** (`buzio`) | raro | Escuta o mar: acha os achados mais raros da maré. |

Os nomes da família da praia (Estrelinha e Búzio) e o jeito de ser dos dois são provisórios até a
dona confirmar.

Como eles são:

- **Pitanga**: a frutinha vermelha com gomos, cabinho com duas folhas e uma gotinha de luz na ponta.
- **Ipê**: um broto verde em gota com um cachinho de flores de ipê-rosa na cabeça e folhas de orelha.
- **Quindim**: o doce amarelo e brilhante em cima da base de coco ralado, de touca de cozinheiro.
- **Brigadeiro**: bolinha de chocolate com granulado colorido (os dourados acendem) na forminha,
  de chapeuzinho de festa.
- **Bolha**: água-viva lilás com saia translúcida, pintinhas de luz no domo e tentáculos enroladinhos.
- **Pérola**: uma pérola com carinha e o leque de vieira atrás, com uma conta de luz no alto.
- **Gelinho**: cubo de gelo de quinas redondas com neve em cima.
- **Cristal**: pedra de gelo lapidada (facetas retas), lascas nas costas e um floco de neve aceso.
- **Ovinho**: dinozinho saindo do ovo, com a tampa da casca de chapéu e espinhos macios.
- **Brotinho**: saurópode bebê de quatro patas, placas de samambaia acesas nas costas e um broto na
  cabeça.
- **Algodão**: nuvem fofa com uma gotinha de chuva no alto. A luz dele é azul de chuva: o coração e a
  gotinha acendem juntos (com o coração rosa pequeno e a gota apagada, ele sumia à noite).
- **Pluma**: passarinho redondo com penacho e rabo de arco-íris.
- **Estrelinha**: estrela-do-mar fofa cor de laranja, com bolinhas claras em fila em cada ponta (na
  frente e nas costas) e a pontinha de cada ponta acesa. Os braços são as pontas dos lados.
- **Búzio**: bolinha cor de água com a conchinha de búzio em espiral nas costas (cor de areia, com a
  listra coral no sulco e a ponta acesa) e duas anteninhas de caracol com gotinhas de luz.

## O que todo Lumi tem

- **Coraçãozinho de luz** na barriga (na Bolha fica no alto do domo, que é o que a câmera vê) e um
  detalhe aceso da espécie, no material `luz`.
- **Olhos grandes** pintados sobre o corpo (`olho` para o branco e os brilhos, `pupila` separada).
- **Bochechas** (`bochecha`) e boca (`boca` e `lingua`; Ipê, Brotinho e Pluma não usam a língua).
- Os **raros** ganham três faíscas girando acima da cabeça (`faisca`, objeto `faiscas`).

## Materiais

| Material | Onde |
|---|---|
| `corpo` | a cor principal |
| `corpo2` | a segunda cor (pés, base, casca, forminha, neve, barriga) |
| `detalhe`, `detalhe2`, `detalhe3` | folhas, chapéus, granulado, tentáculos, espinhos, a concha e a listra do Búzio |
| `pena1`, `pena2`, `pena3` | as penas de arco-íris da Pluma |
| `barriga` | a barriguinha clara do Ipê |
| `luz` | tudo o que brilha (emissivo): o jogo pulsa o `emissiveIntensity` e acende mais à noite |
| `olho`, `pupila` | os olhos |
| `boca`, `lingua`, `bochecha` | o rosto |
| `faisca` | as faíscas dos raros (emissivo) |

O borrão usa `nevoa` (o miolo cinza), `nevoa-clara` (as camadas translúcidas, com um leve brilho
para aparecer à noite), `pupila`, `olho`, `boca`, `bochecha` e `faisca`.

## Animações

Cada Lumi é uma raiz vazia (`lumi-<id>`) com as partes presas nela, sem esqueleto: `corpo` (estica e
encolhe a partir da base), `olhos` (piscam), braços, pés e enfeites (folhas, chapéus, rabos,
tentáculos), que balançam um pouco atrasados.

| Clipe | Duração | O que faz |
|---|---|---|
| `parado` | 2 s | respira, balança de leve e pisca uma vez |
| `andar` | 1 s | dois passinhos gingando (Bolha, Algodão e Pluma flutuam inclinados) |
| `pular` | 1 s | prepara, pula esticado e pousa achatando |
| `trabalhar` | 1 s | duas marteladas com os dois braços (o Brotinho empurra com as quatro patas) |
| `feliz` | 1 s | dois pulinhos com os braços para cima e os olhos fechadinhos |

Todos os clipes são laços. O jogo deve começar cada Lumi num ponto diferente do `parado` para eles
não piscarem todos juntos.

### O borrão (`borrao.glb`)

Miolo cinza macio com um rabinho de fumaça, camadas de névoa translúcida em volta, olhinhos de quem
está aprontando e um sorriso de lado.

| Clipe | Duração | O que faz |
|---|---|---|
| `flutuar` | 2 s, laço | sobe e desce, respira, a névoa gira e ele espia de lado |
| `fugir` | 1 s, laço | inclina para a frente, estica e a névoa fica para trás |
| `preso` | 1 s, laço | preso na luz da lanterna: chacoalha, aperta os olhos e a névoa encolhe |
| `virar` | 1,5 s, uma vez | encolhe, incha e se desfaz em oito faíscas de luz; no fim não sobra nada |

No `virar`, use `LoopOnce` com `clampWhenFinished` e troque pelo Lumi quando o clipe terminar.

## Tamanho e escala

Escala de autor igual à do Zappy: o jogo usa 0,3 para os dois, e então um Lumi fica com 0,3 a 0,4
de altura, mais ou menos a cabeça do Zappy. A frente olha para +Z no three.js.

| Arquivo | Triângulos | Tamanho |
|---|---|---|
| `pitanga.glb` | 2.364 | 91 KB |
| `ipe.glb` | 2.922 | 123 KB |
| `quindim.glb` | 2.960 | 101 KB |
| `brigadeiro.glb` | 2.972 | 117 KB |
| `bolha.glb` | 2.274 | 98 KB |
| `perola.glb` | 2.808 | 109 KB |
| `gelinho.glb` | 2.630 | 96 KB |
| `cristal.glb` | 1.470 | 97 KB |
| `ovinho.glb` | 2.828 | 104 KB |
| `brotinho.glb` | 2.962 | 120 KB |
| `algodao.glb` | 2.092 | 77 KB |
| `pluma.glb` | 2.626 | 114 KB |
| `estrelinha.glb` | 2.780 | 97 KB |
| `buzio.glb` | 2.970 | 123 KB |
| `borrao.glb` | 2.962 | 157 KB |

Os números de cada geração ficam em `relatorio.json`.

## Arquivos

- `lib_lumis.py`: materiais, formas (bola, torno, tubo, folha, faísca), pintura colada no corpo
  (olhos, bochechas, coração), montagem das partes e as cinco animações.
- `bosque.py`, `vila_doce.py`, `recife.py`, `pico.py`, `dinos.py`, `nuvens.py`, `praia.py`: uma família
  cada. `praia.py` afasta um pouco mais as camadas do rosto (boca, pupila, brilhos e língua) e grava o
  arquivo com as faixas de animação desligadas, para a pose parada do GLB ser a de descanso; assim
  `scripts/faces-coplanares.ts` não acusa nada nos dois.
- `borrao.py`: o borrão do Cinza e as quatro animações dele.
- `build_all.py`: gera tudo.
- `previa.py`: renderiza uma cena de conferência (Cycles) a partir dos GLB; não faz parte do jogo.
- `miniaturas.py`: as miniaturas de 160 px das 14 espécies (`src/assets/lumis/miniaturas/<id>.png`,
  com o enquadramento dos ícones dos itens) para o álbum e a rotina; depois, a paleta de 128 cores
  com `PASTA=src/assets/lumis/miniaturas python3 -I arte/itens/icones_paleta.py`.
