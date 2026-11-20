import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type Light, Matrix4 } from 'three'
import { type AguaRasa, useEstado, useJogo } from '../estado/contexto'
import { jogoPausado } from '../sistemas/pausa'
import { LADO_DO_SETOR } from '../sistemas/setores-do-arquipelago'
import { TextoSobreMadeira } from './faisca/caminhos'
import { Iris } from './faisca/piloto'
import type { CenarioPublicadoPronto } from './preparar-cenario-publicado'

/** A cena visual pertence ao instalador canônico; este componente registra seus sistemas nativos. */
export function CenarioPublicado({
  pronto,
  aoErro,
}: {
  pronto: CenarioPublicadoPronto
  /** Falha ao preparar o detalhe de um setor: aparece, e o jogo segue com a janela anterior. */
  aoErro?: (erro: string) => void
}) {
  const { rastro, pedidos, movimento, ambiente } = useJogo(),
    pausado = useEstado(jogoPausado),
    camera = useThree((s) => s.camera)
  const [colisao, setColisao] = useState(pronto.colisao)
  useLayoutEffect(() => {
    const anteriores = movimento.aguas.filter((a) => pronto.regiao.contem(a.x, a.z))
    movimento.aguas = movimento.aguas.filter((a) => !anteriores.includes(a))
    const agua: AguaRasa = {
      id: `publicado:${pronto.publicacao.id}`,
      ...pronto.perfil.ilha.centro,
      raioX: pronto.perfil.ilha.raio,
      raioZ: pronto.perfil.ilha.raio,
      giro: 0,
      y: 0,
      consultaNivel(x, z, raio) {
        return pronto.regiao.contem(x, z) ? (pronto.agua.nivel(x, z, raio)?.nivel ?? null) : null
      },
    }
    movimento.aguas.push(agua)
    return () => {
      const i = movimento.aguas.indexOf(agua)
      if (i >= 0) movimento.aguas.splice(i, 1)
      for (const a of anteriores) if (!movimento.aguas.includes(a)) movimento.aguas.push(a)
    }
  }, [pronto, movimento])
  const placas = useMemo(
    () =>
      pronto.perfil.placas
        .filter((p) => pronto.regiao.contem(p.matriz[12]!, p.matriz[14]!))
        .map((p) => {
          return {
            id: p.entidade,
            x: p.matriz[12]!,
            y: p.matriz[13]!,
            z: p.matriz[14]!,
            giro: 0,
            escala: 1,
            matriz: new Matrix4().fromArray(p.matriz),
            sinal: { texto: p.texto },
          }
        }),
    [pronto],
  )
  const perto = (x: number, z: number) =>
    Math.abs(x - rastro.x) < 240 && Math.abs(z - rastro.z) < 240
  // As luminárias da composição só acendem à noite. Apagar pela intensidade (e não escondendo)
  // mantém a contagem de luzes: trocar a contagem recompilaria todos os materiais na virada.
  const luminarias = useMemo(() => {
    const lista: { luz: Light; intensidade: number }[] = []
    pronto.cena.traverse((o) => {
      const luz = o as Light
      if (luz.isLight) lista.push({ luz, intensidade: luz.intensity })
    })
    return lista
  }, [pronto])
  useLayoutEffect(
    () => () => {
      for (const l of luminarias) l.luz.intensity = l.intensidade
    },
    [luminarias],
  )
  // Setor que já falhou não é tentado de novo a cada quadro (o erro apareceria em rajada).
  const setoresQueFalharam = useRef(new Set<string>()),
    ultimoErro = useRef<string | null>(null),
    // O setor cuja colisão está montada no Rapier agora (o `ref` do collider o marca).
    setorMontado = useRef<string | null>(null)
  const celulaDe = (p: { x: number; z: number }) => ({
    x: Math.floor(p.x / LADO_DO_SETOR),
    z: Math.floor(p.z / LADO_DO_SETOR),
  })
  useFrame((_, dt) => {
    try {
      // Com um teleporte esperando, o detalhe e a colisão vão para o DESTINO, não para onde
      // o corpo ainda está: senão ela chegaria sem chão por um ou dois passos.
      const foco = pedidos.teleporte ?? rastro,
        { x, z } = celulaDe(foco),
        chave = `${x}:${z}`
      if (
        (x !== colisao.celula.x || z !== colisao.celula.z) &&
        !setoresQueFalharam.current.has(chave)
      )
        try {
          setColisao(pronto.atualizarDetalhe(foco))
        } catch (erro) {
          setoresQueFalharam.current.add(chave)
          aoErro?.(erro instanceof Error ? erro.message : String(erro))
        }
      // A espera de chão solta quando a colisão do setor de destino já está montada; isso
      // vale também para um destino no mesmo setor (nenhum collider novo nasce aí).
      if (
        pedidos.chaoChegando.has('cenario-publicado') &&
        setorMontado.current === chave &&
        x === colisao.celula.x &&
        z === colisao.celula.z
      )
        pedidos.chaoChegando.delete('cenario-publicado')
      for (const l of luminarias) l.luz.intensity = ambiente.noite ? l.intensidade : 0
      pronto.atualizar(pausado ? 0 : Math.min(dt, 0.1))
      pronto.quadro(camera, pronto.raiz.position)
    } catch (erro) {
      // Nunca deixar uma exceção parar o laço do jogo (física e desenho rodam depois daqui).
      const frase = erro instanceof Error ? erro.message : String(erro)
      if (frase !== ultimoErro.current) aoErro?.(frase)
      ultimoErro.current = frase
    }
  }, -2)
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {colisao.triangulos > 0 && (
          <TrimeshCollider
            key={`${colisao.celula.x}:${colisao.celula.z}`}
            args={[colisao.vertices, colisao.indices]}
            ref={(c) => {
              const montado = `${colisao.celula.x}:${colisao.celula.z}`
              if (!c) {
                if (setorMontado.current === montado) setorMontado.current = null
                return
              }
              setorMontado.current = montado
              // Só solta a espera quando o chão montado é o do setor para onde ela vai.
              const alvo = celulaDe(pedidos.teleporte ?? rastro)
              if (alvo.x === colisao.celula.x && alvo.z === colisao.celula.z)
                pedidos.chaoChegando.delete('cenario-publicado')
            }}
          />
        )}
      </RigidBody>
      {pronto.fisica.troncos
        .filter((t) => perto(t.posicao[0], t.posicao[2]))
        .map((t) => (
          <RigidBody
            key={t.id}
            type="fixed"
            colliders={false}
            position={t.posicao}
            rotation={[0, t.giro, 0]}
          >
            <CylinderCollider args={[t.meiaAltura, t.raio]} position={[0, t.meiaAltura, 0]} />
          </RigidBody>
        ))}
      {pronto.fisica.fundacoes
        .filter((f) => perto(f.centro[0], f.centro[2]))
        .map((f) => (
          <RigidBody
            key={`fundacao:${f.id}`}
            type="fixed"
            colliders={false}
            position={f.centro}
            rotation={[0, f.giro, 0]}
          >
            <mesh receiveShadow>
              <boxGeometry args={[f.metade[0] * 2, f.metade[1] * 2, f.metade[2] * 2]} />
              <meshStandardMaterial color="#8c8e7c" roughness={1} />
            </mesh>
            <CuboidCollider args={f.metade} />
          </RigidBody>
        ))}
      <TextoSobreMadeira colecao={placas} assentar={(p) => ({ y: p.y })} />
      {pronto.personagens.map((p) => (
        <Iris
          key={p.id}
          ator={p.ator}
          origem={p.posicao}
          escala={p.escala.x}
          giro={p.giro}
          ativo={perto(p.posicao.x, p.posicao.z)}
          piso={(x, z) =>
            p.posicao.y +
            (pronto.alturas ? pronto.alturas(x, z) - pronto.alturas(p.posicao.x, p.posicao.z) : 0)
          }
        />
      ))}
    </>
  )
}
