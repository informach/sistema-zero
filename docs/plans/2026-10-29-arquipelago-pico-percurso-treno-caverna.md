# Percurso até o topo, trenó e caverna de cristal do Pico, fase3-07

Objetivo: dar ao Pico Gelado (ligado na fase3-06) as três brincadeiras que faltam: subir a trilha
contra o relógio, descer de trenó e explorar a caverna de cristal até o cristal raro. Sem
salvamento novo (a V11 do mergulho continua valendo).

## Decisões propostas

- **Percurso "Subida ao cume" (`pico-cume`).** O percurso com tempo genérico
  (`sistemas/percurso.ts` e `mundo/corrida-na-ilha.tsx`, os mesmos do Bosque e da Vila). Largada no
  chão, entre as bandeirinhas do começo da trilha. Quatro paradas na trilha, em 1/4, 1/2 e 3/4 do
  caminho e na entrada do platô; a chegada é o meio do platô (âncora `cume`). Cinco flocos de neve
  flutuando sobre a linha do meio da trilha são a terceira estrela. O guarda-corpo invisível da
  beira segura quem anda, então cair quase não acontece; se acontecer, o corte leva à última
  parada, como nos outros percursos. Sem prêmio de item na chegada: as estrelas e o melhor tempo
  ficam em `salvamento.percursos['pico-cume']`. `PERCURSOS` do contrato ganha `pico-cume` sem versão
  nova, como a `vila-telhados` (só alarga o que a V2 em diante aceitam). O tempo-alvo sai do
  comprimento da trilha medido no Blender e das velocidades de `CORPO`.
- **Trenó pela trilha.** O trenó de enfeite sai do chão e vai para o platô, na boca da trilha. Perto
  dele, "Descer de trenó" (E ou Usar) senta a criança no trenó, que desce pela própria trilha em
  espiral até o pé, seguindo a linha do meio (âncoras `treno-curva-N` exportadas do Blender, no
  chão da trilha). Por que a trilha e não uma pista nova: a trilha já tem a inclinação constante
  (18°), as paredes e o guarda-corpo; uma pista nova cruzaria a espiral em algum ponto. Modo novo
  `treno` no contrato dos modos, com as contas do escorregador (`a = g × (sen θ − μ × cos θ)`), o
  atrito do gelo, teto de velocidade, nunca para no meio, pedir o lado mexe dentro da largura da
  trilha, pular sai. No pé, a velocidade vira passo no chão e o trenó volta ao platô (não vai junto).
  A câmera usa o perfil do escorregador. Pausa congela; movimento reduzido sem giro automático.
  **Como ficou:** não foi preciso um modo novo. A trilha é uma pista do mesmo modo `escorregar`,
  com o atrito e o teto dela (`Escorregador.atrito`, `velocidadeMaxima`) e `soPorPedido`, para andar
  na trilha não sentar. Um modo `treno` repetiria as contas, a animação e a câmera do escorregador.
- **Caverna de cristal no mesmo GLB.** A peça `pico_caverna.py` entra no `pico.glb`, no lugar
  proposto no README dos geradores: a boca em x −14,2, z −0,5, sem giro, atrás da montanha, com o
  morro por cima do mar até x −28,5. Um arquivo só mantém "uma ilha completa na memória", os
  colisores juntos e a conferência de faces coplanares junta; cabe no teto da ilha (cerca de 28,8 mil
  triângulos e 1,1 MB, para 40 mil e 1,5 MB). A espera pelo chão e a roda de nado do Pico crescem
  para alcançar a boca, como no Recife. Chega-se pela faixa atrás da montanha; a busca em grade dos
  testes confere o caminho da chegada até o cristal raro.
- **O cristal raro.** No alto da saliência do fundo, "Pegar o cristal" põe o item `cristal-rosa` na
  mochila, uma vez por jogo (o inventário já aceita itens novos, sem versão); com ele na mochila, o
  cristal some do pedestal. Não vai para o álbum nesta fase.

## Contrato de arte (esta sessão, Blender)

1. `pico.glb`: a caverna nos nós `caverna-*` (a joia em `cristal-raro`, para sumir), as âncoras da
   caverna com o prefixo `caverna-` (e `cristal-raro`), os colisores dela com os nomes de sempre.
2. As paradas `subida-1` a `-4` e os flocos `floco-1` a `-5` na trilha, o trenó no platô (âncora
   `treno`, e o desenho no nó separado `treno-desenho`, com a origem na base) e a linha
   `treno-curva-N` do platô ao pé, no chão da trilha.
3. Testes de colisores: caminho da chegada à caverna e ao cristal raro, paradas e flocos em cima do
   chão da trilha, linha do trenó dentro da trilha.

## Etapas

- [x] Blender: caverna no `pico.glb`, âncoras do percurso e do trenó, testes de colisores e faces.
- [x] Percurso `pico-cume`: contrato, config, pontos lidos das âncoras, `CorridaNaIlha` no Pico.
- [x] O trenó (pista do escorregar com gelo), o trenó no platô e o desenho dele debaixo da criança.
- [x] Caverna: espera e roda de nado maiores, o cristal raro e o item.
- [x] `playground/verificar-pico-browser.ts` com o percurso, a descida e a caverna, computador e
  celular emulado; regras, CLAUDE e QA.

Sem banco remoto, `.env` ou CI.
