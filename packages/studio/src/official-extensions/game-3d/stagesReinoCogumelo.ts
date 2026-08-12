/**
 * Os mapas do "Reino Cogumelo" — as fases, em texto, no formato que o
 * `loadStage` do Kit Plataforma decifra.
 *
 * FIDELIDADE, declarada por fase e sem fingimento:
 * - **1-1 e 1-2** são reconstruídas TRECHO A TRECHO a partir do artigo do
 *   SBGames 2015 (Braga & Mota, "Análise de Level Design"), que descreve os 13
 *   trechos de cada uma e a INTENÇÃO de cada peça. As posições relativas, a
 *   ordem dos obstáculos e as armadilhas de ensino são as de lá.
 * - **As demais** seguem o TEMA e a estrutura documentados no GDD de engenharia
 *   reversa (8 mundos x 4 áreas; Área 4 sempre castelo; Mundos 1 e 4 com Área 2
 *   subterrânea; Mundos 2 e 7 com Área 2 aquática), com o level design montado
 *   sobre as regras que o artigo ensina. NÃO são cópia tile-a-tile: as tiras de
 *   mapa do apêndice do GDD estão ilegíveis na captura que temos.
 *
 * Assuntos do formato: chao, solido, tijolo, surpresa, escondido, cano, moeda,
 * inimigo, plataforma, lava, fogo, chefao, mastro, castelo, checkpoint, tempo,
 * tema. Ponto-e-vírgula separa os assuntos; vírgula separa os itens.
 */

/**
 * Mundo 1, Área 1 — a fase mais estudada da história dos jogos.
 *
 * O artigo mostra que ela é um tutorial sem tutorial. Os trechos aqui seguem a
 * numeração dele:
 *  1. começo vazio, só o herói (dá para experimentar os botões em segurança);
 *  2. o primeiro bloco de interrogação e o primeiro inimigo vêm juntos;
 *  3. a plataforma de tijolos com o cogumelo, e o cano que faz o cogumelo
 *     VOLTAR de encontro ao jogador (decisão de design citada pelo Miyamoto);
 *  4. quatro canos de alturas diferentes ensinam o pulo por tempo de botão;
 *  5. o primeiro abismo, com a vida extra escondida logo antes dele;
 *  6-7. plataformas altas, o checkpoint e o tijolo falso com dez moedas;
 *  8. o único Koopa da fase, e a estrela escondida num tijolo;
 *  9-10. blocos com moedas e a fileira de inimigos que convida à reação em cadeia;
 *  11. as quatro escadas, com o vão seguro antes do vão que mata;
 *  12-13. o trecho calmo de saída do cano e a escadaria final até o mastro.
 */
export const FASE_1_1 = [
  'tema=dia',
  'tempo=400',
  'chao=0-68,71-85,89-152,155-212',
  'checkpoint=88',
  // Trecho 2: o bloco piscante e o primeiro Goomba, na mesma tela.
  'surpresa=16:4:moeda',
  'inimigo=22:goomba',
  // Trecho 3: tijolos + interrogação + o cano que devolve o cogumelo.
  'tijolo=20:4,22:4,24:4',
  'surpresa=21:4:cogumelo,23:4:moeda,22:8:moeda',
  'cano=28:2',
  // Trecho 4: quatro canos crescendo, com Goombas no meio.
  'cano=38:3,46:4,57:4',
  'inimigo=41:goomba,50:goomba,52:goomba',
  // Trecho 5: o abismo, e a vida extra escondida um pulo antes dele.
  'escondido=64:4:vida',
  'inimigo=63:goomba',
  // Trecho 6: a plataforma alta com dois Goombas que caem dela.
  'tijolo=77:4,79:4',
  'surpresa=78:4:cogumelo',
  'inimigo=80:goomba,82:goomba',
  // Trecho 7: o checkpoint, e o tijolo FALSO com dez moedas.
  'tijolo=91:4,92:4,93:4,94:4,95:4,96:4,97:4,98:4',
  'surpresa=94:4:moeda,109:4:moeda',
  'tijolo=100:8,101:8,102:8,103:8,104:8,105:8,106:8,107:8',
  'inimigo=97:goomba,99:goomba',
  // Trecho 8: o Koopa, e a estrela dentro de um tijolo.
  'tijolo=118:4,119:4,120:4,121:4',
  'surpresa=121:4:estrela',
  'inimigo=113:koopa',
  // Trecho 9: quatro interrogações, três com moeda e uma com poder.
  'surpresa=128:4:moeda,129:4:moeda,130:4:moeda,129:8:flor',
  'inimigo=125:goomba,127:goomba',
  // Trecho 10: a fileira que convida à reação em cadeia.
  'inimigo=134:goomba,136:goomba,138:goomba,140:goomba',
  // Trecho 11: as quatro escadas. O vão seguro vem ANTES do vão que mata.
  'solido=134:1,135:1-2,136:1-3,137:1-4',
  'solido=140:1-4,141:1-3,142:1-2,143:1',
  'solido=148:1,149:1-2,150:1-3,151:1-4',
  'solido=155:1-4,156:1-3,157:1-2,158:1',
  // Trecho 12: saída calma, com dois Goombas e uma plataforma para desviar.
  'cano=163:2',
  'inimigo=168:goomba,170:goomba',
  'tijolo=174:4,175:4',
  // Trecho 13: a escadaria final, o mastro e o castelo.
  'solido=181:1,182:1-2,183:1-3,184:1-4,185:1-5,186:1-6,187:1-7,188:1-8',
  'mastro=198',
  'castelo=202',
].join(';')

/**
 * Mundo 1, Área 2 — o subterrâneo.
 *
 * O artigo destaca: começa já com perigo (dois Goombas colados, formação nova),
 * torres de alturas diferentes que repetem a lição dos canos, o primeiro
 * "puzzle" de destruir tijolos na ordem certa para pegar as moedas de cima,
 * a passagem baixa que obriga o Super Mario a abrir caminho, o teto jogável
 * como atalho, e as plantas piranha no fim, antes da volta à superfície.
 */
export const FASE_1_2 = [
  'tema=subterraneo',
  'tempo=400',
  'chao=0-88,91-104,107-160',
  'checkpoint=96',
  // Teto do subterrâneo: é ele que vira atalho para quem descobrir como subir.
  'solido=6:10,7:10,8:10,9:10,10:10,11:10,12:10,13:10,14:10,15:10',
  'solido=16:10,17:10,18:10,19:10,20:10,21:10,22:10,23:10,24:10,25:10',
  // Trecho 1: dois Goombas colados já na entrada, e a plataforma de interrogações.
  'inimigo=9:goomba,10:goomba',
  'surpresa=12:4:cogumelo,13:4:moeda,14:4:moeda',
  'solido=18:1-2',
  // Trecho 2: torres de alturas diferentes, um bloco de distância entre elas.
  'solido=24:1-2,26:1-3,28:1-4,30:1-3',
  'inimigo=27:goomba',
  // Trecho 3: os tijolos que escondem moedas, com o Goomba que leva a descobrir.
  'tijolo=34:4,35:4,36:4',
  'moeda=34:6,35:6,36:6',
  'inimigo=35:goomba',
  // Trecho 4: o primeiro puzzle, com a estrela num tijolo e dois Koopas vindo.
  'tijolo=42:4,43:4,44:4,46:4,47:4,48:4',
  'surpresa=45:4:estrela',
  'moeda=42:6,43:6,44:6,46:6,47:6,48:6',
  'inimigo=52:koopa,54:koopa',
  // Trecho 5: a passagem baixa que obriga a abrir caminho por cima.
  'solido=58:5-9,59:5-9,60:5-9',
  'tijolo=58:4,59:4,60:4',
  'inimigo=57:koopa,62:goomba,64:goomba',
  // Trecho 6: itens escondidos e Goombas caindo de plataformas.
  'escondido=70:4:vida',
  'tijolo=74:4,75:4,76:4',
  'inimigo=75:goomba',
  // Trecho 7: a plataforma que dá acesso ao teto, e a vida escondida lá em cima.
  'solido=84:1-4',
  'escondido=86:9:vida',
  'inimigo=88:goomba,90:goomba',
  // Trecho 8: as plantas piranha, uma delas guardando a área bônus.
  'cano=94:3,100:4,106:3',
  'inimigo=94:planta,100:planta,106:planta',
  // Trecho 9: dois abismos separados por uma barreira de tijolos.
  'tijolo=112:1,112:2',
  // Trecho 10: a escada e as primeiras plataformas móveis do jogo.
  'solido=120:1,121:1-2,122:1-3,123:1-4',
  'plataforma=128:5:y:6,134:6:y:6',
  // Trecho 11: o Koopa vermelho que NÃO cai da plataforma, e o elevador duplo.
  'solido=140:1-5',
  'inimigo=141:koopa',
  'plataforma=146:4:y:5',
  // Trecho 13: de volta à superfície, com a planta do cano de saída.
  'cano=152:3',
  'inimigo=152:planta',
  'mastro=157',
  'castelo=160',
].join(';')

/** Mundo 1, Área 3 — plataformas de cogumelo suspensas sobre abismos. */
export const FASE_1_3 = [
  'tema=dia',
  'tempo=300',
  'chao=0-14,148-165',
  'checkpoint=70',
  // Plataformas de cogumelo a cada 5 colunas: o vão fica em 4, dentro do pulo
  // com corrida. O artigo é explícito — "todos os poços têm aproximadamente o
  // comprimento que Mario pode pular".
  'solido=19:5,24:6,29:7,34:6,39:5,44:7,49:8,54:6,59:9,64:7',
  'solido=69:5,74:7,79:6,84:8,89:7,94:6,99:9,104:7,109:5,114:8',
  'solido=119:6,124:7,129:5,134:8,139:6,144:5',
  'moeda=24:8,39:7,54:8,69:7,84:10,99:11,114:10,129:7',
  'surpresa=49:11:cogumelo,99:12:flor',
  'inimigo=29:koopa,59:koopa,89:koopa,119:koopa',
  'solido=150:1,151:1-2,152:1-3,153:1-4,154:1-5,155:1-6,156:1-7,157:1-8',
  'mastro=160',
  'castelo=163',
].join(';')

/** Mundo 1, Área 4 — o castelo: lava, barras de fogo, ponte, chefão e machado. */
export const FASE_1_4 = [
  'tema=castelo',
  'tempo=300',
  'chao=0-24,28-46,50-70,74-104',
  'lava=25-27,47-49,71-73',
  'solido=14:1-3,20:4-8,34:1-3,40:4-8,58:1-3,64:4-8',
  'fogo=18:6:3,38:7:4,62:6:3,86:7:4',
  'moeda=30:5,31:5,32:5,54:5,55:5,56:5',
  'surpresa=44:5:flor',
  'inimigo=33:besouro,57:besouro,80:besouro',
  'chefao=94',
  'castelo=101',
].join(';')

/** O Mundo 1 completo, na ordem em que se joga. */
export const MUNDO_1 = [FASE_1_1, FASE_1_2, FASE_1_3, FASE_1_4]

// ---------------------------------------------------------------------------
// Mundos 2 a 8.
//
// Aqui a régua muda, e vale dizer com todas as letras: as tiras de mapa do
// apêndice do GDD estão ilegíveis na captura que temos, então estas 28 fases NÃO
// são cópia tile-a-tile. O que é fiel: o TEMA de cada área (a matriz do GDD:
// Área 4 sempre castelo; Mundos 1 e 4 com Área 2 subterrânea; Mundos 2 e 7 com
// Área 2 aquática), a curva de dificuldade e as regras de level design que o
// artigo ensina — poço do tamanho do pulo, inimigo novo apresentado em situação
// segura, item de socorro depois do trecho difícil.
//
// ⚠️ As áreas aquáticas são AMBIENTAÇÃO: o kit ainda não tem natação, então elas
// se jogam como plataforma com cenário e névoa de água.
// ---------------------------------------------------------------------------

/** Escadaria + mastro + castelo: o fecho que toda área de superfície repete. */
function fecho(base: number): string {
  const degraus = []
  for (let i = 0; i < 8; i++) degraus.push(`${base + i}:1-${i + 1}`)
  return `solido=${degraus.join(',')};mastro=${base + 12};castelo=${base + 16}`
}

/** Área de superfície parametrizada: canos, blocos, inimigos e o fecho. */
function superficie(o: {
  tema: 'dia' | 'noite'
  tempo: number
  largura: number
  canos: string
  blocos: string
  bichos: string
  extra?: string
}): string {
  const partes = [
    `tema=${o.tema}`,
    `tempo=${o.tempo}`,
    `chao=0-${o.largura}`,
    `checkpoint=${Math.round(o.largura / 2)}`,
    `cano=${o.canos}`,
    `surpresa=${o.blocos}`,
    `inimigo=${o.bichos}`,
  ]
  if (o.extra) partes.push(o.extra)
  partes.push(fecho(o.largura + 2))
  return partes.join(';')
}

/** Castelo parametrizado: lava nos vãos, barras de fogo, chefão no fim. */
function castelo(o: { tempo: number; salas: number; fogos: string; bichos: string }): string {
  const chao: string[] = []
  const lava: string[] = []
  let x = 0
  for (let i = 0; i < o.salas; i++) {
    chao.push(`${x}-${x + 20}`)
    lava.push(`${x + 21}-${x + 23}`)
    x += 24
  }
  chao.push(`${x}-${x + 24}`)
  return [
    'tema=castelo',
    `tempo=${o.tempo}`,
    `chao=${chao.join(',')}`,
    `lava=${lava.join(',')}`,
    `checkpoint=${Math.round(x / 2)}`,
    `fogo=${o.fogos}`,
    `inimigo=${o.bichos}`,
    `chefao=${x + 14}`,
    `castelo=${x + 21}`,
  ].join(';')
}

export const FASE_2_1 = superficie({
  tema: 'dia',
  tempo: 400,
  largura: 150,
  canos: '24:2,52:3,86:4,118:2',
  blocos: '18:4:cogumelo,40:4:moeda,72:4:flor,104:4:moeda,132:8:estrela',
  bichos: '20:goomba,30:koopa,44:goomba,46:goomba,64:koopa,90:goomba,110:koopa,124:goomba',
  extra: 'tijolo=38:4,39:4,70:4,71:4,102:4,103:4;escondido=60:4:vida;moeda=56:6,57:6,58:6',
})

/** Mundo 2, Área 2 — a primeira área aquática do jogo. */
export const FASE_2_2 = [
  'tema=agua',
  'tempo=400',
  'chao=0-140',
  'checkpoint=70',
  'solido=20:4-6,34:5-8,48:3-5,62:6-9,76:4-7,90:5-8,104:3-6,118:6-9',
  'moeda=22:8,36:10,50:7,64:11,78:9,92:10,106:8,120:11',
  'surpresa=30:5:cogumelo,80:5:flor',
  'inimigo=26:koopa,44:koopa,58:koopa,72:koopa,86:koopa,100:koopa,114:koopa',
  fecho(142),
].join(';')

export const FASE_2_3 = superficie({
  tema: 'dia',
  tempo: 300,
  largura: 130,
  canos: '30:3,74:4',
  blocos: '20:4:moeda,54:4:cogumelo,98:4:moeda',
  bichos: '24:goomba,40:koopa,58:goomba,60:goomba,84:koopa,108:goomba',
  extra: 'solido=44:1-3,46:1-3,88:1-4,90:1-4;plataforma=64:5:y:5,104:5:x:6;moeda=45:5,89:6',
})

export const FASE_2_4 = castelo({
  tempo: 300,
  salas: 3,
  fogos: '12:6:3,30:7:4,54:6:3,78:7:4',
  bichos: '16:besouro,40:besouro,64:besouro,84:besouro',
})

export const MUNDO_2 = [FASE_2_1, FASE_2_2, FASE_2_3, FASE_2_4]

export const FASE_3_1 = superficie({
  tema: 'noite',
  tempo: 400,
  largura: 160,
  canos: '28:3,66:4,104:3,140:4',
  blocos: '20:4:cogumelo,48:4:moeda,86:4:flor,124:8:estrela',
  bichos: '24:goomba,34:koopa,52:goomba,54:goomba,72:koopa,96:espinho,118:koopa,146:goomba',
  extra: 'tijolo=46:4,47:4,84:4,85:4;plataforma=110:6:y:6',
})

export const FASE_3_2 = superficie({
  tema: 'noite',
  tempo: 300,
  largura: 140,
  canos: '36:2,88:3',
  blocos: '24:4:moeda,62:4:cogumelo,110:4:moeda',
  bichos: '30:koopa,48:goomba,50:goomba,74:espinho,96:koopa,120:goomba',
  extra: 'solido=54:1-4,56:1-4,100:1-5,102:1-5;escondido=68:4:vida',
})

export const FASE_3_3 = [
  'tema=noite',
  'tempo=300',
  'chao=0-14,146-160',
  'checkpoint=72',
  'solido=19:6,24:8,29:5,34:9,39:6,44:7,49:10,54:6,59:8,64:5',
  'solido=69:9,74:6,79:7,84:10,89:5,94:8,99:6,104:9,109:7,114:5',
  'solido=119:8,124:6,129:9,134:7,139:5,144:6',
  'moeda=24:11,39:9,54:9,69:12,89:8,104:12,124:9',
  'surpresa=44:10:cogumelo,99:9:flor',
  'inimigo=34:koopa,64:koopa,94:koopa,124:koopa',
  fecho(148),
].join(';')

export const FASE_3_4 = castelo({
  tempo: 300,
  salas: 3,
  fogos: '10:6:4,28:7:3,52:6:4,76:7:3,88:6:4',
  bichos: '14:besouro,38:espinho,62:besouro,86:espinho',
})

export const MUNDO_3 = [FASE_3_1, FASE_3_2, FASE_3_3, FASE_3_4]

export const FASE_4_1 = superficie({
  tema: 'dia',
  tempo: 400,
  largura: 170,
  canos: '30:4,72:3,116:4,152:2',
  blocos: '22:4:cogumelo,54:4:moeda,94:4:flor,134:8:estrela',
  bichos: '26:goomba,42:koopa,60:espinho,78:goomba,80:goomba,104:koopa,128:espinho,158:koopa',
  extra: 'tijolo=52:4,53:4,92:4,93:4;plataforma=140:6:x:8;escondido=66:4:vida',
})

/** Mundo 4, Área 2 — o segundo subterrâneo. */
export const FASE_4_2 = [
  'tema=subterraneo',
  'tempo=400',
  'chao=0-150',
  'checkpoint=74',
  'solido=8:10,9:10,10:10,11:10,12:10,13:10,14:10,15:10,16:10,17:10',
  'cano=26:3,58:4,92:3,124:4',
  'inimigo=26:planta,58:planta,92:planta,124:planta',
  'tijolo=34:4,35:4,36:4,68:4,69:4,70:4,104:4,105:4,106:4',
  'surpresa=35:4:cogumelo,69:4:flor,105:4:moeda',
  'moeda=34:6,36:6,68:6,70:6,104:6,106:6',
  'inimigo=44:koopa,46:koopa,80:goomba,82:goomba,112:koopa,136:goomba',
  'escondido=140:4:vida',
  fecho(152),
].join(';')

export const FASE_4_3 = [
  'tema=dia',
  'tempo=300',
  'chao=0-14,150-164',
  'checkpoint=76',
  'solido=19:5,24:7,29:6,34:9,39:5,44:8,49:6,54:10,59:7,64:5',
  'solido=69:8,74:6,79:10,84:7,89:5,94:9,99:6,104:8,109:7,114:10',
  'solido=119:5,124:8,129:6,134:9,139:7,144:5',
  'moeda=29:9,44:11,59:10,79:13,94:12,114:13,134:12',
  'surpresa=54:13:cogumelo,104:11:flor',
  'inimigo=39:koopa,74:koopa,109:koopa,139:koopa',
  fecho(152),
].join(';')

export const FASE_4_4 = castelo({
  tempo: 300,
  salas: 4,
  fogos: '10:6:4,30:7:4,54:6:3,78:7:4,100:6:4',
  bichos: '14:besouro,38:espinho,62:besouro,86:espinho,106:besouro',
})

export const MUNDO_4 = [FASE_4_1, FASE_4_2, FASE_4_3, FASE_4_4]

export const FASE_5_1 = superficie({
  tema: 'dia',
  tempo: 400,
  largura: 175,
  canos: '32:4,76:3,120:4,158:3',
  blocos: '24:4:cogumelo,58:4:moeda,100:4:flor,142:8:estrela',
  bichos: '28:goomba,46:koopa,64:espinho,84:goomba,86:goomba,110:koopa,134:espinho,164:koopa',
  extra: 'tijolo=56:4,57:4,98:4,99:4;plataforma=148:6:y:7;escondido=70:4:vida',
})

export const FASE_5_2 = superficie({
  tema: 'dia',
  tempo: 350,
  largura: 155,
  canos: '40:3,96:4',
  blocos: '26:4:moeda,68:4:cogumelo,120:4:moeda',
  bichos: '34:koopa,52:goomba,54:goomba,80:espinho,104:koopa,132:goomba,134:goomba',
  extra: 'solido=60:1-4,62:1-4,110:1-5,112:1-5;plataforma=88:6:x:7',
})

export const FASE_5_3 = [
  'tema=dia',
  'tempo=300',
  'chao=0-14,152-166',
  'checkpoint=78',
  'solido=19:6,24:9,29:5,34:8,39:7,44:10,49:6,54:9,59:5,64:8',
  'solido=69:7,74:10,79:6,84:9,89:5,94:8,99:7,104:10,109:6,114:9',
  'solido=119:5,124:8,129:7,134:10,139:6,144:9,149:5',
  'moeda=24:12,44:13,64:11,84:12,104:13,124:11,144:12',
  'surpresa=49:9:cogumelo,109:9:flor',
  'inimigo=34:koopa,69:koopa,99:espinho,134:koopa',
  fecho(154),
].join(';')

export const FASE_5_4 = castelo({
  tempo: 300,
  salas: 4,
  fogos: '10:6:4,32:7:4,56:6:4,80:7:3,102:6:4',
  bichos: '16:besouro,40:espinho,64:besouro,88:espinho,108:besouro',
})

export const MUNDO_5 = [FASE_5_1, FASE_5_2, FASE_5_3, FASE_5_4]

export const FASE_6_1 = superficie({
  tema: 'noite',
  tempo: 400,
  largura: 180,
  canos: '34:4,80:3,126:4,164:3',
  blocos: '26:4:cogumelo,62:4:moeda,106:4:flor,148:8:estrela',
  bichos: '30:goomba,48:koopa,68:espinho,88:goomba,90:goomba,116:koopa,140:espinho,170:koopa',
  extra: 'tijolo=60:4,61:4,104:4,105:4;plataforma=154:6:y:8;escondido=74:4:vida',
})

export const FASE_6_2 = superficie({
  tema: 'noite',
  tempo: 350,
  largura: 165,
  canos: '20:2,26:3,32:4,38:3,100:4',
  blocos: '48:4:moeda,74:4:cogumelo,130:4:moeda',
  bichos: '22:goomba,28:goomba,44:koopa,56:espinho,86:koopa,112:goomba,144:espinho',
  extra: 'solido=64:1-4,66:1-4,120:1-5,122:1-5;plataforma=94:6:x:8',
})

export const FASE_6_3 = [
  'tema=noite',
  'tempo=300',
  'chao=0-14,156-170',
  'checkpoint=80',
  'solido=19:7,24:10,29:6,34:9,39:8,44:11,49:7,54:10,59:6,64:9',
  'solido=69:8,74:11,79:7,84:10,89:6,94:9,99:8,104:11,109:7,114:10',
  'solido=119:6,124:9,129:8,134:11,139:7,144:10,149:6,154:8',
  'moeda=29:10,49:11,69:12,89:10,109:11,129:12,149:10',
  'surpresa=54:14:cogumelo,114:14:flor',
  'inimigo=39:koopa,74:koopa,104:espinho,139:koopa',
  fecho(158),
].join(';')

export const FASE_6_4 = castelo({
  tempo: 300,
  salas: 4,
  fogos: '10:6:4,30:7:4,52:6:4,76:7:4,100:6:3',
  bichos: '14:espinho,38:besouro,62:espinho,86:besouro,106:espinho',
})

export const MUNDO_6 = [FASE_6_1, FASE_6_2, FASE_6_3, FASE_6_4]

export const FASE_7_1 = superficie({
  tema: 'dia',
  tempo: 400,
  largura: 185,
  canos: '36:4,84:3,132:4,170:3',
  blocos: '28:4:cogumelo,66:4:moeda,110:4:flor,152:8:estrela',
  bichos: '32:goomba,52:koopa,72:espinho,92:goomba,94:goomba,120:koopa,146:espinho,176:koopa',
  extra: 'tijolo=64:4,65:4,108:4,109:4;plataforma=160:6:y:8;escondido=78:4:vida',
})

/** Mundo 7, Área 2 — a segunda área aquática. */
export const FASE_7_2 = [
  'tema=agua',
  'tempo=400',
  'chao=0-160',
  'checkpoint=80',
  'solido=18:4-7,32:6-9,46:3-6,60:7-10,74:4-8,88:5-9,102:3-7,116:6-10,130:4-8',
  'moeda=20:9,34:11,48:8,62:12,76:10,90:11,104:9,118:12,132:10',
  'surpresa=28:5:cogumelo,96:5:flor',
  'inimigo=24:koopa,40:koopa,54:koopa,68:koopa,82:koopa,96:koopa,110:koopa,124:koopa',
  fecho(162),
].join(';')

export const FASE_7_3 = superficie({
  tema: 'dia',
  tempo: 300,
  largura: 150,
  canos: '38:3,90:4',
  blocos: '24:4:moeda,64:4:cogumelo,116:4:moeda',
  bichos: '30:koopa,48:goomba,50:goomba,76:espinho,100:koopa,128:goomba,130:goomba',
  extra: 'solido=56:1-4,58:1-4,106:1-5,108:1-5;plataforma=84:6:x:8,140:6:y:6',
})

export const FASE_7_4 = castelo({
  tempo: 300,
  salas: 5,
  fogos: '10:6:4,32:7:4,56:6:4,80:7:4,104:6:4,126:7:3',
  bichos: '14:espinho,38:besouro,62:espinho,86:besouro,110:espinho,130:besouro',
})

export const MUNDO_7 = [FASE_7_1, FASE_7_2, FASE_7_3, FASE_7_4]

export const FASE_8_1 = superficie({
  tema: 'dia',
  tempo: 400,
  largura: 200,
  canos: '30:4,58:3,92:4,124:3,160:4,186:3',
  blocos: '22:4:cogumelo,70:4:flor,140:8:estrela,172:4:moeda',
  bichos:
    '26:goomba,44:koopa,62:espinho,80:goomba,82:goomba,100:koopa,116:espinho,146:koopa,178:espinho',
  extra: 'tijolo=68:4,69:4,138:4,139:4;plataforma=108:6:y:8,192:6:x:8;escondido=54:4:vida',
})

export const FASE_8_2 = superficie({
  tema: 'dia',
  tempo: 400,
  largura: 190,
  canos: '46:4,110:3,166:4',
  blocos: '30:4:cogumelo,88:4:flor,148:4:moeda',
  bichos: '34:koopa,56:espinho,74:goomba,76:goomba,98:koopa,126:espinho,156:koopa,180:goomba',
  extra: 'solido=20:1-3,22:1-4,24:1-5;plataforma=62:6:x:9,134:6:y:8;escondido=100:4:vida',
})

export const FASE_8_3 = superficie({
  tema: 'dia',
  tempo: 400,
  largura: 195,
  canos: '52:4,118:3,174:4',
  blocos: '36:4:cogumelo,94:4:flor,152:8:estrela',
  bichos: '40:espinho,60:koopa,78:goomba,80:goomba,106:espinho,132:koopa,160:espinho,184:koopa',
  extra: 'solido=66:1-6,68:1-6,140:1-7,142:1-7;plataforma=112:6:y:9;escondido=126:4:vida',
})

/** Mundo 8, Área 4 — o castelo final, o mais longo do jogo. */
export const FASE_8_4 = castelo({
  tempo: 400,
  salas: 6,
  fogos: '10:6:4,32:7:4,56:6:4,80:7:4,104:6:4,128:7:4,150:6:4',
  bichos: '14:espinho,38:besouro,62:espinho,86:besouro,110:espinho,134:besouro,154:espinho',
})

export const MUNDO_8 = [FASE_8_1, FASE_8_2, FASE_8_3, FASE_8_4]

/** As 32 fases, na ordem: mundo 1 fase 1 ... mundo 8 fase 4. */
export const FASES_REINO_COGUMELO = [
  ...MUNDO_1,
  ...MUNDO_2,
  ...MUNDO_3,
  ...MUNDO_4,
  ...MUNDO_5,
  ...MUNDO_6,
  ...MUNDO_7,
  ...MUNDO_8,
]
