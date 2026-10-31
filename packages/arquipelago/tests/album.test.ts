import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  criarSalvamentoInicial,
  LUMIS,
  OBJETOS_DA_CASA,
  PERCURSOS,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { type Material, type Mesh, SRGBColorSpace } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { criarLoja } from '../src/estado/loja'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import {
  albumDoSalvamento,
  aparenciasDoAlbum,
  bichosDoAlbum,
  ESPECIES_DE_LUMI,
  faltamNaSecao,
  lumisDoAlbum,
  percursosDoAlbum,
  receitasDoAlbum,
  tituloDaSecao,
} from '../src/sistemas/album'
import { adotar } from '../src/sistemas/bichos'
import { colecaoDeReceitas, colecaoDoBosque } from '../src/sistemas/diario'
import {
  capturarQuadro,
  eTeclaDaFoto,
  hudEscondido,
  nomeDaFoto,
  PAINEL_DA_FOTO,
  podeEntrarNaFoto,
  TEXTOS_DA_FOTO,
} from '../src/sistemas/modo-foto'
import { AMIZADE } from '../src/sistemas/moradores'
import { jogoPausado } from '../src/sistemas/pausa'
import { RECEITAS } from '../src/sistemas/receitas'

/**
 * O álbum de coleções e o modo foto (fase2-09). O álbum só lê o salvamento: cada seção diz quantos
 * ela tem e quantos faltam, e as coleções do diário vêm das mesmas funções do diário.
 */

const inicial = () => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))

describe('as contas de cada seção', () => {
  test('corais musicais não viram achados do mergulho nem produzem contagem negativa', () => {
    for (let corais = 0; corais < 16; corais++)
      for (let achados = 0; achados < 8; achados++) {
        const s = inicial()
        s.recife = {
          corais,
          bau: Boolean(achados & 1),
          pagina: Boolean(achados & 2),
          tesouro: Boolean(achados & 4),
        }
        const r = albumDoSalvamento(s).recife
        const tem = Number(s.recife.bau) + Number(s.recife.pagina) + Number(s.recife.tesouro)
        expect(r.conta).toEqual({ tem, total: 3, faltam: 3 - tem })
        expect(r.itens.filter((i) => i.achado)).toHaveLength(tem)
      }
  })
  test('no começo nada foi achado, e cada seção diz quantos faltam', () => {
    const a = albumDoSalvamento(inicial())
    expect(a.bichos.conta).toEqual({ tem: 0, total: 4, faltam: 4 })
    expect(a.percursos.conta).toEqual({
      tem: 0,
      total: PERCURSOS.length * 3,
      faltam: PERCURSOS.length * 3,
    })
    expect(a.lumis.conta).toEqual({ tem: 0, total: 14, faltam: 14 })
    expect(a.aparencias.conta).toEqual({
      tem: 0,
      total: OBJETOS_DA_CASA.length,
      faltam: OBJETOS_DA_CASA.length,
    })
    expect(a.aparencias.guardadas).toBe(0)
    expect(a.receitas.conta.total).toBe(RECEITAS.length)
    expect(a.receitas.conta.tem + a.receitas.conta.faltam).toBe(RECEITAS.length)
  })

  test('bichos: achados e o adotado contam, os escondidos faltam (a mesma coleção do diário)', () => {
    const s = inicial()
    const achados: Salvamento = { ...s, bichos: { ...s.bichos, achados: ['gato', 'coelho'] } }
    const bichos = adotar(achados.bichos, 'gato', 'Mimi')
    if (!bichos) throw new Error('não adotou')
    const comAdotado = { ...achados, bichos }
    expect(bichosDoAlbum(achados).itens).toEqual(colecaoDoBosque(achados))
    expect(bichosDoAlbum(achados).conta).toEqual({ tem: 2, total: 4, faltam: 2 })
    expect(bichosDoAlbum(comAdotado).conta).toEqual({ tem: 2, total: 4, faltam: 2 })
    expect(bichosDoAlbum(comAdotado).itens.find((b) => b.bicho === 'gato')).toMatchObject({
      estado: 'adotado',
      apelido: 'Mimi',
    })
  })

  test('receitas: as que ela sabe contam, as que o Bento ainda vai lembrar faltam', () => {
    const s = inicial()
    const comBento = (amizade: number): Salvamento => ({
      ...s,
      moradores: { ...s.moradores, bento: { ...s.moradores.bento, amizade } },
    })
    for (const amizade of [
      0,
      AMIZADE.porCoracao,
      3 * AMIZADE.porCoracao,
      10 * AMIZADE.porCoracao,
    ]) {
      const sv = comBento(amizade)
      const r = receitasDoAlbum(sv)
      expect(r.itens).toEqual(colecaoDeReceitas(sv))
      expect(r.conta.tem).toBe(colecaoDeReceitas(sv).filter((x) => x.sabe).length)
      expect(r.conta.faltam).toBe(colecaoDeReceitas(sv).filter((x) => !x.sabe).length)
    }
    expect(receitasDoAlbum(comBento(0)).conta.tem).toBeLessThan(
      receitasDoAlbum(comBento(10 * AMIZADE.porCoracao)).conta.tem,
    )
  })

  test('estrelas: cada estrela ganha conta, de três por percurso, com o melhor tempo', () => {
    const s: Salvamento = {
      ...inicial(),
      percursos: {
        'bosque-copas': [5, 62_300] as [number, number],
      },
    }
    const p = percursosDoAlbum(s)
    expect(p.conta).toEqual({
      tem: 2,
      total: PERCURSOS.length * 3,
      faltam: PERCURSOS.length * 3 - 2,
    })
    expect(p.itens.map((i) => i.id)).toEqual([...PERCURSOS])
    expect(p.itens[0]).toMatchObject({
      nome: 'Percurso nas copas',
      ilha: 'Bosque dos Bichos',
      melhorTempo: '1:02,3',
    })
    expect(p.itens[0]?.estrelas.map((e) => e.ganhou)).toEqual([true, false, true])
    expect(p.itens[1]).toMatchObject({ ilha: 'Vila Doce', melhorTempo: null })
    expect(p.itens[1]?.estrelas.every((e) => !e.ganhou)).toBe(true)
    expect(p.itens[2]).toMatchObject({
      nome: 'Subida ao cume',
      ilha: 'Pico Gelado',
      melhorTempo: null,
    })
  })

  test('aparências: o objeto conta com uma guardada; o resto diz como ganhar ou de onde vem', () => {
    const ganhoEm = '2026-10-29T12:00:00Z'
    const sv: Salvamento = {
      ...inicial(),
      projetos: {
        geladeira: {
          ganhoEm,
          aparencia: { origem: 'galeria', id: 'geladeira-classica' },
          aparencias: [
            { origem: 'pinta', id: 'a1' },
            { origem: 'galeria', id: 'geladeira-classica' },
          ],
        },
        casinha: { ganhoEm, aparencia: null, aparencias: [] },
      },
    }
    const a = aparenciasDoAlbum(sv)
    expect(a.conta).toEqual({
      tem: 1,
      total: OBJETOS_DA_CASA.length,
      faltam: OBJETOS_DA_CASA.length - 1,
    })
    expect(a.guardadas).toBe(2)
    expect(a.itens.map((i) => i.objeto)).toEqual([...OBJETOS_DA_CASA])
    expect(a.itens[0]).toEqual({
      objeto: 'geladeira',
      nome: 'Geladeira',
      estado: 'com-aparencia',
      aparencias: ['Pintada no Pinta', 'Geladeira clássica'],
    })
    expect(a.itens.find((i) => i.objeto === 'casinha')).toMatchObject({ estado: 'sem-aparencia' })
    expect(a.itens.find((i) => i.objeto === 'forno')).toEqual({
      objeto: 'forno',
      nome: 'Forno',
      estado: 'ainda-nao-chegou',
      dica: 'Vem com a primeira receita que o Bento lembra, na Vila Doce.',
    })
  })

  test('Lumis: as 14 espécies, as presas com quantos e as outras como silhueta', () => {
    const s: Salvamento = { ...inicial(), lumis: { pitanga: 3, brigadeiro: 1 } }
    const l = lumisDoAlbum(s)
    expect(l.itens.map((i) => i.id)).toEqual([...LUMIS])
    expect(l.conta).toEqual({ tem: 2, total: 14, faltam: 12 })
    expect(l.itens.find((i) => i.id === 'pitanga')).toEqual({
      id: 'pitanga',
      estado: 'preso',
      nome: 'Pitanga',
      ilha: 'Bosque dos Bichos',
      raro: false,
      cor: '#f2401f',
      quantos: 3,
    })
    const naoAchado = l.itens.find((i) => i.id === 'pluma')
    expect(naoAchado).toEqual({
      id: 'pluma',
      estado: 'nao-encontrado',
      ilha: 'Ilha das Nuvens',
      raro: true,
    })
    // A silhueta não conta o nome da espécie antes de ela achar.
    expect(naoAchado && 'nome' in naoAchado).toBe(false)
  })

  test('duas espécies por ilha, uma comum e uma rara', () => {
    const porIlha = new Map<string, boolean[]>()
    for (const id of LUMIS) {
      const e = ESPECIES_DE_LUMI[id]
      porIlha.set(e.ilha, [...(porIlha.get(e.ilha) ?? []), e.raro])
    }
    expect(porIlha.size).toBe(7)
    for (const raros of porIlha.values()) expect(raros.sort()).toEqual([false, true])
  })

  test('a cor de cada espécie é a do material `corpo` do modelo', async () => {
    for (const id of LUMIS) {
      const buf = readFileSync(join(import.meta.dir, '..', 'src', 'assets', 'lumis', `${id}.glb`))
      const gltf = await new GLTFLoader().parseAsync(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        '',
      )
      let cor: string | null = null
      gltf.scene.traverse((o) => {
        const mats = ([] as Material[]).concat((o as Mesh).material ?? [])
        for (const m of mats)
          if (m.name === 'corpo' && 'color' in m)
            cor = `#${(m as unknown as { color: { getHexString(c: string): string } }).color.getHexString(SRGBColorSpace)}`
      })
      expect(cor === null ? null : perto(cor, ESPECIES_DE_LUMI[id].cor)).toBe(true)
    }
  })

  test('título e "faltam" de cada seção', () => {
    expect(tituloDaSecao('Receitas', { tem: 2, total: 6, faltam: 4 })).toBe('Receitas: 2 de 6')
    expect(faltamNaSecao({ tem: 2, total: 6, faltam: 4 })).toBe('Faltam 4.')
    expect(faltamNaSecao({ tem: 5, total: 6, faltam: 1 })).toBe('Falta 1.')
    expect(faltamNaSecao({ tem: 6, total: 6, faltam: 0 })).toBe('Completa.')
  })
})

/**
 * Duas cores iguais a até 8 em cada canal: o GLB guarda a cor em linear com 8 bits e, nos canais
 * escuros, a volta para sRGB anda até uns 6 (o vermelho da Pitanga, #f2401f, volta #f23e19).
 */
function perto(a: string, b: string): boolean {
  const canais = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [canais(a), canais(b)]
  return x.every((v, i) => Math.abs(v - (y[i] ?? -99)) <= 8)
}

describe('o modo foto', () => {
  function montar() {
    return criarLoja({
      salvamento: inicial(),
      jornada: 2,
      quarto: QUARTO_DE_EXEMPLO,
      avatar: { modelo: null } as never,
      acesso: {
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
        contabilizaTempo: false,
      },
      aoMudar: () => {},
    })
  }

  test('entrar esconde o HUD e para o personagem; sair restaura os dois', () => {
    const loja = montar()
    expect(hudEscondido(loja.getState())).toBe(false)
    expect(podeEntrarNaFoto(loja.getState())).toBe(true)
    loja.getState().abrirPainel(PAINEL_DA_FOTO)
    expect(hudEscondido(loja.getState())).toBe(true)
    // O painel aberto é a mesma pausa do diário: o personagem fica parado, a câmera não.
    expect(jogoPausado(loja.getState())).toBe(true)
    loja.getState().abrirPainel(null)
    expect(hudEscondido(loja.getState())).toBe(false)
    expect(jogoPausado(loja.getState())).toBe(false)
  })

  test('não entra com o menu, outro painel ou o resultado na tela', () => {
    const loja = montar()
    loja.getState().abrirMenu(true)
    expect(podeEntrarNaFoto(loja.getState())).toBe(false)
    loja.getState().abrirMenu(false)
    loja.getState().abrirPainel('diario')
    expect(podeEntrarNaFoto(loja.getState())).toBe(false)
    expect(hudEscondido(loja.getState())).toBe(false)
  })

  test('a tecla F, sem modificador e fora de campo de texto', () => {
    expect(eTeclaDaFoto({ code: 'KeyF' })).toBe(true)
    expect(eTeclaDaFoto({ code: 'KeyF', ctrlKey: true })).toBe(false)
    expect(eTeclaDaFoto({ code: 'KeyF', metaKey: true })).toBe(false)
    expect(eTeclaDaFoto({ code: 'KeyF', repeat: true })).toBe(false)
    expect(eTeclaDaFoto({ code: 'KeyF', dentroDeCampo: true })).toBe(false)
    expect(eTeclaDaFoto({ code: 'KeyE' })).toBe(false)
  })

  test('a captura desenha e lê o canvas na mesma chamada, sem esperar outro quadro', async () => {
    const passos: string[] = []
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
    const gl = {
      render: (cena: string, camera: string) => passos.push(`render ${cena} ${camera}`),
      domElement: {
        toBlob: (pronto: (b: Blob | null) => void, tipo?: string) => {
          passos.push(`toBlob ${tipo}`)
          queueMicrotask(() => pronto(png))
        },
      },
    }
    const promessa = capturarQuadro(gl, 'cena', 'camera')
    // As duas coisas já aconteceram antes de a promessa resolver.
    expect(passos).toEqual(['render cena camera', 'toBlob image/png'])
    expect(await promessa).toBe(png)
  })

  test('o jogo não liga preserveDrawingBuffer', () => {
    const cena = readFileSync(join(import.meta.dir, '..', 'src', 'mundo', 'cena.tsx'), 'utf8')
    expect(cena).not.toContain('preserveDrawingBuffer')
  })

  test('o nome do arquivo tem a data e a hora do aparelho', () => {
    expect(nomeDaFoto(new Date(2026, 9, 29, 9, 5))).toBe('arquipelago-2026-10-29-09h05.png')
  })
})

test('os textos do álbum e do modo foto não usam travessão nem exclamação', () => {
  const s: Salvamento = { ...inicial(), lumis: { pitanga: 1 } }
  const a = albumDoSalvamento(s)
  const textos = [
    ...Object.values(TEXTOS_DA_FOTO).filter((t) => typeof t === 'string'),
    ...Object.values(TEXTOS_DA_FOTO.envio),
    ...a.percursos.itens.flatMap((p) => [p.nome, ...p.estrelas.map((e) => e.texto)]),
    ...a.aparencias.itens.map((o) => ('dica' in o ? o.dica : o.aparencias.join(', '))),
    ...Object.values(ESPECIES_DE_LUMI).map((e) => e.nome),
  ]
  for (const t of textos) {
    expect(t).not.toContain('—')
    expect(t).not.toContain('!')
  }
})

describe('os peixes do Recife no álbum (§6.28, A40)', () => {
  test('um peixe por coral replantado, os mesmos do aquário', async () => {
    const { peixesDoRecifeDoAlbum } = await import('../src/sistemas/album')
    const { criarSalvamentoInicial: criar } = await import('@sistemazero/arquipelago-contracts')
    const s = criar(new Date('2026-10-31T12:00:00Z'))
    expect(peixesDoRecifeDoAlbum(s).conta).toEqual({ tem: 0, total: 4, faltam: 4 })
    const comDois = { ...s, recife: { ...s.recife, corais: 0b0101 } }
    const r = peixesDoRecifeDoAlbum(comDois)
    expect(r.conta).toEqual({ tem: 2, total: 4, faltam: 2 })
    expect(r.itens.map((p) => p.encontrado)).toEqual([true, false, true, false])
    expect(r.itens[1]?.dica).toBe('Replante o coral cérebro na lagoa do Recife.')
  })
})
