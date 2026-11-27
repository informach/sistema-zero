/** Arte vetorial da Nave Contra Asteroides, embutida em cada .szproject (sem downloads).
 * Toda variação de uma categoria tem o mesmo tamanho de desenho e a mesma área de contato.
 */
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';

// A arte vem dos MESMOS modelos 3D da Patrulha Espacial (docs/design/construtor-espaco-blender):
// `svg2d.py` projeta cada nave, asteroide e laser em vetor e compõe os fundos com a paleta dos
// cenários 3D. Cada categoria tem quatro variações com a mesma caixa: trocar não muda o jogo.
const pasta = new URL('../../../../../design/construtor-espaco-blender/svg2d/', import.meta.url);
const medidas = {
  cenario: [800, 480],
  nave: [56, 64],
  asteroide: [48, 48],
  laser: [10, 28],
};
const nomes = {
  cenario: ['cenario-aurora', 'cenario-orbita', 'cenario-nebulosa', 'cenario-estacao'],
  nave: ['nave-falcao-azul', 'nave-exploradora-coral', 'nave-arraia-lilas', 'nave-cometa-verde'],
  asteroide: ['asteroide-rocha-lunar', 'asteroide-gelo-azul', 'asteroide-cristal-violeta', 'asteroide-lava-laranja'],
  laser: ['laser-ciano', 'laser-dourado', 'laser-lilas', 'laser-verde'],
};
const images = Object.entries(nomes).flatMap(([category, lista]) =>
  lista.map((name) => {
    const [width, height] = medidas[category];
    return { name, category, width, height, art: readFileSync(new URL(`${name}.svg`, pasta), 'utf8') };
  }),
);

export const artCatalog = images;
export const assets = images.map(({ name, width, height, art }) => ({
  id: `construtor-2d-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(art).toString('base64')}`,
  width,
  height,
}));

export const presets = [
  { id: 'aurora', label: 'Aurora', nave: 'nave-falcao-azul', cenario: 'cenario-aurora', asteroide: 'asteroide-rocha-lunar', laser: 'laser-ciano' },
  { id: 'orbita', label: 'Órbita', nave: 'nave-exploradora-coral', cenario: 'cenario-orbita', asteroide: 'asteroide-gelo-azul', laser: 'laser-dourado' },
  { id: 'nebulosa', label: 'Nebulosa', nave: 'nave-arraia-lilas', cenario: 'cenario-nebulosa', asteroide: 'asteroide-cristal-violeta', laser: 'laser-lilas' },
  { id: 'estacao', label: 'Estação', nave: 'nave-cometa-verde', cenario: 'cenario-estacao', asteroide: 'asteroide-lava-laranja', laser: 'laser-verde' },
];
