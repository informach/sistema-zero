import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three'
import type { RotaDaFaisca } from '../../sistemas/faisca'
import { SOLOS_DA_FAISCA } from '../../sistemas/implantacao-da-faisca'

const Pintura = createContext<CanvasTexture | null>(null)
/** Acabamento no material do próprio terreno, sem uma segunda superfície disputando profundidade. */
function texturaDoSolo(rotas: readonly RotaDaFaisca[]) {
  const c = document.createElement('canvas')
  c.width = 2048
  c.height = 2048
  const g = c.getContext('2d')!
  g.scale(2048 / 560, 2048 / 560)
  g.translate(280, 280)
  for (const m of SOLOS_DA_FAISCA) {
    g.save()
    g.translate(m.x, m.z)
    g.scale(m.rx, m.rz)
    const grad = g.createRadialGradient(0, 0, 0.5, 0, 0, 1.08)
    grad.addColorStop(0, `${m.cor}f0`)
    grad.addColorStop(0.65, `${m.cor}88`)
    grad.addColorStop(1, `${m.cor}00`)
    g.fillStyle = grad
    g.beginPath()
    for (let i = 0; i < 64; i++) {
      const a = (i * Math.PI * 2) / 64,
        r = 1 + 0.045 * Math.sin(a * 5 + m.x) + 0.025 * Math.cos(a * 9)
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r
      if (i === 0) g.moveTo(x, z)
      else g.lineTo(x, z)
    }
    g.closePath()
    g.fill()
    g.restore()
  }
  g.lineJoin = 'round'
  g.lineCap = 'round'
  for (const rota of rotas) {
    if (rota.tipo === 'ponte-interna') continue
    const path = new Path2D(),
      pts = rota.pontos,
      largura = rota.tipo === 'atalho' ? 1.7 : 2.6
    path.moveTo(pts[0]!.x, pts[0]!.z)
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!,
        p = pts[i]!,
        b = pts[i + 1]
      if (!b) {
        path.lineTo(p.x, p.z)
        continue
      }
      const de = Math.hypot(p.x - a.x, p.z - a.z),
        ate = Math.hypot(b.x - p.x, b.z - p.z),
        r = Math.min(1.4, de / 3, ate / 3)
      path.lineTo(p.x - ((p.x - a.x) * r) / de, p.z - ((p.z - a.z) * r) / de)
      path.quadraticCurveTo(p.x, p.z, p.x + ((b.x - p.x) * r) / ate, p.z + ((b.z - p.z) * r) / ate)
    }
    for (const [w, a] of [
      [largura + 1.1, 0.12],
      [largura + 0.55, 0.25],
      [largura, 0.9],
    ]) {
      g.lineWidth = w!
      g.globalAlpha = a!
      g.strokeStyle = rota.tipo === 'atalho' ? '#a79f79' : '#cbb384'
      g.stroke(path)
    }
  }
  g.globalAlpha = 1
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
export function PinturaDoSolo({
  rotas,
  children,
}: {
  rotas: readonly RotaDaFaisca[]
  children: ReactNode
}) {
  const textura = useMemo(() => texturaDoSolo(rotas), [rotas])
  useEffect(() => () => textura.dispose(), [textura])
  return <Pintura.Provider value={textura}>{children}</Pintura.Provider>
}
/** Extensão de material, como a pintura existente das ilhas. Só altera o terreno da Faísca. */
export function MaterialDoSolo({ faisca }: { faisca: boolean }) {
  const textura = useContext(Pintura)
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 1 })
    if (faisca && textura) {
      m.onBeforeCompile = (s) => {
        s.uniforms.uSoloFaisca = { value: textura }
        s.vertexShader =
          'varying vec2 vSoloFaisca;\n' +
          s.vertexShader.replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvSoloFaisca = (modelMatrix * vec4(transformed, 1.0)).xz;',
          )
        s.fragmentShader =
          'varying vec2 vSoloFaisca; uniform sampler2D uSoloFaisca;\n' +
          s.fragmentShader.replace(
            '#include <color_fragment>',
            '#include <color_fragment>\nvec4 solo = texture2D(uSoloFaisca, vec2((vSoloFaisca.x+280.0)/560.0, 1.0-(vSoloFaisca.y+280.0)/560.0));\ndiffuseColor.rgb = mix(diffuseColor.rgb, solo.rgb, solo.a);',
          )
      }
      m.customProgramCacheKey = () => 'faisca-solo-material-1'
    }
    return m
  }, [textura, faisca])
  useEffect(() => () => material.dispose(), [material])
  return <primitive object={material} attach="material" />
}
