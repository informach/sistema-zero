/**
 * Manifestos já migrados para a direção pedagógica de 21/09/2026.
 *
 * Os 37 trios têm cobertura editorial; gravação e ensaio continuam etapas de produção.
 */
export const MANIFESTOS_NOVO_MODELO = new Set([
  ...Array.from(
    { length: 8 },
    (_, i) => `meu-jeito-aula-${String(i + 1).padStart(2, '0')}.manifesto.json`,
  ),
  ...Array.from(
    { length: 13 },
    (_, i) => `corre-dino-aula-${String(i + 1).padStart(2, '0')}.manifesto.json`,
  ),
  'desafio-dia-1.manifesto.json',
  'desafio-dia-2.manifesto.json',
  'desafio-dia-3.manifesto.json',
  'desafio-certificado.manifesto.json',
  'cade-todo-mundo-aula-1.manifesto.json',
  'cade-todo-mundo-aula-2.manifesto.json',
  'cade-todo-mundo-certificado.manifesto.json',
  'nave-contra-asteroides-dia-1.manifesto.json',
  'nave-contra-asteroides-dia-2.manifesto.json',
  'nave-contra-asteroides-dia-3.manifesto.json',
  'nave-contra-asteroides-dia-4.manifesto.json',
  'nave-contra-asteroides-dia-5.manifesto.json',
  'nave-contra-asteroides-primeira-nave.manifesto.json',
  'nave-contra-asteroides-chuva-de-asteroides.manifesto.json',
  'nave-contra-asteroides-pontos.manifesto.json',
  'nave-contra-asteroides-comecar-partida.manifesto.json',
])
