// Coloca um post-it da equipe embaixo de cada tela, usando a altura atual de cada quadro.
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { readFileSync, writeFileSync } from 'node:fs'

const caminho = RAIZ + '/project/canvas.json'
const canvas = JSON.parse(readFileSync(caminho, 'utf8'))

const notas = {
  'Tela-Codigo.dc.html':
    'PARA A EQUIPE. Página nova no site de vendas. O checkout é o que já existe (Pix, cartão, boleto, nota no CPF). O que é novo: o código da escola, a lista da turma enviada pela gestão e a ligação do pagamento com a escola, a turma e a criança. Quem já assina entra com a conta e só conecta o filho. A mesma página serve ao código de uma instituição parceira, com cobrança mensal.',
  'Tela-Gestao.dc.html':
    'PARA A EQUIPE. Tela nova, na área das instituições (hoje comunidade adulta). O que é novo: turmas, importação de planilha, situação das vagas, código da escola, cartões dos alunos e relatório da BNCC. Os números de habilidade saem dos registros que a plataforma já grava. Colégio Araucária e as pessoas são exemplos.',
  'Tela-Turma.dc.html':
    'PARA A EQUIPE. Tela nova. O que é novo: tarefa com prazo, situação por aluno e o botão do Zappy, que do 6º ao 9º ano só liga com o professor (regra do CNE de novembro de 2026). "Ver o projeto dela" usa o visualizador de entregas que o Admin já tem. "Já tinha feito em casa" é o reconhecimento do que a criança fez pela família.',
  'Tela-Tarefa.dc.html':
    'PARA A EQUIPE. Tela nova. Os conjuntos são montados pela equipe no Admin, e o professor não monta aula. A nota só existe para o que a plataforma confere sozinha (objetivos do projeto e quiz). O aluno que ainda está no posto anterior recebe a tarefa quando terminar o que falta, porque a tarefa não pula a Jornada.',
  'Tela-Aluno.dc.html':
    'PARA A EQUIPE. É o Início que já existe, com três mudanças: nome e logo da escola no menu, a tarefa da escola no alto e "Mural da escola" no lugar do Mural dos Criadores. Missões e Jornada são as de hoje. No computador da escola não aparecem a área dos pais nem compra, e a palavra Kids não é usada.',
  'Tela-Pais.dc.html':
    'PARA A EQUIPE. É a área dos pais que já existe, com o menu e o Início de hoje. O que é novo: a habilidade da semana com a dica ligada ao curso para pais, os cartões Escola e Quem acompanha, o tempo de uso e com quem os filhos conversam. Os dois últimos são pedidos do ECA Digital.',
  'Tela-Profissional.dc.html':
    'PARA A EQUIPE. Tela nova, na área das instituições. O plano usa o mesmo motor das tarefas da escola, sem nota. As observações ficam só na instituição, e não existe campo de diagnóstico. Espaço Girassol é um nome de exemplo.',
}

for (const [arquivo, texto] of Object.entries(notas)) {
  const quadro = canvas.boards[arquivo]
  if (!quadro) throw new Error(`quadro ausente: ${arquivo}`)
  const id = `n-${arquivo.replace('.dc.html', '').toLowerCase()}`
  canvas.notes[id] = { x: quadro.x, y: quadro.y + quadro.h + 70, w: 760, text: texto, page: quadro.page, size: 'm' }
}
writeFileSync(caminho, `${JSON.stringify(canvas, null, 2)}\n`)
console.log(`post-its: ${Object.keys(notas).length}`)
