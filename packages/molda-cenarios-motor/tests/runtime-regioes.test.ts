import { afterEach, expect, test } from 'bun:test'
import {
  calcularPertencaDasRegioes,
  lerCenaCompilada,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import type { RegiaoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Matrix4, PerspectiveCamera, Scene, Vector3 } from 'three'
import { ArquivosDaCompilacao } from '../src/compilar/arquivos'
import { criarInstaladorDeCenasThree } from '../src/compilar/instalar-three'
import { type CenaNoThree, carregarCenaNoThree } from '../src/compilar/runtime-three'
import { exemplo, glb } from './fixtures/glb-compilacao'

/**
 * A carga por regiões (lote 6 da conclusão, 22/11/2026). Seis regiões de 100 m em grade 3×2:
 *
 *   z 100–200:  D (0–100)  E (100–200)  F (200–300)
 *   z   0–100:  A          B            C
 *
 * vizinhas pelo lado (A–B, B–C, D–E, E–F, A–D, B–E, C–F). Cada região tem um chão (nó e colisão)
 * num arquivo próprio; um poste fora de todas é de todas. O início fica no meio de A.
 */
const LETRAS = ['a', 'b', 'c', 'd', 'e', 'f'] as const
const VIZINHAS: Record<string, string[]> = {
  a: ['b', 'd'],
  b: ['a', 'c', 'e'],
  c: ['b', 'f'],
  d: ['a', 'e'],
  e: ['b', 'd', 'f'],
  f: ['c', 'e'],
}
const centro = (letra: string) => {
  const i = LETRAS.indexOf(letra as (typeof LETRAS)[number])
  return { x: (i % 3) * 100 + 50, z: Math.floor(i / 3) * 100 + 50 }
}

/** `extrasEmE`: cópias do chão de E na mesma região (para pesar nas malhas do orçamento). */
// O pacote do teste é mutável: as provas de falha tiram e repõem um arquivo de propósito.
async function pacote(
  extrasEmE = 0,
): Promise<PacoteCompilado & { arquivos: Map<string, Uint8Array> }> {
  const a = new ArquivosDaCompilacao(new AbortController().signal)
  const nos = [],
    colisoes = []
  for (const [i, letra] of [...LETRAS, 'poste'].entries()) {
    const { j, bin } = exemplo()
    // Um triângulo de chão de 40 m, diferente em cada arquivo (digests distintos).
    const posicoes = new Float32Array([-20, 0, -20, 0, 0, 20 + i * 0.01, 20, 0, -20])
    bin.set(new Uint8Array(posicoes.buffer))
    j.accessors[0]!.min = [-20, 0, -20]
    j.accessors[0]!.max = [20, 0, 20 + i * 0.01]
    j.nodes = [{ mesh: 0 }]
    j.scenes = [{ nodes: [0] }]
    const bytes = glb(j, bin),
      caminho = `modelos/${letra}.glb`
    await a.adicionar(caminho, bytes, {
      mime: 'model/gltf-binary',
      papel: 'modelo',
      malhas: 1,
      triangulos: 1,
      verticesMaximos: 3,
    })
    const onde = letra === 'poste' ? { x: -80, z: -80 } : centro(letra),
      matriz = new Matrix4().makeTranslation(onde.x, 0, onde.z).elements,
      volume = {
        min: { x: onde.x - 20, y: 0, z: onde.z - 20 },
        max: { x: onde.x + 20, y: 0, z: onde.z + 20 + i * 0.01 },
      }
    nos.push({ id: `no-${letra}`, entidade: null, arquivo: caminho, matriz, volume })
    if (letra === 'e')
      for (let k = 0; k < extrasEmE; k++)
        nos.push({ id: `no-e-${k}`, entidade: null, arquivo: caminho, matriz, volume })
    if (letra !== 'poste') {
      const colisao = `colisoes/${letra}.glb`
      await a.adicionar(colisao, bytes, {
        mime: 'model/gltf-binary',
        papel: 'colisao',
        malhas: 1,
        triangulos: 1,
        verticesMaximos: 3,
      })
      colisoes.push({
        id: `chao-${letra}`,
        entidade: null,
        arquivo: colisao,
        tipo: 'malha' as const,
        matriz,
        volume,
      })
    }
  }
  const regioes: RegiaoDeCenario[] = LETRAS.map((letra) => {
    const c = centro(letra)
    return {
      id: letra,
      nome: letra.toUpperCase(),
      caixa: { x0: c.x - 50, z0: c.z - 50, x1: c.x + 50, z1: c.z + 50 },
      vizinhas: VIZINHAS[letra]!,
    }
  })
  const base = {
    formato: 'molda-cena-compilada' as const,
    versao: 1 as const,
    nome: 'Grade',
    unidade: 'metro' as const,
    eixoVertical: 'y' as const,
    fonte: { cenario: 'c', revisao: 1, digest: 'a'.repeat(64) },
    arquivos: a.descrever(),
    entidades: [],
    nos,
    colisoes,
    aguas: [],
    caminhos: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    marcadores: [
      {
        id: 'inicio',
        nome: 'Início',
        posicao: { x: 50, y: 0, z: 50 },
        giro: 0,
        objeto: null,
        configuracao: { tipo: 'inicio' as const, principal: true },
      },
    ],
    ambiente: { hora: 12 },
  }
  const cena = lerCenaCompilada({
    ...base,
    entidades: [{ id: 'inicio', nome: 'Início', tipo: 'marcador', grupo: null }],
    regioes: calcularPertencaDasRegioes(regioes, { ...base, entidades: [] }),
  })
  return { cena, arquivos: new Map(a.arquivos) }
}

const abertas: CenaNoThree[] = []
afterEach(() => {
  for (const c of abertas.splice(0)) c.descartar()
})

async function abrir(
  opcoes: Parameters<typeof carregarCenaNoThree>[2] = { carga: 'regioes' },
  extrasEmE = 0,
) {
  const p = await pacote(extrasEmE),
    cena = await carregarCenaNoThree(p, new AbortController().signal, {
      ambiente: 'luzes-locais',
      ...opcoes,
    })
  abertas.push(cena)
  return { p, cena }
}

const camera = new PerspectiveCamera()
/** Um quadro com o foco no ponto (a câmera 10 m atrás) e o tempo andando. */
async function andar(cena: CenaNoThree, x: number, z: number, segundos = 0.1) {
  cena.atualizar(Math.min(segundos, 1))
  camera.position.set(x, 5, z - 10)
  camera.updateMatrixWorld(true)
  cena.quadro(camera, new Vector3(x, 0, z))
  // A carga cede entre os arquivos: espera a fila esvaziar.
  for (let i = 0; i < 50 && cena.estadoDasRegioes()?.carregando.length; i++)
    await new Promise((resolve) => setTimeout(resolve, 5))
  await new Promise((resolve) => setTimeout(resolve, 20))
}
const nos = (cena: CenaNoThree) => [...cena.instancias.keys()].sort()
const ondeHaChao = (cena: CenaNoThree, letra: string) => {
  const c = centro(letra)
  return cena.colisoes.rastrear(new Vector3(c.x, 5, c.z), new Vector3(c.x, -5, c.z)) !== null
}

test('sem pedir regiões, a cena carrega inteira, como antes', async () => {
  const { cena } = await abrir({})
  expect(nos(cena)).toHaveLength(7)
  expect(cena.estadoDasRegioes()).toBeNull()
})

test('a janela inicial é a região do início, as vizinhas e o que é de todas', async () => {
  const { cena } = await abrir()
  expect(nos(cena)).toEqual(['no-a', 'no-b', 'no-d', 'no-poste'])
  expect(cena.estadoDasRegioes()).toMatchObject({ atual: 'a', falhas: [], aviso: null })
  expect([...cena.estadoDasRegioes()!.carregadas].sort()).toEqual(['a', 'b', 'd'])
  expect(ondeHaChao(cena, 'a')).toBe(true)
  expect(ondeHaChao(cena, 'c')).toBe(false)
  // A âncora mantém a caixa da cena inteira na raiz (o Mundo 3D mede por ela).
  expect(cena.raiz.getObjectByName('regioes:caixa-da-cena')?.visible).toBe(false)
})

test('andando até C, C e as vizinhas entram; A e D saem depois de 2 s longe', async () => {
  const { cena } = await abrir()
  await andar(cena, 250, 50)
  expect(nos(cena)).toEqual(['no-a', 'no-b', 'no-c', 'no-d', 'no-f', 'no-poste'])
  expect(ondeHaChao(cena, 'c')).toBe(true)
  for (let s = 0; s < 3; s++) await andar(cena, 250, 50, 1)
  expect(nos(cena)).toEqual(['no-b', 'no-c', 'no-f', 'no-poste'])
  expect(ondeHaChao(cena, 'a')).toBe(false)
  expect(cena.estadoDasRegioes()?.atual).toBe('c')
})

test('fora de toda região a atual é nenhuma e a carga fica na última', async () => {
  const { cena } = await abrir()
  await andar(cena, 250, 50)
  await andar(cena, 250, -30)
  expect(cena.estadoDasRegioes()?.atual).toBeNull()
  expect(cena.estadoDasRegioes()?.carregadas).toContain('c')
})

test('a região que falha mantém as de antes, avisa uma vez e tenta de novo', async () => {
  const { p, cena } = await abrir()
  const bytes = p.arquivos.get('modelos/c.glb')!
  p.arquivos.delete('modelos/c.glb')
  await andar(cena, 250, 50)
  const estado = cena.estadoDasRegioes()!
  expect(estado.falhas).toContain('c')
  expect(estado.aviso).toMatch(/Não consegui carregar uma parte do cenário/)
  expect(nos(cena)).not.toContain('no-c')
  // O arquivo volta, mas a região espera a vez dela (1 s) antes de tentar de novo.
  p.arquivos.set('modelos/c.glb', bytes)
  await andar(cena, 250, 50, 0.1)
  expect(nos(cena)).not.toContain('no-c')
  await andar(cena, 250, 50, 1)
  await andar(cena, 250, 50, 0.5)
  expect(nos(cena)).toContain('no-c')
  expect(cena.estadoDasRegioes()?.falhas).toEqual([])
})

test('descartar no meio da carga não deixa nada para trás', async () => {
  const { cena } = await abrir()
  cena.atualizar(0.1)
  camera.position.set(250, 5, 40)
  camera.updateMatrixWorld(true)
  cena.quadro(camera, new Vector3(250, 0, 50))
  cena.descartar()
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(cena.instancias.size).toBe(0)
  expect(cena.raiz.children).toHaveLength(0)
})

test('dez idas e voltas entre A e C terminam com as mesmas contagens', async () => {
  const { cena } = await abrir()
  const contagens: string[] = []
  for (let volta = 0; volta < 10; volta++) {
    for (const letra of ['c', 'a']) {
      const c = centro(letra)
      for (let s = 0; s < 3; s++) await andar(cena, c.x, c.z, 1)
    }
    contagens.push(
      JSON.stringify([
        cena.instancias.size,
        cena.raiz.children.length,
        cena.colisoes.arvores,
        cena.estadoDasRegioes()!.arquivos,
      ]),
    )
  }
  expect(new Set(contagens.slice(-4)).size).toBe(1)
  expect(nos(cena)).toEqual(['no-a', 'no-b', 'no-d', 'no-poste'])
  // Os modelos de A, B, D e do poste e as colisões de A, B e D: nada a mais na memória.
  expect(cena.estadoDasRegioes()!.arquivos).toBe(7)
})

test('a região de um alvo pelo nome, com a tolerância de quem estava lá', async () => {
  const { cena } = await abrir()
  expect(cena.regiao({ x: 50, z: 50 })).toBe('A')
  expect(cena.regiao({ position: { x: 100.3, z: 50 } })).toBe('B')
  expect(cena.regiao({ mesh: { position: { x: 100.3, z: 50 } } }, 'A')).toBe('A')
  expect(cena.regiao({ x: 50, z: -30 }, 'A')).toBeNull()
  expect(cena.regiao(null)).toBeNull()
  // A carga inteira de uma cena com regiões também responde: a régua é do documento.
  const inteira = await abrir({})
  expect(inteira.cena.regiao({ x: 250, z: 50 })).toBe('C')
})

test('o nome de região que a cena não tem é avisado uma vez', async () => {
  const { cena } = await abrir()
  const avisos: string[] = []
  const warn = console.warn
  console.warn = (msg: string) => avisos.push(msg)
  try {
    for (let i = 0; i < 3; i++) cena.regiao({ x: 50, z: 50 }, null, 'Vila')
    cena.regiao({ x: 50, z: 50 }, null, 'A')
  } finally {
    console.warn = warn
  }
  expect(avisos).toEqual([
    'O cenário não tem a região "Vila". Desenhe as regiões no Molda Cenários, na aba Jogo.',
  ])
})

test('instalada na cena do jogo, a consulta de colisões acompanha a troca de região', async () => {
  const p = await pacote(),
    instalador = criarInstaladorDeCenasThree(
      async (_id, sinal, opcoes) => carregarCenaNoThree(p, sinal, opcoes),
      () => ({}),
    )
  try {
    const cena = await instalador.instalar('grade', new Scene(), new AbortController().signal, {
      ambiente: 'luzes-locais',
      carga: 'regioes',
    })
    expect(ondeHaChao(cena, 'c')).toBe(false)
    await andar(cena, 250, 50)
    // Sem copiar o getter, o objeto instalado ficava com o mundo da janela inicial.
    expect(ondeHaChao(cena, 'c')).toBe(true)
  } finally {
    instalador.descartar()
  }
})

test('uma vizinha quebrada não segura a região boa que entrou junto (revisão do lote 6)', async () => {
  const { p, cena } = await abrir()
  p.arquivos.delete('modelos/c.glb')
  // Em B, C e E entram juntas como vizinhas: C quebrada, E boa.
  await andar(cena, 150, 50)
  for (let i = 0; i < 4; i++) await andar(cena, 150, 50, 1)
  const estado = cena.estadoDasRegioes()!
  expect(estado.falhas).toEqual(['c'])
  expect(nos(cena)).toContain('no-e')
  expect(ondeHaChao(cena, 'e')).toBe(true)
})

test('a região perto só entra se o conjunto couber nas malhas de uma janela (revisão do lote 6)', async () => {
  // No canto de A, perto de E (14 m): A, B e D são obrigatórias; E entra pela pré-carga.
  const leve = await abrir()
  await andar(leve.cena, 90, 90)
  expect(nos(leve.cena)).toContain('no-e')
  // Com E pesando 47 malhas, o conjunto passaria das 48: E espera até ser obrigatória.
  const pesada = await abrir({ carga: 'regioes' }, 46)
  await andar(pesada.cena, 90, 90)
  expect(nos(pesada.cena)).not.toContain('no-e')
  await andar(pesada.cena, 150, 150)
  expect(nos(pesada.cena)).toContain('no-e')
})

test('um foco inválido não derruba a carga: ela fica como estava (revisão do lote 6)', async () => {
  const { cena } = await abrir()
  const antes = nos(cena)
  cena.atualizar(0.1)
  expect(() => cena.quadro(camera, new Vector3(Number.NaN, 0, 50))).not.toThrow()
  expect(nos(cena)).toEqual(antes)
})

/** Quadros seguidos SEM esperar a carga: cada um deixa um pedido guardado com a região do foco. */
async function quadrosSeguidos(cena: CenaNoThree, x: number, z: number, vezes: number) {
  for (let i = 0; i < vezes; i++) {
    cena.atualizar(0.01)
    camera.position.set(x, 5, z - 10)
    camera.updateMatrixWorld(true)
    cena.quadro(camera, new Vector3(x, 0, z))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  for (let i = 0; i < 50 && cena.estadoDasRegioes()?.carregando.length; i++)
    await new Promise((resolve) => setTimeout(resolve, 5))
  await new Promise((resolve) => setTimeout(resolve, 20))
}

/** Conta as leituras de um arquivo do pacote (o arquivo que falta conta também). */
function contarLeituras(p: Awaited<ReturnType<typeof pacote>>, arquivo: string) {
  const ler = p.arquivos.get.bind(p.arquivos)
  const contagem = { vezes: 0 }
  p.arquivos.get = (chave: string) => {
    if (chave === arquivo) contagem.vezes++
    return ler(chave)
  }
  return contagem
}

// Guarda (full review final): o revisor apontou a nova tentativa imediata com quadros durante a
// carga; aqui ela não muda o que carrega nem quantas leituras há (a tentativa a mais ocupa o lugar
// da tentativa isolada de cada região). O caso prende esse comportamento.
test('a falha durante a carga espera a vez dela, mesmo com quadros pedindo de novo no meio (full review final)', async () => {
  // Em B, C (quebrada) e E (boa) entram juntas. Quadros seguidos durante a carga guardam um pedido
  // feito antes de a falha de C existir: ele não pode levar C de novo antes da vez dela (1 s), nem
  // cortar a tentativa de E.
  const { p, cena } = await abrir()
  p.arquivos.delete('modelos/c.glb')
  const leituras = contarLeituras(p, 'modelos/c.glb')
  await quadrosSeguidos(cena, centro('b').x, centro('b').z, 6)
  expect(cena.estadoDasRegioes()?.falhas).toEqual(['c'])
  expect(cena.estadoDasRegioes()?.carregadas).toContain('e')
  // Mais quadros antes de 1 s: C não é lida de novo.
  const depoisDaRodada = leituras.vezes
  await quadrosSeguidos(cena, centro('b').x, centro('b').z, 6)
  expect(leituras.vezes).toBe(depoisDaRodada)
})

test('o aviso de falha vai ao console uma vez e sai quando a região carrega (full review final)', async () => {
  const { p, cena } = await abrir()
  const bytes = p.arquivos.get('modelos/c.glb')!
  p.arquivos.delete('modelos/c.glb')
  const avisos: string[] = []
  const warn = console.warn
  console.warn = (msg: string) => avisos.push(msg)
  try {
    await andar(cena, 250, 50)
    await andar(cena, 250, 50, 1)
    await andar(cena, 250, 50, 1)
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatch(/Não consegui carregar uma parte do cenário/)
    p.arquivos.set('modelos/c.glb', bytes)
    // Depois de duas falhas a próxima tentativa é em 4 s (a régua de 1, 4 e 15 s).
    for (let i = 0; i < 20 && !nos(cena).includes('no-c'); i++) await andar(cena, 250, 50, 1)
    expect(nos(cena)).toContain('no-c')
    expect(cena.estadoDasRegioes()).toMatchObject({ falhas: [], aviso: null })
    expect(avisos).toHaveLength(1)
  } finally {
    console.warn = warn
  }
})
