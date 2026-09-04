import { describe, expect, it } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { normalizeAssetName } from '../core/names'
import { sanitizeMoldaAsset } from '../core/sanitize'
import { exportModelGlb } from '../export/modelGlb'
import { projectModelThumb } from '../model/isoThumb'
import { findTemplate, MOLDA_TEMPLATE_IDS, MOLDA_TEMPLATES } from './catalog'

describe('catálogo de modelos prontos', () => {
  it('a lista casa com os ids e cada id acha o seu template', () => {
    expect(MOLDA_TEMPLATES.map((template) => template.id)).toEqual([...MOLDA_TEMPLATE_IDS])
    for (const id of MOLDA_TEMPLATE_IDS) expect(findTemplate(id)?.id).toBe(id)
    expect(findTemplate('nao-existe')).toBeNull()
  })

  for (const template of MOLDA_TEMPLATES) {
    describe(template.id, () => {
      it('build() sobrevive ao sanitize SEM mudar (grade, snap, giro múltiplo de 15, peles no tamanho certo)', () => {
        const built = template.build()
        expect(built.kind).toBe('model')
        expect(built.parts.length).toBeGreaterThanOrEqual(3)
        expect(built.parts.length).toBeLessThanOrEqual(MOLDA_LIMITS.maxParts)
        expect(sanitizeMoldaAsset(structuredClone(built))).toEqual(built)
      })

      it('o nome sugerido já é kebab-case e é o nome do modelo montado', () => {
        expect(normalizeAssetName(template.suggestedName)).toBe(template.suggestedName)
        expect(template.build().name).toBe(template.suggestedName)
      })

      it('dois build() geram ids DIFERENTES (cópia independente), inclusive nas peças', () => {
        const a = template.build()
        const b = template.build()
        expect(a.id).not.toBe(b.id)
        const idsA = new Set(a.parts.map((part) => part.id))
        expect(b.parts.some((part) => idsA.has(part.id))).toBe(false)
      })

      it('vira um .glb que cabe no Estúdio e tem miniatura isométrica', () => {
        const built = template.build()
        const glb = exportModelGlb(built)
        expect(glb.ok).toBe(true)
        expect(projectModelThumb(built)).not.toBeNull()
      })

      it('usa só cores da paleta de fábrica (índices 1 a 15)', () => {
        for (const part of template.build().parts) {
          expect(part.color).toBeGreaterThanOrEqual(1)
          expect(part.color).toBeLessThanOrEqual(15)
        }
      })
    })
  }

  it('o personagem tem o rosto pintado na frente da cabeça (vitrine do Pintar)', () => {
    const built = findTemplate('personagem')?.build()
    const head = built?.parts.find((part) => part.name === 'cabeca')
    expect(head?.faces.pz).toBeDefined()
    expect(head?.faces.pz?.data.some((index) => index === 15)).toBe(true)
  })

  it('o carro e a nave usam peças GIRADAS (vitrine do Girar) e a casa tem duas águas', () => {
    const rotated = (id: string) =>
      findTemplate(id)
        ?.build()
        .parts.filter((part) => part.rotation.some((degrees) => degrees !== 0)).length ?? 0
    expect(rotated('carro')).toBeGreaterThanOrEqual(4)
    expect(rotated('nave')).toBeGreaterThanOrEqual(2)
    const roof = findTemplate('casa')
      ?.build()
      .parts.filter((part) => part.shape === 'wedge')
    expect(roof).toHaveLength(2)
  })
})
