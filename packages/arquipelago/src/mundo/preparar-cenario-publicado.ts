import { carregarCenaNoThree } from '@sistemazero/molda-cenarios-motor/runtime'
import { Box3, Vector3 } from 'three'
import { prepararColisaoDoCenario } from '../sistemas/colisao-do-cenario'
import { CORPO } from '../sistemas/corpo'
import { prepararFisicaNativa, transformacaoNativa } from '../sistemas/fisica-nativa-do-cenario'
import type { lerCenarioPublicado } from '../sistemas/ler-cenario-publicado'
import { lerPerfilDeCenario } from '../sistemas/perfil-de-cenario'
import { regiaoDoCenario } from '../sistemas/regiao-do-cenario'
import { LADO_DO_SETOR, RAIO_DE_SETORES } from '../sistemas/setores-do-arquipelago'
import { restringirCenarioARegiao } from './regiao-do-cenario'

type Publicado = NonNullable<Awaited<ReturnType<typeof lerCenarioPublicado>>>

/** Mesma grade local que TerrenosMacro usa para excluir o detalhe do LOD distante. */
export function janelaDoCenario(centro: { x: number; z: number }, foco: { x: number; z: number }) {
  const setor = (valor: number, origem: number) =>
    Math.floor(Math.floor(valor / LADO_DO_SETOR) + 0.5 - origem / LADO_DO_SETOR)
  const x = setor(foco.x, centro.x),
    z = setor(foco.z, centro.z)
  return new Box3(
    new Vector3(
      centro.x + (x - RAIO_DE_SETORES) * LADO_DO_SETOR,
      -1e9,
      centro.z + (z - RAIO_DE_SETORES) * LADO_DO_SETOR,
    ),
    new Vector3(
      centro.x + (x + RAIO_DE_SETORES + 1) * LADO_DO_SETOR,
      1e9,
      centro.z + (z + RAIO_DE_SETORES + 1) * LADO_DO_SETOR,
    ),
  )
}

/** Prepara fora da cena ativa. Nenhuma alteração da publicação anterior acontece aqui. */
export async function prepararCenarioPublicado(
  publicado: Publicado,
  foco: { x: number; z: number },
  sinal: AbortSignal,
  maxTextura: number,
) {
  const perfil = lerPerfilDeCenario(publicado.pacote.cena, publicado.publicacao.perfil),
    regiao = regiaoDoCenario(perfil.ilha.id),
    nestaIlha = (matriz: readonly number[]) => regiao.contem(matriz[12]!, matriz[14]!),
    fisica = prepararFisicaNativa({ fisicas: perfil.fisicas.filter((f) => nestaIlha(f.matriz)) }),
    atores = perfil.atores.filter((a) => nestaIlha(a.matriz)),
    externos = new Set([...fisica.externos, ...atores.map((a) => a.entidade)]),
    vista = await carregarCenaNoThree(publicado.pacote, sinal, {
      ambiente: 'luzes-locais',
      marExterno: true,
      maxTextura,
      animacaoExterna: new Set(atores.map((a) => a.entidade)),
      colisoresExternos: externos,
    })
  let recorte: ReturnType<typeof restringirCenarioARegiao> | undefined,
    descartado = false
  const descartar = () => {
    if (descartado) return
    descartado = true
    recorte?.descartar()
    vista.descartar()
  }
  try {
    sinal.throwIfAborted()
    const personagens = atores.map((a) => {
      const instancias = vista.atores.get(a.entidade),
        t = transformacaoNativa(a.matriz)
      if (instancias?.length !== 1)
        throw Error(`A personagem ${a.entidade} precisa de uma única instância animada.`)
      const ator = instancias[0]!
      for (const nome of ['andar', 'parado'])
        if (!ator.animacoes.some((c) => c.name === nome))
          throw Error(`Falta a animação ${nome} da Íris.`)
      if (Math.abs(t.escala.x - t.escala.y) > 1e-6 || Math.abs(t.escala.x - t.escala.z) > 1e-6)
        throw Error('A Íris precisa de escala uniforme para acompanhar seu colisor nativo.')
      return { id: a.entidade, ator, ...t }
    })
    const prepararColisao = (ponto: { x: number; z: number }) =>
      prepararColisaoDoCenario(vista.colisoes, ponto, (t) =>
        regiao.contem((t.a.x + t.b.x + t.c.x) / 3, (t.a.z + t.b.z + t.c.z) / 3),
      )
    let colisao = prepararColisao(foco)
    recorte = restringirCenarioARegiao(
      { ...vista, nos: vista.dados.nos },
      regiao,
      janelaDoCenario(perfil.ilha.centro, foco),
      new Set(
        vista.dados.arquivos
          .filter((a) => a.papel === 'terreno' || a.papel === 'agua' || a.papel === 'caminho')
          .map((a) => a.caminho),
      ),
    )
    let teto = 100,
      fundo = -100
    for (const n of vista.dados.nos) {
      teto = Math.max(teto, n.volume.max.y + 2)
      fundo = Math.min(fundo, n.volume.min.y - 2)
    }
    const chegada = (ponto?: { x: number; y: number; z: number }) => {
      const candidatos = [
        ...(ponto ? [ponto] : []),
        ...(perfil.inicio ? [perfil.inicio.posicao] : []),
        ...perfil.marcos.filter((m) => m.id === 'lugar:casa').map((m) => m.posicao),
        ...perfil.marcos.map((m) => m.posicao),
      ]
      for (const p of candidatos) {
        if (![p.x, p.y, p.z].every(Number.isFinite) || !regiao.contem(p.x, p.z)) continue
        const suporte = vista.colisoes.rastrear(
          new Vector3(p.x, Math.min(teto, p.y + 2), p.z),
          new Vector3(p.x, fundo, p.z),
        )
        if (
          !suporte ||
          suporte.ponto.y <= 0 ||
          (vista.agua.nivel(p.x, p.z)?.nivel ?? 0) > suporte.ponto.y + CORPO.cintura
        )
          continue
        const pes = suporte.ponto.clone().add(new Vector3(0, CORPO.folga, 0)),
          livre = vista.colisoes.resolver(pes, CORPO.doCentroAoPe * 2, CORPO.raio)
        if (livre.posicao.distanceTo(pes) > 0.02) continue
        return { x: pes.x, y: pes.y + CORPO.doCentroAoPe, z: pes.z }
      }
      throw Error('O cenário publicado precisa de um ponto de chegada seguro nesta ilha.')
    }
    return {
      ...vista,
      perfil,
      regiao,
      fisica,
      personagens,
      get colisao() {
        return colisao
      },
      publicacao: publicado.publicacao,
      chaveDoEnsaio: `arquipelago:publicado:${publicado.publicacao.id}:${publicado.publicacao.versao}`,
      chegada,
      piso(x: number, z: number) {
        return (
          vista.colisoes.rastrear(new Vector3(x, teto, z), new Vector3(x, fundo, z))?.ponto.y ??
          null
        )
      },
      atualizarDetalhe(ponto: { x: number; z: number }) {
        if (descartado) throw Error('O cenário publicado já foi descartado.')
        const nova = prepararColisao(ponto)
        recorte!.atualizar(janelaDoCenario(perfil.ilha.centro, ponto))
        colisao = nova
        return nova
      },
      descartar,
    }
  } catch (erro) {
    descartar()
    throw erro
  }
}
export type CenarioPublicadoPronto = Awaited<ReturnType<typeof prepararCenarioPublicado>>
