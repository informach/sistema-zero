import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ILHAS } from '@sistemazero/arquipelago-contracts'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ESTILOS_ADULTOS, pisoDaLetra } from '../src/adulto/estilos-adultos'
import { VOZ_ADULTA } from '../src/adulto/voz-adulta'
import { ESTILOS } from '../src/interface/estilos'
import { TelaBloqueado, TelaCarregando, TelaDescanso, TelaErro } from '../src/interface/telas'
import { VOZ_KIDS, VozContexto, type VozDoJogo } from '../src/interface/voz'
import { NOMES_DOS_POSTOS } from '../src/sistemas/luneta'

const nada = () => {}
const telas = (envolver: (filho: ReactNode) => ReactNode = (f) => f) => {
  const html = (no: ReactNode) => renderToStaticMarkup(envolver(no))
  return {
    carregando: html(<TelaCarregando />),
    desligado: html(<TelaBloqueado motivo="desligado" aoVoltar={nada} />),
    fora: html(<TelaBloqueado motivo="fora-da-lista" aoVoltar={nada} />),
    publico: html(<TelaBloqueado motivo="publico-desligado" aoVoltar={nada} />),
    descanso: html(<TelaDescanso aoVoltar={nada} />),
    erro: html(<TelaErro aoTentar={nada} aoVoltar={nada} />),
  }
}
const sha = (html: string) => new Bun.CryptoHasher('sha256').update(html).digest('hex')

/** Todo texto de uma voz, com as funções chamadas para cada ilha. */
function textos(voz: VozDoJogo): string[] {
  const saida: string[] = []
  const andar = (v: unknown) => {
    if (typeof v === 'string') saida.push(v)
    else if (typeof v === 'function') for (const ilha of ILHAS) saida.push(v(ilha))
    else if (v && typeof v === 'object') for (const x of Object.values(v)) andar(x)
  }
  andar(voz)
  return saida
}

/** A forma da voz: as chaves, sem os valores. */
function forma(v: unknown): unknown {
  if (typeof v === 'function') return 'função'
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forma(x)]))
  return typeof v
}

describe('a pele do Kids não mudou (fase3-13)', () => {
  test('as telas do jogo saem byte a byte iguais, com ou sem a voz do Kids no provedor', () => {
    // Os hashes do HTML de antes da pele adulta. Mudou uma tela do Kids de propósito? Atualize.
    const antes = {
      carregando: '73e371e512f6196928fb5b4b8d8fd36fb7f8330fee111342e7915515a2e5a565',
      desligado: '9b37dea9d9d0788fc3c6aad6399915e4b117b68ddc0b14b352b6168d23a8c02d',
      fora: '8e3e637ad765b5721522578c75701727be54a135c993f7f59b705c335753880c',
      publico: '9f4cf7b84cc9b9feb75e8c18678c944bdbf40cb04479cd6d3e67213fb77c2ba1',
      descanso: '88c5bec79d545f709e23f8554e6d6522242cb4b458dd0b69751f21bfe80ddf3f',
      erro: '1fa9271d99d09d6e21c6098a5b312e1f5ccbc3aa0f1c6e4bd138467e7e8008b0',
    }
    const comProvedor = telas((f) => (
      <VozContexto.Provider value={VOZ_KIDS}>{f}</VozContexto.Provider>
    ))
    for (const [nome, html] of Object.entries(telas())) {
      expect(sha(html), nome).toBe(antes[nome as keyof typeof antes])
      expect(comProvedor[nome as keyof typeof comProvedor]).toBe(html)
    }
  })

  test('a fala da luneta do Kids é a de sempre', () => {
    for (const ilha of ILHAS)
      if (ilha.id !== 'farol')
        expect(VOZ_KIDS.falaDaLuneta(ilha)).toContain(NOMES_DOS_POSTOS[ilha.posto])
  })
})

describe('a voz adulta', () => {
  test('tem a mesma forma da voz do Kids', () => {
    expect(forma(VOZ_ADULTA)).toEqual(forma(VOZ_KIDS))
  })

  test('as telas falam com a pessoa adulta', () => {
    const adulto = telas((f) => <VozContexto.Provider value={VOZ_ADULTA}>{f}</VozContexto.Provider>)
    expect(adulto.carregando).toContain('Trazendo a sua casa e o seu avatar.')
    expect(adulto.carregando).not.toContain('Zappy')
    expect(adulto.publico).toContain('comunidade adulta')
    expect(adulto.erro).toContain('Voltar para a comunidade')
    expect(adulto.erro).not.toContain('plataforma')
  })

  test('a jornada é a etapa na mesma posição em que o posto abre a ilha', () => {
    const vila = ILHAS.find((i) => i.id === 'vila-doce')!
    expect(VOZ_ADULTA.falaDaLuneta(vila)).toBe(
      'Lá é a Vila Doce. A ponte abre quando você chegar à etapa 3 da sua jornada.',
    )
    expect(VOZ_ADULTA.moldaFechado).toBe('Abre na etapa 4 da sua jornada')
  })

  test('as duas vozes seguem a régua da casa; a adulta, também a do community', () => {
    for (const t of [...textos(VOZ_KIDS), ...textos(VOZ_ADULTA)]) {
      expect(t).not.toMatch(/[!—]/)
      expect(t.split(/[.\n]/)[0]).not.toContain('?')
    }
    const postosDoKids = Object.values(NOMES_DOS_POSTOS).filter((n) => n !== 'Lenda')
    for (const t of textos(VOZ_ADULTA)) {
      expect(t).not.toMatch(
        /\bIA\b|intelig[eê]ncia artificial|criança|\bpais\b|irmã|posto|plataforma/i,
      )
      for (const nome of postosDoKids) expect(t).not.toContain(nome)
    }
  })
})

/** As partes de uma lista de seletores, sem quebrar as vírgulas de dentro de `:is()`. */
function seletoresDe(lista: string): string[] {
  const partes = ['']
  let fundo = 0
  for (const ch of lista) {
    if (ch === '(') fundo++
    if (ch === ')') fundo--
    if (ch === ',' && fundo === 0) partes.push('')
    else partes[partes.length - 1] += ch
  }
  return partes
}

describe('o pedaço adulto', () => {
  test('todo o CSS adulto vale só dentro de .arq-adulto', () => {
    const regras = ESTILOS_ADULTOS.replace(/@media[^{]*\{/g, '').split('}')
    for (const regra of regras) {
      const seletor = regra.split('{')[0]?.trim()
      if (!seletor) continue
      for (const parte of seletoresDe(seletor))
        expect(parte.trim(), seletor).toStartWith('.arq-adulto')
    }
  })

  test('nenhum texto do Kids fica abaixo de 15 px no adulto: o piso sai do próprio ESTILOS', () => {
    const piso = pisoDaLetra(ESTILOS)
    expect(ESTILOS_ADULTOS).toContain(piso)
    // Pega a régua: uma regra de 13 px vira piso, uma de 16 px não.
    expect(
      pisoDaLetra('.arq-a{font-size:13px}.arq-b{font:800 14px system-ui}.arq-c{font-size:16px}'),
    ).toBe('.arq-adulto .arq-a{font-size:15px}\n.arq-adulto .arq-b{font-size:15px}')
    expect(pisoDaLetra('@media(max-width:560px){.arq-a,.arq-b :is(i,b){font-size:11px}}')).toBe(
      '.arq-adulto .arq-a,.arq-adulto .arq-b :is(i,b){font-size:15px}',
    )
    expect(piso.split('\n').length).toBeGreaterThan(20)
  })

  test('só o jogo.tsx chega ao adulto, e por import() (o Kids nunca baixa o pedaço)', () => {
    const src = resolve(import.meta.dir, '../src')
    const quem: string[] = []
    for (const arquivo of new Bun.Glob('**/*.{ts,tsx}').scanSync(src)) {
      const caminho = arquivo.replaceAll('\\', '/')
      if (caminho.startsWith('adulto/')) continue
      const fonte = readFileSync(resolve(src, caminho), 'utf8')
      if (/from\s+['"][^'"]*\/adulto\//.test(fonte)) quem.push(`${caminho} (estático)`)
      if (/import\(\s*['"][^'"]*\/adulto\//.test(fonte)) quem.push(caminho)
    }
    expect(quem).toEqual(['jogo.tsx'])
    expect(readFileSync(resolve(src, 'jogo.tsx'), 'utf8')).toContain(
      "import('./adulto/pele-adulta')",
    )
  })
})
