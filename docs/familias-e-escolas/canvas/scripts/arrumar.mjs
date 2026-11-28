// Organiza a página "3 · Telas" em fileiras por fluxo, com título por fileira e post-it da equipe embaixo de cada tela.
// Só mexe em quadros e notas da página "telas". Telas ainda não escritas são ignoradas.
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const projeto = RAIZ + '/project'
const caminho = join(projeto, 'canvas.json')
const canvas = JSON.parse(readFileSync(caminho, 'utf8'))
const postits = JSON.parse(readFileSync(new URL('./postits-telas.json', import.meta.url), 'utf8'))

const fileiras = [
  {
    id: 'a',
    titulo: 'A · A escola entra: da adesão à primeira aula',
    telas: [
      ['Tela-Admin.dc.html', 'A1 · Equipe · Nova instituição'],
      ['Tela-Passos.dc.html', 'A2 · Gestão · Primeiros passos'],
      ['Tela-Importar.dc.html', 'A3 · Gestão · Importar turma'],
      ['Tela-Aparelhos.dc.html', 'A4 · Gestão · Computadores da escola'],
      ['Tela-Bilhetes.dc.html', 'A5 · Gestão · Crachás e bilhetes'],
      ['Tela-Gestao.dc.html', 'A6 · Gestão · Início'],
      ['Tela-Cobranca.dc.html', 'A7 · Equipe · Vagas e cobrança'],
      ['Tela-Pessoas.dc.html', 'A8 · Gestão · Pessoas'],
      ['Tela-Bncc.dc.html', 'A9 · Gestão · Relatório da BNCC'],
      ['Tela-RegraIA.dc.html', 'A10 · Gestão · Conversa com o Zappy'],
    ],
  },
  {
    id: 'b',
    titulo: 'B · A família entra: do bilhete à área dos pais',
    telas: [
      ['Tela-Codigo.dc.html', 'B1 · Família · O bilhete da escola'],
      ['Tela-JaAssina.dc.html', 'B2 · Família que já é cliente · O bilhete da escola'],
      ['Tela-Inscricao.dc.html', 'B3 · Família · Inscrição no contraturno'],
      ['Tela-Pronto.dc.html', 'B4 · Família · Primeiro acesso concluído'],
      ['Tela-Pais.dc.html', 'B5 · Pais · Início'],
      ['Tela-Filho.dc.html', 'B6 · Pais · Página do filho'],
      ['Tela-EscolaVe.dc.html', 'B7 · Pais · O que a escola vê'],
      ['Tela-Conta.dc.html', 'B8 · Pais · Conta: acessos e pagamentos'],
      ['Tela-Planos.dc.html', 'B9 · Pais · Planos'],
      ['Tela-ClinicaVe.dc.html', 'B10 · Pais · O que a clínica vê'],
      ['Tela-RecadosPais.dc.html', 'B11 · Pais · Recados'],
      ['Tela-Limites.dc.html', 'B12 · Pais · Limites do filho'],
    ],
  },
  {
    id: 'c',
    titulo: 'C · O aluno: do crachá ao mural da escola',
    telas: [
      ['Tela-Entrada.dc.html', 'C1 · Aluno · Entrar na escola'],
      ['Tela-Aluno.dc.html', 'C2 · Aluno · Início'],
      ['Tela-TarefaAluno.dc.html', 'C3 · Aluno · A tarefa'],
      ['Tela-Mural.dc.html', 'C4 · Aluno · Mural da escola'],
      ['Tela-Casa.dc.html', 'C5 · Aluno · Início em casa'],
      ['Tela-RecadosAluno.dc.html', 'C6 · Aluno · Recados'],
      ['Tela-Ranking.dc.html', 'C7 · Aluno · Ranking da escola'],
    ],
  },
  {
    id: 'd',
    titulo: 'D · O professor: da formação ao resultado da tarefa',
    telas: [
      ['Tela-Formacao.dc.html', 'D1 · Professor · Minha formação'],
      ['Tela-Turma.dc.html', 'D2 · Professor · A turma'],
      ['Tela-Tarefa.dc.html', 'D3 · Professor · Nova tarefa'],
      ['Tela-Resultado.dc.html', 'D4 · Professor · Resultado da tarefa'],
      ['Tela-RecadosProf.dc.html', 'D5 · Professor · Recados'],
      ['Tela-EscolherArea.dc.html', 'D6 · Entrar · Escolher a área'],
    ],
  },
  {
    id: 'e',
    titulo: 'E · A instituição parceira: do código da família ao plano',
    telas: [
      ['Tela-CodigoInst.dc.html', 'E1 · Família · O código da instituição parceira'],
      ['Tela-Coordenacao.dc.html', 'E2 · Coordenação · Início'],
      ['Tela-Plano.dc.html', 'E3 · Profissional · Combinar o plano'],
      ['Tela-Profissional.dc.html', 'E4 · Profissional · Crianças que atende'],
      ['Tela-ClinicaAluno.dc.html', 'E5 · Criança · No aparelho da clínica'],
      ['Tela-VagasInst.dc.html', 'E6 · Coordenação · Vagas e famílias'],
    ],
  },
]

// Remove notas antigas da página de telas (títulos e post-its) para recriar.
for (const [id, nota] of Object.entries(canvas.notes)) {
  if (nota.page === 'telas' && (nota.kind === 'title1' || !nota.kind)) delete canvas.notes[id]
}

const PASSO = 1520
const ESPACO_POSTIT = 460
const ESPACO_TITULO = 340
let y = 0
const ordemTelas = []
canvas.notes['t-telas'] = { x: 0, y: -620, text: '3 · Telas: o roteiro completo, em cinco fluxos', kind: 'title1', maxW: 18160, page: 'telas' }
for (const fileira of fileiras) {
  const presentes = fileira.telas.filter(([arquivo]) => existsSync(join(projeto, arquivo)))
  if (!presentes.length) continue
  canvas.notes[`t-telas-${fileira.id}`] = { x: 0, y: y - 300, text: fileira.titulo, kind: 'title1', maxW: presentes.length * PASSO - 80, page: 'telas' }
  let maior = 0
  presentes.forEach(([arquivo, titulo], i) => {
    const antigo = canvas.boards[arquivo] ?? { w: 1440, h: 1200, expand: 'fill' }
    canvas.boards[arquivo] = { ...antigo, x: i * PASSO, y, w: 1440, title: titulo, page: 'telas', expand: 'fill' }
    maior = Math.max(maior, canvas.boards[arquivo].h)
    ordemTelas.push(arquivo)
    const texto = postits[arquivo]
    if (texto) {
      const id = `n-${arquivo.replace('.dc.html', '').toLowerCase()}`
      canvas.notes[id] = { x: i * PASSO, y: y + canvas.boards[arquivo].h + 70, w: 760, text: `PARA A EQUIPE. ${texto}`, page: 'telas', size: 'm' }
    }
  })
  y += maior + ESPACO_POSTIT + ESPACO_TITULO
}

// Ordem: tudo que não é tela mantém a posição relativa; as telas entram no lugar em que estavam, na ordem do roteiro.
const semTelas = canvas.order.filter((n) => !n.startsWith('Tela-'))
const corte = semTelas.indexOf('Plataforma.dc.html')
canvas.order = [...semTelas.slice(0, corte), ...ordemTelas, ...semTelas.slice(corte)]
writeFileSync(caminho, `${JSON.stringify(canvas, null, 2)}\n`)
console.log(`telas no roteiro: ${ordemTelas.length}`)
