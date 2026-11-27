/**
 * Projetos progressivos do curso Patrulha Espacial, no Construtor.
 * Os extremos são os arquivos aprovados em 3a7fb2c2edda8d461e1d8fdc64bfd80bc6138795.
 * As etapas intermediárias retiram somente regras ainda não ensinadas; a preparação,
 * as 16 peças do Blender (referências da biblioteca), o começo e as telas finais permanecem
 * presentes em toda a cadeia.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { StudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'
import { exportFromSource } from './construtor-base-projetos'

export const PATRULHA_CURSO = 'jornada-construtor-base-3d'
export const PATRULHA_ETAPAS = [
  'inicio',
  'disparo',
  'origem',
  'trajeto-tiro',
  'limite-tiro',
  'relogio',
  'entrada',
  'trajeto-asteroide',
  'limite-asteroide',
  'contato',
  'contador',
  'soma',
  'placar',
  'vidas',
  'dano',
  'retirada-batida',
  'derrota',
  'vitoria',
  'completo',
] as const
export type PatrulhaEtapa = (typeof PATRULHA_ETAPAS)[number]

const aprovados = resolve(
  import.meta.dirname,
  '../../aulas-interativas/construtor/prototipos-base/3d',
)
const readApproved = (kind: 'inicial' | 'completo') =>
  JSON.parse(
    readFileSync(resolve(aprovados, `patrulha-espacial-3d-${kind}.szproject.json`), 'utf8'),
  ) as StudioAuthoringProject

const clonar = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const cache = new Map<PatrulhaEtapa, StudioAuthoringProject>()

/** Retira apenas o invólucro de ciclo de vida que o gerador oficial acrescenta. */
function fonteDoAprovado(project: StudioAuthoringProject): string {
  const script = project.files['script.js']
  const start = script.indexOf('  // Ao iniciar\n')
  const end = script.lastIndexOf('\n});')
  if (start < 0 || end < start) throw new Error('Invólucro oficial da Patrulha não reconhecido')
  return (
    script
      .slice(start + '  // Ao iniciar\n'.length, end)
      .replace(/^  /gm, '')
      .replace(/^\/\/ (?:Quando acontecer|Enquanto estiver rodando)\n/gm, '')
      .trim() + '\n'
  )
}

export function fontePatrulha(etapa: PatrulhaEtapa): string {
  const n = PATRULHA_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida da Patrulha: ${etapa}`)
  if (etapa === 'completo') return fonteDoAprovado(readApproved('completo'))
  let source = fonteDoAprovado(readApproved('inicial'))
  if (etapa === 'inicio') return source
  const tem = (feature: PatrulhaEtapa) => n >= PATRULHA_ETAPAS.indexOf(feature)

  if (tem('trajeto-tiro'))
    source = source.replace('let velocidadeTiros = 0;', 'let velocidadeTiros = -22;')
  if (tem('trajeto-asteroide'))
    source = source.replace('let velocidadeAsteroides = 0;', 'let velocidadeAsteroides = 7;')
  if (tem('contador'))
    source = source.replace('let estado = "inicio";', 'let pontos = 0;\nlet estado = "inicio";')
  if (tem('vidas'))
    source = source.replace(
      'let estado = "inicio";',
      'let estado = "inicio";\nSZGame3D.setLife(nave, 3);',
    )
  if (tem('placar')) {
    source = source.replace(
      'SZGame3D.hudText("top-center", "PATRULHA ESPACIAL | Abra uma rota entre os asteroides");',
      'SZGame3D.hudText("top-center", "PATRULHA ESPACIAL | Abra uma rota entre os asteroides");\nSZGame3D.hudText("top-right", "Acertos: 0 / 20");',
    )
  }

  const eventos: string[] = []
  if (tem('disparo')) {
    const x = tem('origem') ? 'SZGame3D.getPos(nave, "x")' : '0'
    eventos.push(`SZGame3D.onKey("Space", () => {
  if (estado === "jogando") {
    SZGame3D.spawnCopy(tiros, moldeTiro, ${x}, 1, -1.6);
    SZGame3D.playNote(880, 60);
  }
});`)
  }
  if (tem('dano')) {
    const retirar = tem('retirada-batida')
      ? '    SZGame3D.removeFromGroup(asteroides, asteroideQueBateu);\n'
      : ''
    eventos.push(`SZGame3D.onTouchGroup(nave, asteroides, (asteroideQueBateu) => {
  if (estado === "jogando") {
${retirar}    SZGame3D.hurt(nave, 1);
    SZGame3D.playEffect("hit");
  }
});`)
  }
  source = source.replace(
    'SZGame3D.animate(cena, () => {',
    `${eventos.join('\n')}\nSZGame3D.animate(cena, () => {`,
  )

  if (tem('contato')) {
    const somar = tem('soma') ? '            pontos = pontos + 1;\n' : ''
    const placar = tem('placar')
      ? '            SZGame3D.hudText("top-right", "Acertos: " + pontos + " / 20");\n'
      : ''
    source = source.replace(
      /if \(alvoAtivo\) \{\s*\}/,
      `if (alvoAtivo) {
          if (SZGame3D.collides(tiro, asteroide)) {
            SZGame3D.removeFromGroup(asteroides, asteroide);
            SZGame3D.removeFromGroup(tiros, tiro);
${somar}            alvoAtivo = false;
            SZGame3D.playEffect("coin");
${placar}          }
        }`,
    )
  }
  const limites: string[] = []
  if (tem('limite-tiro')) limites.push('    SZGame3D.pruneArea(tiros, "z", -36, 3);')
  if (tem('limite-asteroide')) limites.push('    SZGame3D.pruneArea(asteroides, "z", -36, 6);')
  if (limites.length)
    source = source.replace(/\n  }\n\}\);\s*$/, `\n${limites.join('\n')}\n  }\n});\n`)

  if (tem('derrota')) {
    const vencer = tem('vitoria')
      ? ` else {
      if (pontos >= 20) {
        estado = "vitoria";
        SZGame3D.hudText("bottom-center", "");
        SZGame3D.playEffect("coin");
        SZGame3D.endGame("ganhou");
      }
    }`
      : ''
    const decisao = `
  if (estado === "jogando") {
    if (SZGame3D.lifeOf(nave) <= 0) {
      estado = "derrota";
      SZGame3D.hudText("bottom-center", "");
      SZGame3D.endGame("perdeu");
    }${vencer}
  }`
    source = source.replace(
      'SZGame3D.animate(cena, () => {',
      `SZGame3D.animate(cena, () => {${decisao}`,
    )
  }
  if (tem('relogio')) {
    const x = tem('entrada') ? 'Math.random() * 10.4 - 5.2' : '0'
    source += `SZGame3D.everySecondsLoop(1.5, () => {
  if (estado === "jogando") {
    SZGame3D.spawnCopy(asteroides, moldeAsteroide, ${x}, 1, -28);
  }
});\n`
  }
  return source
}

export function montarProjetoPatrulha(etapa: string): StudioAuthoringProject {
  if (!(PATRULHA_ETAPAS as readonly string[]).includes(etapa)) {
    throw new Error(`Etapa desconhecida da Patrulha: ${etapa}`)
  }
  const stage = etapa as PatrulhaEtapa
  if (!cache.has(stage)) {
    if (stage === 'inicio' || stage === 'completo') {
      cache.set(stage, readApproved(stage === 'inicio' ? 'inicial' : 'completo'))
    } else {
      cache.set(
        stage,
        exportFromSource({
          projectId: `construtor-patrulha-espacial-${stage}`,
          name: `Patrulha Espacial | ${stage}`,
          extensionId: 'game-3d',
          source: fontePatrulha(stage),
          assets: readApproved('completo').assets,
        }),
      )
    }
  }
  return clonar(cache.get(stage)!)
}
