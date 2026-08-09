// Jogo 2D = uma cor da categoria; subcategorias recebem tons na montagem da toolbox.
export const GAME_TWO_D_BLOCK_COLOR = '#ec4899'
export const GAME_TWO_D_EVENT_COLOR = '#f06bb0'

/**
 * Os comportamentos de inimigo, na ordem em que a criança os vê nos DOIS blocos
 * que os oferecem: "Criar tipo de inimigo" e "O tipo de inimigo … também é …".
 *
 * Agrupados por FAMÍLIA (anda no chão, voa, o que faz), porque é o que o menu
 * precisa ensinar: juntar dois jeitos de se mexer TROCA o movimento, juntar uma
 * ação ACRESCENTA. Blockly não tem separador em dropdown, então a ordem e o
 * parêntese são a única marcação possível. A 1ª opção segue sendo `patrulha`
 * (o padrão de quem arrasta o bloco novo).
 *
 * ⚠️ Espalhe uma CÓPIA (`[...OPTIONS]`) em cada bloco — dois tipos de bloco não
 * podem compartilhar a mesma referência de array.
 * ⚠️ Esta lista é travada contra `G2D_ENEMY_BEHAVIORS` (valor E ordem) no
 * `docDrift.test.ts`: comportamento novo entra nos dois ou não entra.
 */
export const GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS: Array<[string, string]> = [
  // anda no chão
  ['patrulha (anda e volta)', 'patrulha'],
  ['perseguidor (vai atrás do alvo por todo lado, inclusive pelo ar)', 'perseguidor'],
  ['perseguidor de lado (segue o alvo sem mudar de altura)', 'perseguidor-lado'],
  [
    'perseguidor vertical (sobe e desce atrás do alvo, sem andar para os lados)',
    'perseguidor-vertical',
  ],
  ['saltador (pula de tempos em tempos)', 'saltador'],
  ['arrancada (fica quieto e sai correndo quando o alvo chega perto)', 'arrancada'],
  ['medroso (foge quando o alvo chega perto)', 'medroso'],
  ['parado (fica no lugar)', 'parado'],
  // voa
  ['voador (voa indo e voltando para os lados)', 'voador'],
  ['voador (voa subindo e descendo)', 'voador-vertical'],
  ['rondador (voa em círculo em volta de onde nasceu)', 'rondador'],
  ['zigue-zague (voa na diagonal, virando nos lados e subindo e descendo)', 'zigue-zague'],
  ['mergulhador (voa e mergulha no alvo que passa por baixo)', 'mergulhador'],
  ['teleporte (voa sumindo e reaparecendo do lado do alvo)', 'teleporte'],
  // o que ele faz (soma com qualquer jeito de se mexer)
  ['atirador (atira no alvo)', 'atirador'],
  [
    'atirador alinhado (só atira quando o alvo passa bem embaixo ou bem em cima)',
    'atirador-alinhado',
  ],
  ['atirador de lado (só atira quando o alvo está na mesma altura, ao lado dele)', 'atirador-lado'],
  [
    'atirador esperto (mira onde o alvo VAI estar, se o tiro dele for mais rápido)',
    'atirador-esperto',
  ],
  ['atirador em leque (3 tiros de uma vez)', 'atirador-leque'],
  ['bombardeiro (solta tiros para baixo)', 'bombardeiro'],
  ['raio (avisa e solta um feixe reto para baixo; o dano vem do bloco "Para cada raio")', 'raio'],
  ['espinho (nunca morre, só machuca)', 'espinho'],
  ['renascer (volta um tempinho depois de morrer)', 'renascer'],
  ['chefão (vida 5 vezes maior, mais lento, atira em leque)', 'chefao'],
]

/**
 * Os cinco níveis de inteligência do bloco "Criar tipo de inimigo … com
 * inteligência". Cada um já traz o pacote pronto de andar e atirar; o
 * "também é" continua somando por cima.
 * ⚠️ Travado contra `G2D_ENEMY_SMARTS` (valor e ordem) no `docDrift.test.ts`.
 */
export const GAME_TWO_D_ENEMY_SMART_OPTIONS: [string, string][] = [
  [
    'burra (patrulha + bombardeiro: anda de um lado para o outro soltando tiros para baixo)',
    'burra',
  ],
  ['básica (patrulha + atirador alinhado: anda e só atira quando você passa embaixo)', 'basica'],
  ['avançada (perseguidor de lado + atirador: te segue pelos lados e mira em você)', 'avancada'],
  ['ultra (perseguidor de lado + atirador esperto: mira onde você VAI estar)', 'ultra'],
  [
    'rei (o chefão: persegue por TODO LADO + atirador esperto + raio, com 5 vezes mais vida)',
    'rei',
  ],
]
