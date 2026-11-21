# Para a frente do Arquipélago: a Faísca nova, montada no Molda Cenários

21/11/2026. A sessão do Arquipélago não estava ativa; este documento junta o que ela precisa
saber e o que fica para ela alinhar no código do jogo. Nada em `packages/arquipelago` foi mudado.

## O que aconteceu

- A Faísca foi refeita do zero na oficina do Molda Cenários (cenário "Faísca" do mundo
  "Arquipélago Vagalume", espaço da equipe, staging), com o coração no MEIO da ilha, como pede a
  imagem de referência e o caderno "A Ilha Faísca" (decisão da Helena em 21/11).
- A costa, o raio (260 m) e as seis cabeceiras continuam os da geografia do `/macro`
  (`geografia-do-arquipelago.ts`). O que mudou é o arranjo dos distritos por dentro e o relevo.
- Publicada na staging pela tela de publicar: **versão 4 = revisão 153** (a 3, revisão 152, foi a andada; a 4 só corrige o marcador da horta) (1.131 objetos, 86
  modelos dos pacotes Reino, Adventure Land, Morada, Fantasy, Fazenda e Cidade).
- Andada no `/macro` local com o avatar real: chegada em ~30 s, 48 a 58 quadros por segundo,
  nenhum erro na página. Fotos em `output/cenarios-reforma/faisca-nova/macro-v3/`.

## O que alinhar no código do jogo

1. **Onde o avatar nasce.** O `/macro` passa a partida do código, a casa antiga em (0, 150), para
   `publicado.chegada(...)` (`playground/arquipelago-macro.tsx`). Na Faísca nova, (0, 150) é a
   descida do portão sul. A própria `chegada` já procura `perfil.inicio` e o marcador `lugar:casa`
   da publicação quando não recebe ponto: na ilha publicada, basta não passar o ponto do código
   (ou passar o `lugar:casa` dela), que o avatar nasce na porta de casa nova, em (0, 48).
2. **Lugares e distritos.** `LUGAR_DA_FAISCA` e `DISTRITOS_DA_FAISCA`
   (`src/sistemas/faisca.ts`) ainda têm as coordenadas do código. O painel de teleporte do
   `/macro` e o que mais ler essa tabela levam a lugares que mudaram. As coordenadas novas estão
   abaixo; o ideal é o jogo ler os marcadores `lugar:*` da publicação, que acompanham qualquer
   ajuste feito na oficina.

## Lugares novos

Centro da ilha em (0, 0), norte com z negativo, metros do mundo. "Marcador" é o `lugar:*` que
está na publicação; "peça" é onde a peça com esse papel ficou.

| Chave no código | Antes (código) | Agora | Onde |
|---|---|---|---|
| `casa` | (0, 150) | (0, 48), giro π | Marcador `lugar:casa`, porta virada para a praça (norte). Lote da Morada em x −12…12, z 50…74, cerca com vão de 6 m ao norte e portal ao sul (0, 76) |
| `praca` | (0, 137) | (0, 30) | Marcador. Poço no meio; Quadro das Conexões em (0, 21) |
| `horta` | (20, 139) | (−24, 14) | Marcador. Canteiros em (−32, 13), bomba d'água em (−23, 7), espantalho em (−28, 24) |
| `galpao` | (−57, 110) | (−48, 25) | Galpão das sementes (Campos). No Pátio: galpão das máquinas (56, 4) e das peças (88, 30) |
| `pomar` | (58, 153) | (−72, 42) | Árvores do pomar, a oeste da horta |
| `lago` | (39, 127) | (−44, 4) | Marcador na margem. Lago em (−58, −6), com a ilhota do salgueiro (−56, −5) e as pedras de pular; a cachoeira cai do platô oeste |
| `patio` | (−24, 132) | (36, 26) | Marcador no Portão do Pátio (36, 25) |
| `oficina` | (−28, 132) | (62, 32) | Marcador junto do guindaste. Oficina lacrada em (87, 9); passarela de observação (47, 13); Mesinha da Sombra (50, 26) |
| `bancada` | (−39, 114) | (50, 26) | Mesinha da Sombra, no Pátio (provável equivalente) |
| (mecanismos) | | (72, 9) e (64, 26) | Lugares reservados da roda d'água e da esteira (a arte ainda vai fazer) |
| `farol` | (−3, 109) | (0, −32) | Marcador na subida. Farol das Conexões em (0, −48), no alto (20 m) |
| `miranteOeste`, `miranteLeste` | (−28, 82), (28, 70) | perto de (5, −30) | Três mirantes da Colina do Farol |
| (colina) | | | Moinho da encosta (−24, −30), fonte da encosta (−25, −17), banco do pôr do sol (−8, −38), pedra riscada (12, −34), casinha do faroleiro (10, −43) |
| `costa` | (20, 153) | (−90, 130) | Marcador. Praia do sudoeste |
| `pier` | (8, 225) | (−112, 160) | Marcador. Tábuas do píer em (−129, 180), guindaste do píer (−114, 166) |
| `enseadaAreia`, `pocas`, `dunas`, `gruta`, `observacao`, `descida` | | na costa sudoeste | A praia ocupa de (−120, 120) a (−60, 170). As enseadas e a gruta não têm peça própria ainda |
| `bosque`, `clareiraFlores` | (112, −55) | (65, −65) | Marcador. Trilha das lanternas perto de (109, −58) |
| `troncoOco` | (130, −15) | (73, −89) | Tronco oco |
| `arvoreDaChave` | (94, −110) | (115, −117) | Árvore grande com casinha na copa |
| `miranteNorte` | (40, −155) | (85, −155) | Mirante do norte |
| `lagoEscondido` | (140, −85) | sem peça própria | |
| Cabeceiras | as do código | iguais | Pilares de pedra, placa e Granitus em cada uma (Bosque, Vila Doce, Recife, Pico, Vale, Nuvens) |

Distritos, na orientação da imagem (vista do sul): Vila dos Criadores no meio; Colina do Farol
ao norte; Campos da Íris a oeste; Pátio das Invenções a leste; Costa do Nico a sudoeste; Bosque
das Lanternas a nordeste.

## Medidas a pé (avatar real, ritmo de exploração 1,5 / 3,4 m/s)

| Trecho | Percurso | Tempo |
|---|---|---|
| Praça → horta | 33 a 46 m | 32 a 45 s |
| Horta → portão do Pátio | 88 m | 88 a 108 s |
| Pátio → topo do Farol | 153 a 175 m | 172 a 206 s |
| Farol → lago (nada) | 92 m | 103 s |
| Lago → praia | 236 m | 280 s |
| Praia → píer | 56 m | 49 s |

## Física e colisão (o que a caminhada ensinou)

- **Árvores:** com colisão `caixa`, a caixa pega a copa inteira e vira parede invisível. As 418
  árvores agora têm `colisao: nenhuma` + `arquipelago.fisica: tronco` e
  `arquipelago.raioDoTronco` (0,22 a 0,3 m): o jogo cria o tronco nativo, como já faz.
- **Rochas e barcos:** com `malha`, a colisão próxima passava das 100 mil triângulos
  (`MAX_TRIANGULOS_ATIVOS`, janela de 400 m) e aparecia "A colisão próxima excede o orçamento do
  cenário". Viraram `caixa`. Ficaram `malha` só o que se pisa ou se atravessa: pontes,
  pontilhões, degraus, plataforma, arcos e a casa na árvore (35 mil triângulos no total).
- **Arcos:** o portal do lote com `caixa` tapava a passagem; agora é `malha`.

## Mar e chão

- O "Mar" saiu do documento: o oceano é o do jogo (como o plano previa). O fundo do relevo em
  volta da ilha está pintado de areia e azul acinzentado, para não aparecer grama por baixo da
  água.

## Peso do pacote (para decidir antes da produção)

- O pacote publicado tem ~118 MiB (a Faísca antiga tinha 74 MiB). Quase tudo são imagens: cada
  lote juntado (uma região de 64 m × um material) leva dentro uma cópia da textura do pacote de
  arte. O atlas do Reino aparece em 86 lotes.
- Para baixar de verdade, as imagens precisariam ser divididas entre os arquivos do pacote (uma
  imagem, muitos GLBs). Isso muda o formato que o carregador do jogo lê, então é decisão conjunta
  com esta frente.

## Como reproduzir

```
# levar a publicação da staging para a pasta que o /macro lê (o acesso vem das variáveis
# MOLDA_CENARIOS_* descritas no cabeçalho do roteiro)
bun packages/molda-cenarios-agente/scripts/levar-publicacao-ao-macro.ts sua-ilha <pasta>
# subir o /macro com ela e o avatar
cd packages/arquipelago
CENARIOS_PUBLICADOS_QA_DIR=<pasta> AVATAR_QA_DIR=<cópia do pack> bun run dev
# abrir http://127.0.0.1:4520/macro?ritmo=explorar
```
