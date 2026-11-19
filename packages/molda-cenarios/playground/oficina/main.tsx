import type { EntradaDeImportacao } from '@sistemazero/molda-cenarios-motor'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  type CenariosHost,
  CenariosOficina,
  criarHostEmMemoria,
  type ModeloDeBiblioteca,
  type RotaDosCenarios,
} from '../../src/oficina'
import { comandosParaPor } from '../../src/oficina/acoes'
import { prepararArquivos } from '../../src/oficina/importar'
import './styles.css'

/**
 * Playground da oficina de cenários. Parâmetros do endereço:
 *   ?vazio=1        começa sem nada (sem a demonstração)
 *   ?tela=oficina   abre direto no cenário da demonstração (também `mundo` e `bibliotecas`)
 *   ?tema=dark      tema escuro
 */
const parametros = new URLSearchParams(location.search)
const tema = parametros.get('tema') === 'dark' ? 'dark' : 'light'

// O que entra em cada biblioteca da demonstração, pelos começos dos nomes do acervo local.
const DEMONSTRACAO: { nome: string; comecos: string[] }[] = [
  {
    nome: 'Aventura',
    comecos: [
      'arvore_0',
      'arbusto_0',
      'rocha_',
      'pedra_',
      'cogumelo',
      'flor_',
      'cerca_',
      'ponte_',
      'barril',
      'caixote',
      'banco_',
      'moinho',
      'casa_',
      'poco',
      'fogueira',
      'placa_',
    ],
  },
  {
    nome: 'Cidade',
    comecos: ['apto_', 'arranha_ceu_', 'ambulancia', 'poste_', 'semaforo', 'onibus'],
  },
]

async function trazerDoAcervo(
  host: CenariosHost,
  bibliotecaId: string,
  comecos: readonly string[],
  lista: readonly string[],
): Promise<ModeloDeBiblioteca[]> {
  const escolhidos: string[] = []
  for (const comeco of comecos)
    escolhidos.push(...lista.filter((arquivo) => arquivo.startsWith(comeco)).slice(0, 3))
  const arquivos: EntradaDeImportacao[] = []
  for (const nome of new Set(escolhidos)) {
    const resposta = await fetch(`/acervo/${nome}`)
    if (!resposta.ok) continue
    // "arvore_01_pacote.aaddbd6a2032.glb" vira "arvore_01.glb" para o nome do modelo.
    const limpo = nome.replace(/\.[0-9a-f]{12}\.glb$/, '.glb').replace(/_pacote\.glb$/, '.glb')
    // Variantes podem ter o mesmo nome de apresentação. A origem preserva o hash,
    // sem provocar colisão de caminhos ao tirar o sufixo para a gaveta.
    arquivos.push({
      caminho: `${nome.slice(0, -4)}/${limpo}`,
      arquivo: new File([await resposta.arrayBuffer()], limpo),
    })
  }
  const { prontos } = await prepararArquivos(arquivos)
  return host.importarModelos(bibliotecaId, prontos)
}

/** Espalha objetos de um jeito que parece um lugar, sempre igual (semente fixa). */
function sorteio(semente: number) {
  let estado = semente
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
}

async function montarDemonstracao(host: CenariosHost): Promise<RotaDosCenarios | null> {
  const lista: string[] = await fetch('/acervo/lista.json').then(
    (resposta) => (resposta.ok ? resposta.json() : []),
    () => [],
  )
  const mundo = await host.criarMundo('conta', 'Ilha do Farol')
  const cenario = await host.criarCenario(mundo.id, 'Vila da praia')
  await host.criarCenario(mundo.id, 'Bosque')
  await host.criarMundo('conta', 'Corrida na cidade')
  if (!lista.length) return { tela: 'mundo', mundoId: mundo.id }

  const bibliotecas: string[] = []
  let aventura: ModeloDeBiblioteca[] = []
  for (const [indice, definicao] of DEMONSTRACAO.entries()) {
    const biblioteca = await host.criarBiblioteca('conta', {
      nome: definicao.nome,
      licenca: 'restrita',
    })
    const modelos = await trazerDoAcervo(host, biblioteca.id, definicao.comecos, lista)
    if (indice === 0) aventura = modelos
    bibliotecas.push(biblioteca.id)
  }
  await host.editarMundo(mundo.id, { bibliotecas })

  // Um cenário de exemplo: árvores e pedras em volta, casas no meio.
  const aberto = await host.abrirCenario(cenario.id)
  let documento = aberto.documento
  let revisao = aberto.revisao
  const acaso = sorteio(7)
  let n = 0
  const por = async (modelo: ModeloDeBiblioteca, x: number, z: number, giro: number) => {
    const { comandos } = comandosParaPor(documento, modelo, { x, z }, () => `demo-${++n}`)
    const instancia = comandos.at(-1)
    if (instancia?.tipo === 'instancia.criar') instancia.instancia.transformacao.rotacao.y = giro
    await host.editarCenario(cenario.id, revisao, comandos, `demo-op-${n}`)
    const novo = await host.abrirCenario(cenario.id)
    documento = novo.documento
    revisao = novo.revisao
  }
  const tipo = (trecho: string) => aventura.filter((m) => m.nome.toLowerCase().startsWith(trecho))
  const natureza = [...tipo('arvore'), ...tipo('arbusto'), ...tipo('flor'), ...tipo('cogumelo')]
  for (let i = 0; i < 26 && natureza.length; i++) {
    const angulo = acaso() * Math.PI * 2,
      raio = 11 + acaso() * 16
    await por(
      natureza[Math.floor(acaso() * natureza.length)]!,
      Math.round(Math.cos(angulo) * raio * 2) / 2,
      Math.round(Math.sin(angulo) * raio * 2) / 2,
      acaso() * Math.PI * 2,
    )
  }
  const centro = [...tipo('casa'), ...tipo('moinho'), ...tipo('poco'), ...tipo('banco')]
  for (const [i, modelo] of centro.slice(0, 6).entries()) {
    const angulo = (i / 6) * Math.PI * 2
    await por(modelo, Math.round(Math.cos(angulo) * 6), Math.round(Math.sin(angulo) * 6), -angulo)
  }
  return { tela: 'oficina', mundoId: mundo.id, cenarioId: cenario.id }
}

const host = criarHostEmMemoria({ equipe: true })
const raiz = createRoot(document.getElementById('root')!)

async function abrir() {
  let rota: RotaDosCenarios = { tela: 'inicio', aba: 'mundos' }
  if (!parametros.has('vazio')) {
    raiz.render(<p style={{ padding: 24, fontWeight: 700 }}>Montando a demonstração…</p>)
    const daDemonstracao = await montarDemonstracao(host)
    const tela = parametros.get('tela')
    if (tela === 'oficina' && daDemonstracao?.tela === 'oficina') rota = daDemonstracao
    else if (tela === 'mundo' && daDemonstracao && 'mundoId' in daDemonstracao)
      rota = { tela: 'mundo', mundoId: daDemonstracao.mundoId }
    else if (tela === 'bibliotecas') rota = { tela: 'inicio', aba: 'bibliotecas' }
  }
  Object.assign(globalThis, { __cenarios: { host } })
  raiz.render(
    <StrictMode>
      <CenariosOficina host={host} tema={tema} rotaInicial={rota} />
    </StrictMode>,
  )
}

void abrir()
