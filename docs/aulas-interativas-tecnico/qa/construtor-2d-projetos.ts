/** Progressão do Nave 2D: parte da infraestrutura aprovada e acrescenta uma conquista por vez. */
import { readFileSync } from 'node:fs'
import { exportFromIR } from './construtor-base-projetos'

const base = new URL('../../aulas-interativas/construtor/prototipos-base/2d/', import.meta.url)
const inicial = JSON.parse(readFileSync(new URL('nave-2d-inicial.szproject.json', base), 'utf8'))
const completo = JSON.parse(readFileSync(new URL('nave-2d-completo.szproject.json', base), 'utf8'))

/** Escolhas visuais não produzem uma resposta única: estas etapas usam a combinação Aurora. */
export const etapas2D = [
  'inicial',
  'aparencia-inicial',
  'movimento',
  'limite',
  'instrucoes',
  'evento-tiro',
  'grupo-tiros',
  'origem-tiro',
  'voo-tiros',
  'limpeza-tiros',
  'relogio-asteroides',
  'asteroides',
  'limpeza-asteroides',
  'colisao-tiros',
  'efeitos-acerto',
  'placar',
  'pontos',
  'vidas',
  'colisao-nave',
  'dano',
  'inicio-conferido',
  'aparencias',
  'meta',
  'vitoria',
  'derrota',
  'final',
] as const
export type Etapa2D = (typeof etapas2D)[number]

const n = (value: number) => ({ type: 'num', value })
const clone = <T>(value: T): T => structuredClone(value)
const at = (etapa: string) => {
  const index = etapas2D.indexOf(etapa as Etapa2D)
  if (index < 0) throw new Error(`Etapa 2D desconhecida: ${etapa}`)
  return index
}

/**
 * A abertura conserva o texto literal do inicial. A meta é fixa em20, por isso a
 * apresentação é igual à do aprovado sem exigir que a criança altere as telas.
 * As guardas dos novos eventos/relógios são aplicadas no momento da construção.
 */
export function irDaEtapa2D(etapa: string) {
  const index = at(etapa)
  const reached = (key: Etapa2D) => index >= at(key)
  const ir = clone(inicial.ir)
  const all = completo.ir.behavior
  const refFrame = all.loops.find((node: any) => node.type === 'g2d:updateEachFrame')
  const frame = ir.behavior.loops[0]
  const originalGuard = frame.body[0]
  const actions = refFrame.body[0].then
  const fromStart = (test: (node: any) => boolean) => clone(all.start.find(test))
  const fromActions = (test: (node: any) => boolean) => clone(actions.find(test))
  const startAdd: any[] = []
  if (reached('grupo-tiros'))
    startAdd.push(fromStart((x: any) => x.type === 'g2d:createGroup' && x.varName === 'tiros'))
  if (reached('relogio-asteroides'))
    startAdd.push(fromStart((x: any) => x.type === 'g2d:createGroup' && x.varName === 'asteroides'))
  if (reached('placar'))
    startAdd.push(fromStart((x: any) => x.type === 'var' && x.name === 'pontos'))
  if (reached('meta')) startAdd.push(fromStart((x: any) => x.type === 'var' && x.name === 'meta'))
  if (reached('vidas')) startAdd.push(fromStart((x: any) => x.type === 'g2d:setHealth'))
  ir.behavior.start.splice(ir.behavior.start.length - 1, 0, ...startAdd)

  if (reached('evento-tiro')) {
    const event = clone(all.events.find((x: any) => x.type === 'g2d:onKey' && x.key === 'Space'))
    if (!reached('grupo-tiros')) {
      // biome-ignore lint/suspicious/noThenProperty: campo obrigatório do IR para a lista de comandos do ramo verdadeiro.
      event.body[0].then = event.body[0].then.filter((x: any) => x.type !== 'g2d:spawnImageInGroup')
    } else {
      const bullet = event.body[0].then.find((x: any) => x.type === 'g2d:spawnImageInGroup')
      if (!reached('origem-tiro')) {
        bullet.x = n(395)
        bullet.y = n(372)
      }
      if (!reached('voo-tiros')) bullet.vy = n(0)
    }
    ir.behavior.events.push(event)
  }
  if (reached('relogio-asteroides')) {
    const clock = clone(all.loops.find((x: any) => x.type === 'g2d:everySeconds'))
    if (!reached('asteroides')) {
      // biome-ignore lint/suspicious/noThenProperty: campo obrigatório do IR para a lista de comandos do ramo verdadeiro.
      clock.body[0].then = []
    }
    ir.behavior.loops.push(clock)
  }

  const play: any[] = []
  if (reached('movimento')) play.push(fromActions((x: any) => x.type === 'g2d:arrowsX'))
  if (reached('limite')) play.push(fromActions((x: any) => x.type === 'g2d:clampToScreen'))
  if (reached('voo-tiros'))
    play.push(fromActions((x: any) => x.type === 'g2d:updateGroup' && x.groupVar === 'tiros'))
  if (reached('asteroides'))
    play.push(fromActions((x: any) => x.type === 'g2d:updateGroup' && x.groupVar === 'asteroides'))
  if (reached('limpeza-tiros'))
    play.push(fromActions((x: any) => x.type === 'g2d:pruneOffscreen' && x.groupVar === 'tiros'))
  if (reached('limpeza-asteroides'))
    play.push(
      fromActions((x: any) => x.type === 'g2d:pruneOffscreen' && x.groupVar === 'asteroides'),
    )
  if (reached('colisao-tiros')) {
    const hits = fromActions((x: any) => x.type === 'g2d:onGroupOverlap')
    hits.body = hits.body.filter((x: any) => {
      if (x.type === 'assign') return reached('pontos')
      if (['g2d:explode', 'g2d:playFx'].includes(x.type)) return reached('efeitos-acerto')
      return true
    })
    play.push(hits)
  }
  if (reached('colisao-nave')) {
    const crashes = fromActions((x: any) => x.type === 'g2d:onSpriteGroupOverlap')
    crashes.body = crashes.body.filter((x: any) => x.type !== 'g2d:damageSprite' || reached('dano'))
    play.push(crashes)
  }
  if (reached('vitoria')) {
    const outcome = fromActions(
      (x: any) => x.type === 'if' && x.cond?.type === 'g2d:healthDepleted',
    )
    play.push(reached('derrota') ? outcome : outcome.else[0])
  }
  // biome-ignore lint/suspicious/noThenProperty: campo obrigatório do IR para a lista de comandos do ramo verdadeiro.
  originalGuard.then = play

  const drawings: any[] = [frame.body[1]]
  for (const item of refFrame.body.slice(1)) {
    const draw =
      (item.type === 'g2d:drawGroup' && item.groupVar === 'asteroides' && reached('asteroides')) ||
      (item.type === 'g2d:drawGroup' && item.groupVar === 'tiros' && reached('grupo-tiros')) ||
      (item.type === 'g2d:drawSprite' && item.spriteVar === 'nave') ||
      (item.type === 'g2d:drawScore' && item.label === 'Acertos:' && reached('placar')) ||
      (item.type === 'g2d:drawScore' && item.label === 'Meta:' && reached('meta')) ||
      (item.type === 'g2d:drawSpriteHealth' && reached('vidas')) ||
      (item.type === 'g2d:drawBar' && reached('meta')) ||
      (item.type === 'g2d:drawLabel' && reached('instrucoes'))
    if (draw) drawings.push(clone(item))
  }
  // Conserva as três telas prontas, sem consultar pontos/meta antes de existir.
  const screens = frame.body.slice(3)
  frame.body = [originalGuard, ...drawings, ...screens]
  if (reached('final')) {
    // Atualização de descrição acessível, explicitamente orientada na entrega final.
    const description = ir.behavior.start.find((x: any) => x.type === 'g2d:setStageDescription')
    description.description = all.start.find(
      (x: any) => x.type === 'g2d:setStageDescription',
    ).description
  }
  // Os nomes estáveis são por caminho: o mesmo bloco conserva o ID entre etapas.
  // IDs herdados já são únicos; só números transitórios criados aqui precisam de ID.
  const visit = (value: any, path: string) => {
    if (!value || typeof value !== 'object') return
    if (typeof value.type === 'string' && !value.__id) value.__id = `construtor-2d-${path}`
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        visit(v, `${path}-${i}`)
      })
    } else {
      Object.entries(value).forEach(([key, child]) => {
        visit(child, `${path}-${key}`)
      })
    }
  }
  visit(ir, 'ir')
  return ir
}

const cache = new Map<string, any>()
export function projeto2D(etapa: string) {
  at(etapa)
  if (etapa === 'inicial') return clone(inicial)
  if (!cache.has(etapa))
    cache.set(
      etapa,
      exportFromIR({
        projectId: `construtor-2d-${etapa}`,
        name: `Nave Contra Asteroides · ${etapa}`,
        ir: irDaEtapa2D(etapa),
        assets: clone(inicial.assets),
      }),
    )
  return clone(cache.get(etapa))
}

export const referenciaAprovada2D = () => clone(completo)

/** Metadados de apoio para QA e documentação; não pertencem ao programa do aluno. */
export const contrato2D = {
  initial: 'nave-2d-inicial.szproject.json',
  complete: 'nave-2d-completo.szproject.json',
  approvedCommit: '3a7fb2c2edda8d461e1d8fdc64bfd80bc6138795',
  difference:
    'Abertura literal acerte20 preservada do inicial; o aprovado lê meta na mesma frase. Regras, aparência e resultado permanecem equivalentes.',
  rules: { target: 20, lives: 3, spawnSeconds: 1.5, protectionFrames: 60 },
}
