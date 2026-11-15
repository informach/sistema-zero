import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh, Matrix4, Object3D } from 'three'
import type { ConexaoDoArquipelago } from '../../sistemas/geografia-do-arquipelago'
import { type EstadoDaPonte, modulosDaPonte } from '../../sistemas/ponte-do-arquipelago'

function Pecas({
  dados,
  capacidade,
}: {
  dados: readonly { matriz: Matrix4; cor: Color }[]
  capacidade: number
}) {
  const malha = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = malha.current
    if (!m) return
    m.count = dados.length
    dados.forEach((d, i) => {
      m.setMatrixAt(i, d.matriz)
      m.setColorAt(i, d.cor)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [dados])
  return (
    <instancedMesh ref={malha} args={[undefined, undefined, capacidade]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

export function PonteMacro({
  conexao,
  estado,
  progresso = 0,
}: {
  conexao: ConexaoDoArquipelago
  estado: EstadoDaPonte
  progresso?: number
}) {
  const modulos = useMemo(() => modulosDaPonte(conexao), [conexao])
  const quantos =
    estado === 'aberta'
      ? modulos.length
      : estado === 'reconstruindo'
        ? Math.floor(progresso * modulos.length)
        : 0
  const visiveis = useMemo(
    () => modulos.filter((_, i) => i < quantos || i < 2 || i >= modulos.length - 2),
    [modulos, quantos],
  )
  const desenho = useMemo(() => {
    const pisos: { matriz: Matrix4; cor: Color }[] = []
    const grades: { matriz: Matrix4; cor: Color }[] = []
    for (const m of visiveis) {
      const base = new Object3D()
      base.position.set(m.x, m.y - 0.2, m.z)
      base.rotation.y = m.giro
      base.rotateX(m.inclinacao)
      base.updateMatrix()
      const peca = (x: number, y: number, largura: number, altura: number, cor: string) => ({
        matriz: base.matrix
          .clone()
          .multiply(
            new Matrix4()
              .makeTranslation(x, y, 0)
              .multiply(new Matrix4().makeScale(largura, altura, m.comprimento + 0.02)),
          ),
        cor: new Color(cor),
      })
      pisos.push(peca(0, 0, m.largura, 0.4, m.ordem < quantos ? '#b59a70' : '#89775e'))
      for (const lado of [-1, 1])
        grades.push(peca(lado * (m.largura / 2 - 0.15), 0.85, 0.18, 1.5, '#77674f'))
    }
    return { pisos, grades }
  }, [visiveis, quantos])
  return (
    <group>
      <Pecas dados={desenho.pisos} capacidade={modulos.length} />
      <Pecas dados={desenho.grades} capacidade={modulos.length * 2} />
      {estado !== 'aberta' ? (
        <RigidBody
          type="fixed"
          colliders={false}
          position={[conexao.origem.x, conexao.origem.y + 0.9, conexao.origem.z]}
          rotation={[
            0,
            Math.atan2(conexao.destino.x - conexao.origem.x, conexao.destino.z - conexao.origem.z),
            0,
          ]}
        >
          <CuboidCollider args={[conexao.largura / 2, 0.9, 0.15]} />
          <mesh>
            <boxGeometry args={[conexao.largura, 1.8, 0.3]} />
            <meshStandardMaterial color="#ba8156" wireframe />
          </mesh>
        </RigidBody>
      ) : null}
      {modulos.map((m, i) => {
        const cabeceira = i < 2 || i >= modulos.length - 2
        const piso = estado === 'aberta' || cabeceira
        if (!piso) return null
        return (
          <group key={m.ordem} position={[m.x, m.y - 0.2, m.z]} rotation={[0, m.giro, 0]}>
            <group rotation={[m.inclinacao, 0, 0]}>
              <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[m.largura / 2, 0.2, m.comprimento / 2 + 0.01]} />
                {[-1, 1].map((lado) => (
                  <CuboidCollider
                    key={lado}
                    args={[0.1, 0.75, m.comprimento / 2 + 0.01]}
                    position={[lado * (m.largura / 2 - 0.15), 0.85, 0]}
                  />
                ))}
              </RigidBody>
            </group>
          </group>
        )
      })}
    </group>
  )
}
