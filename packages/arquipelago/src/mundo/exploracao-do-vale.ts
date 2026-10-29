import { NINHOS_DO_VALE } from '@sistemazero/arquipelago-contracts'
import { type Object3D, Quaternion, Vector3 } from 'three'
import { acharCaminho, comprimentoDoCaminho, criarGrade, pontoNoCaminho } from '../sistemas/caminho'
import { CORPO } from '../sistemas/corpo'
import { rastroNoCaminho } from '../sistemas/pegadas'
import { EXPLORACAO_DO_VALE as V } from '../sistemas/vale'
import { chaoLivre } from './chao-livre'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { colisoresDoQuadro } from './lugar-do-quadro'

/** Os colisores preparados já estão girados; o caminho usa as âncoras locais do GLB. */
export function colisoresDoCaminhoDoVale(
  modelo: Object3D,
  preparados: readonly ColisorDaIlha[],
): ColisorDaIlha[] {
  const inverso = modelo.quaternion.clone().invert()
  return [...preparados, ...colisoresDoQuadro(modelo)].flatMap((c) => {
    if (c.forma === 'malha') return []
    const p = new Vector3(...c.posicao).applyQuaternion(inverso)
    const q = inverso.clone().multiply(new Quaternion(...c.rotacao))
    return [
      {
        ...c,
        posicao: [p.x, p.y, p.z] as [number, number, number],
        rotacao: [q.x, q.y, q.z, q.w] as [number, number, number, number],
      },
    ]
  })
}

/** Tudo no referencial do GLB. A grade só cobre a chegada e a escavação, fora do vulcão. */
export function explorarVale(modelo: Object3D, preparados: readonly ColisorDaIlha[]) {
  const colisores = colisoresDoCaminhoDoVale(modelo, preparados)
  const ancora = (nome: string) => {
    const p = modelo.getObjectByName(nome)?.position
    if (!p) throw new Error(`Vale sem a âncora ${nome}`)
    return { x: p.x, y: p.y, z: p.z }
  }
  const chegada = ancora('chegada')
  const escavacao = ancora('escavacao')
  const postes = colisores.filter(
    (c): c is Exclude<ColisorDaIlha, { forma: 'malha' }> =>
      c.forma !== 'malha' && c.nome.startsWith('col-cil-poste-cerca'),
  )
  if (!postes.length) throw new Error('Escavação sem os postes da cerca')
  const xs = postes.map((c) => c.posicao[0])
  const zs = postes.map((c) => c.posicao[2])
  const de = { x: Math.min(...xs) - V.alcance, z: Math.min(chegada.z, ...zs) - V.alcance }
  const ate = { x: Math.max(chegada.x, ...xs) + V.alcance, z: Math.max(...zs) + V.alcance }
  const livre = (raio: number) =>
    chaoLivre(colisores, {
      chao: chegada.y,
      raio,
      altura: CORPO.doCentroAoPe * 2,
      raioDaIlha: Math.hypot(chegada.x, chegada.z) + CORPO.raio,
    })
  const cabe = livre(CORPO.raio + V.folgaDoCaminho)
  const cabeOsso = livre(V.raioDoOsso)
  const grade = criarGrade(de, ate, V.grade, cabe)
  let descoberta: { x: number; y: number; z: number } | null = null
  let distancia = Infinity
  for (let l = 0; l < grade.linhas; l++)
    for (let c = 0; c < grade.colunas; c++) {
      const x = de.x + c * V.grade
      const z = de.z + l * V.grade
      // O centro da descoberta fica dentro da cerca, com folga para o osso existente.
      if (
        x < Math.min(...xs) + V.raioDoOsso ||
        x > Math.max(...xs) - V.raioDoOsso ||
        z < Math.min(...zs) + V.raioDoOsso ||
        z > Math.max(...zs) - V.raioDoOsso
      )
        continue
      const d = (x - escavacao.x) ** 2 + (z - escavacao.z) ** 2
      if (d >= distancia || !cabeOsso(x, z) || !cabe(x, z)) continue
      descoberta = { x, y: escavacao.y, z }
      distancia = d
    }
  if (!descoberta) throw new Error('Escavação sem espaço livre para o osso')
  const caminho = acharCaminho(grade, descoberta, chegada, (a, b) => {
    // Conferir entre as células impede o atalho de cortar a quina das costelas.
    const passos = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (V.grade / 4)))
    for (let i = 0; i <= passos; i++) {
      const t = i / passos
      if (!cabe(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false
    }
    return true
  })
  if (!caminho) throw new Error('Escavação sem caminho pela cerca')
  const tamanho = comprimentoDoCaminho(caminho)
  const pegadas = rastroNoCaminho(caminho, {
    comeca: V.passo,
    acaba: tamanho,
    passo: V.passo,
    lado: V.lado,
  })
  const pontos = [chegada, pontoNoCaminho(caminho, tamanho / 2), descoberta]
  const ninhos = NINHOS_DO_VALE.map((id) => ({ id, ...ancora(id) }))
  return { chegada, escavacao: descoberta, caminho, pegadas, pontos, ninhos }
}
