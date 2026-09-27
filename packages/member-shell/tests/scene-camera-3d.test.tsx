import { describe, expect, test } from 'bun:test'
import { facesAVista, openScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { Camera3dStage } from '../src/components/scene-3d-stages'

/**
 * ⚠️⚠️ O cubo da `camera-3d` mostra o número de cores que o MOTOR diz (lote 2 do Raio-X).
 *
 * Contar as cores é a tarefa da cena, e a conta saiu da faixa, da frase e do palco. Sobrou o
 * DESENHO como única fonte, então ele não pode errar.
 *
 * ⚠️ Mudou de propósito (lote 5 do Raio-X, 16/09/2026): o cubo é UM cubo de verdade, desenhado pela
 * régua do 3D, com LADOS OPOSTOS DA MESMA COR. Antes as cores trocavam sem coerência ao girar (dois
 * lados vizinhos saíam da mesma cor) e "por baixo" desenhava a face de cima. O teste agora lê só o
 * grupo do cubo (`data-cubo`), porque o palco ganhou o mapa de cima, com cores próprias.
 */
describe('camera-3d: o desenho mostra as cores que o motor conta', () => {
  const CORES = ['fill-scene-a', 'fill-scene-b', 'fill-scene-leaf']
  const desenhar = (yaw: number, pitch: number) => {
    const inicio = openScene({ scene: 'camera-3d' })
    const state = { ...inicio, orbit: { ...inicio.orbit, yaw, pitch } }
    const html = renderToStaticMarkup(<Camera3dStage state={state} />)
    const cubo = html.match(/<g data-cubo="[^"]*" data-lados="([^"]*)">([\s\S]*?)<\/g>/)
    expect(cubo, `yaw ${yaw}, pitch ${pitch}`).not.toBeNull()
    const faces = [...(cubo?.[2] ?? '').matchAll(/<path class="(fill-scene-[a-z-]+)"/g)]
      .map((m) => m[1] ?? '')
      .filter((classe) => CORES.includes(classe))
    return { html, lados: (cubo?.[1] ?? '').split(' ').filter(Boolean), faces }
  }

  test('nas 24 posições da câmera, as cores desenhadas batem com `facesAVista`', () => {
    for (let yaw = 0; yaw <= 7; yaw += 1)
      for (let pitch = 0; pitch <= 2; pitch += 1) {
        const { faces } = desenhar(yaw, pitch)
        const distintas = new Set(faces).size
        expect({ yaw, pitch, distintas }).toEqual({
          yaw,
          pitch,
          distintas: facesAVista(yaw, pitch),
        })
        // Uma face por cor: duas faces da mesma cor leriam como uma só.
        expect(faces.length).toBe(distintas)
      }
  })

  test('⭐⭐ é UM cubo: lados opostos têm a mesma cor, e girar mostra os lados na ordem certa', () => {
    // De frente (volta 1), a frente; no canto seguinte, a frente E a direita; de lado, só a direita.
    expect(desenhar(0, 1).lados).toEqual(['frente'])
    expect(desenhar(1, 1).lados.sort()).toEqual(['direita', 'frente'])
    expect(desenhar(2, 1).lados).toEqual(['direita'])
    expect(desenhar(4, 1).lados).toEqual(['tras'])
    expect(desenhar(6, 1).lados).toEqual(['esquerda'])
    // A frente e a trás são da MESMA cor (azul); os dois lados, laranja.
    expect(desenhar(0, 1).faces).toEqual(['fill-scene-a'])
    expect(desenhar(4, 1).faces).toEqual(['fill-scene-a'])
    expect(desenhar(2, 1).faces).toEqual(['fill-scene-b'])
    expect(desenhar(6, 1).faces).toEqual(['fill-scene-b'])
  })

  test('⚠️⚠️ por CIMA aparece o topo, e por BAIXO aparece a base (antes "por baixo" mostrava o topo)', () => {
    expect(desenhar(0, 2).lados).toContain('cima')
    expect(desenhar(0, 2).lados).not.toContain('baixo')
    expect(desenhar(0, 0).lados).toContain('baixo')
    expect(desenhar(0, 0).lados).not.toContain('cima')
  })

  test('o mapa de cima põe a câmera na volta certa, e a altura de agora acesa', () => {
    for (let yaw = 0; yaw <= 7; yaw += 1) {
      const { html } = desenhar(yaw, 2)
      expect(html).toContain(`data-volta="${yaw + 1}"`)
      expect(html).toContain('data-altura="2"')
    }
  })
})
