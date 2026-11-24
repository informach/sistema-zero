import { expect, test } from 'bun:test'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import { codificarPngDePesos } from '@sistemazero/molda-cenarios-core/v2'
import { Fog, PerspectiveCamera, Vector3 } from 'three'
import { ArquivosDaCompilacao } from '../src/compilar/arquivos'
import { carregarCenaNoThree } from '../src/compilar/runtime-three'
import { gravarDadosDoTerreno } from '../src/compilar/terreno'
import { TerrenoDoPalco } from '../src/Terreno'

/**
 * O carregador de cena com o relevo em campo (plano "Mundos de 2 km", lote 2, 23/11/2026): o pacote
 * leva só as alturas e os pesos (sem lotes de terreno nem colisão do chão); o jogo desenha o
 * relevo em pedaços e colide pelo campo.
 */

async function pacoteComCampo(): Promise<PacoteCompilado> {
  const colunas = 128,
    linhas = 128
  const t = new TerrenoDoPalco(
      {
        tipo: 'terreno',
        cobertura: 'grade',
        origem: { x: -128, z: -128 },
        passo: 2,
        colunas,
        linhas,
        min: -40,
        max: 40,
        fundo: 0,
        pecas: [],
      },
      new Map(),
    ),
    a = new ArquivosDaCompilacao(new AbortController().signal)
  try {
    const campo = t.estado.campo
    for (let z = 0; z <= linhas; z++)
      for (let x = 0; x <= colunas; x++)
        campo.alturas[z * (colunas + 1) + x] = 12 * Math.sin(x / 9) * Math.cos(z / 7)
    const meta = await gravarDadosDoTerreno(t, a, new AbortController().signal)
    // A grade inteira tem chão (a consulta de alturas compilada lê as peças).
    meta.pecas = [0, 1].flatMap((linha) => [0, 1].map((coluna) => ({ coluna, linha })))
    const rgba = new Uint8Array((colunas + 1) * (linhas + 1) * 4)
    for (let i = 0; i < rgba.length; i += 4) rgba.set([200, 55, 0, 0], i)
    const pesos = await a.adicionar(
      'terreno/pesos-a.png',
      await codificarPngDePesos({ largura: colunas + 1, altura: linhas + 1, rgba }),
      { mime: 'image/png', papel: 'pesos', largura: colunas + 1, altura: linhas + 1 },
    )
    meta.relevo = {
      tipo: 'campo',
      pesos: [pesos.caminho],
      camadas: [
        { id: 'grama', cor: '#55aa33', corMedia: '#ffffff' },
        { id: 'terra', cor: '#996633', corMedia: '#ffffff' },
      ],
    }
    const cena = lerCenaCompilada({
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Campo',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { cenario: 'c', revisao: 1, digest: 'a'.repeat(64) },
      arquivos: a.descrever(),
      entidades: [],
      nos: [],
      colisoes: [],
      terreno: meta,
      aguas: [],
      caminhos: [],
      marcadores: [],
      texturas: [],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
      licencas: [],
      ambiente: { hora: 12 },
    })
    return { cena, arquivos: new Map(a.arquivos) }
  } finally {
    a.descartar()
    t.descartar()
  }
}

test('o relevo em campo aparece em pedaços, colide pelas alturas e segue a câmera', async () => {
  const pacote = await pacoteComCampo()
  const h = await carregarCenaNoThree(pacote, new AbortController().signal)
  try {
    const inicial = h.estadoDoRelevo()
    expect(inicial).not.toBeNull()
    expect(inicial!.pedacos).toBeGreaterThan(0)
    expect(inicial!.faltam).toBe(0)
    expect(h.raiz.children.some((c) => c.name === 'relevo')).toBe(true)
    // Sem malha do chão, a colisão é o campo: o apoio cai na altura do relevo.
    let semente = 5
    const sorteio = () => {
      semente = (semente * 1103515245 + 12345) % 2147483648
      return semente / 2147483648
    }
    for (let i = 0; i < 100; i++) {
      const x = -120 + sorteio() * 240,
        z = -120 + sorteio() * 240,
        apoio = h.colisoes.apoio(x, z, 0, 100, -100, -1)
      expect(apoio?.y).toBeCloseTo(h.alturas!(x, z), 4)
    }
    // A câmera longe e alta: o relevo refaz os pedaços em volta dela.
    const camera = new PerspectiveCamera(60, 1, 0.1, 300)
    camera.position.set(110, 30, 110)
    camera.updateMatrixWorld(true)
    h.cena.fog = new Fog('#ffffff', 50, 5000)
    for (let i = 0; i < 40; i++) h.quadro(camera, new Vector3(110, 0, 110))
    const depois = h.estadoDoRelevo()!
    expect(depois.faltam).toBe(0)
    expect(depois.pedacos).toBeGreaterThan(0)
    // A neblina termina antes do fim da vista.
    expect((h.cena.fog as Fog).far).toBeLessThanOrEqual(300 * 0.95 + 1e-9)
  } finally {
    h.descartar()
  }
  expect(h.raiz.children.length).toBe(0)
})

test('o pacote com relevo em campo não leva colisão nem lote de terreno', async () => {
  const p = await pacoteComCampo()
  const comColisao = {
    ...p.cena,
    colisoes: [
      {
        id: 'chao',
        entidade: null,
        arquivo: p.cena.terreno!.alturas,
        tipo: 'terreno' as const,
        matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        volume: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      },
    ],
  }
  expect(() => lerCenaCompilada(comColisao)).toThrow()
})

test('o esquema recusa o relevo em campo mal formado', async () => {
  const p = await pacoteComCampo()
  const base = JSON.parse(JSON.stringify(p.cena))
  expect(() => lerCenaCompilada(base)).not.toThrow()
  const casos: Array<[string, (c: typeof base) => void]> = [
    ['terreno por peças', (c) => (c.terreno.cobertura = 'pecas')],
    [
      'terreno com recortes',
      (c) =>
        (c.terreno.recortes = [
          [
            { x: 0, z: 0 },
            { x: 1, z: 0 },
            { x: 0, z: 1 },
          ],
        ]),
    ],
    [
      'pesos de outro tamanho',
      (c) => {
        const a = c.arquivos.find((x: { papel: string }) => x.papel === 'pesos')
        a.largura = 65
      },
    ],
    [
      'pesos que não pertencem ao relevo',
      (c) => {
        c.terreno.relevo = undefined
      },
    ],
    [
      'textura de camada fora do pacote',
      (c) => {
        c.terreno.relevo.camadas[0].textura = { id: 'nao-existe', repeticaoMetros: 2 }
      },
    ],
    [
      'cinco camadas com um arquivo de pesos só',
      (c) => {
        for (const id of ['a', 'b', 'c'])
          c.terreno.relevo.camadas.push({ id, cor: '#000000', corMedia: '#ffffff' })
      },
    ],
  ]
  for (const [nome, estragar] of casos) {
    const c = JSON.parse(JSON.stringify(base))
    estragar(c)
    expect(() => lerCenaCompilada(c), nome).toThrow()
  }
})
