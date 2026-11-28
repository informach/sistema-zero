// Versão 2.7: as oito telas que faltavam.
// A8 Pessoas, A9 Relatório da BNCC, A10 Conversa com o Zappy (gestão), B11 Recados e B12 Limites (pais),
// C6 Recados (aluno), D5 Recados (professor), D6 Escolher a área (quem é professor e pai).
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const projeto = RAIZ + '/project'
const LOGO_ESCURO = '/_blob/b071f94b0478ee7c6b96469a94dbe0b1'
const LOGO_CLARO = '/_blob/b4694f24ec9b20134b6821b124a4aa40'
const F_KIDS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap'
const F_INST = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700&family=Bricolage+Grotesque:wght@600;700;800&display=swap'
const BALOO = "font-family: 'Baloo 2', system-ui, sans-serif"
const BRICO = "font-family: 'Bricolage Grotesque', system-ui, sans-serif"

function arquivo(nome, titulo, fontes, fundo, corpo) {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${titulo}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="${fontes}">
<style>
body{margin:0;background:${fundo}}
*{box-sizing:border-box}
a{color:#1343b8}a:hover{color:#0a2a7a}
</style>
</helmet>
${corpo}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1440,"height":1200}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`
  writeFileSync(join(projeto, nome), html)
  console.log(`escrita: ${nome}`)
}

// ---------- Área das instituições ----------
const CARTAO_I = 'background: #ffffff; border: 1px solid #d6deea; border-radius: 20px; box-shadow: 0 4px 0 #d6deea'
const BOTAO_I = 'min-height: 50px; padding: 0 22px; border: 0; border-radius: 12px; background: #ffc02e; color: #0b0e1a; font-family: inherit; font-size: 17px; font-weight: 700; box-shadow: 0 4px 0 #c98a00'
const BOTAO_I2 = 'min-height: 50px; padding: 0 22px; border: 1.5px solid #74829f; border-radius: 12px; background: #ffffff; color: #0f1a33; font-family: inherit; font-size: 17px; font-weight: 700'
const H1_I = `margin: 0; ${BRICO}; font-weight: 700; font-size: 40px; line-height: 1.1`
const H2_I = `margin: 0; ${BRICO}; font-weight: 700; font-size: 26px; line-height: 1.2`
const H3_I = `margin: 0; ${BRICO}; font-weight: 700; font-size: 22px; line-height: 1.2`
const CAMPO_I = 'height: 50px; border: 1.5px solid #74829f; border-radius: 12px; padding: 0 14px; font-family: inherit; font-size: 17px; color: #0f1a33; background: #ffffff'
const selo = (texto, fundo, cor) => `<span style="background: ${fundo}; color: ${cor}; border-radius: 999px; padding: 4px 12px; font-weight: 700; font-size: 15px">${texto}</span>`
const VERDE = ['#dcf0e4', '#096b4a']
const AZUL = ['#e2ebff', '#1343b8']
const AMARELO = ['#fff3c4', '#5c4000']
const CINZA = ['#eff3f9', '#46536e']
const NAV_GESTAO = [['Início', 'inicio'], ['Turmas', 'turmas'], ['Pessoas', 'pessoas'], ['Tarefas', 'tarefas'], ['Relatórios', 'relatorios'], ['Formação', 'formacao']]
const NAV_PROFESSOR = [['Início', 'inicio'], ['Minhas turmas', 'turmas'], ['Tarefas', 'tarefas'], ['Recados', 'recados'], ['Minha formação', 'formacao']]

function instituicao({ nav, ativo, pessoa, papel, main }) {
  const itens = nav
    .map(([rotulo, id]) =>
      id === ativo
        ? `<a href="#${id}" style="color: #0b0e1a; background: #ffc02e; text-decoration: none; font-weight: 700; padding: 10px 16px; border-radius: 10px">${rotulo}</a>`
        : `<a href="#${id}" style="color: #f2f4fa; text-decoration: none; font-weight: 600; padding: 10px 16px; border-radius: 10px">${rotulo}</a>`,
    )
    .join('\n')
  return `<div style="font-family: 'Atkinson Hyperlegible Next', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #f5f7fb">

<header style="background: #0b0e1a; color: #f2f4fa">
<div style="max-width: 1360px; margin: 0 auto; padding: 14px 40px; display: flex; align-items: center; gap: 28px; flex-wrap: wrap">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 170px; height: auto">
<div style="display: flex; align-items: center; gap: 10px; background: #1a2040; border: 1px solid #2c3563; border-radius: 12px; padding: 6px 14px 6px 6px">
<div style="width: 36px; height: 36px; border-radius: 9px; background: #0b7a54; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BRICO}; font-weight: 800; font-size: 16px">CA</div>
<strong>Colégio Araucária</strong>
</div>
<nav style="display: flex; gap: 6px; flex-wrap: wrap; flex: 1 1 420px">
${itens}
</nav>
<div style="display: flex; align-items: center; gap: 10px">
<div style="width: 40px; height: 40px; border-radius: 50%; background: #6e9bff; color: #0b0e1a; display: flex; align-items: center; justify-content: center; font-weight: 700">${pessoa[0]}</div>
<div style="display: flex; flex-direction: column; line-height: 1.2"><strong>${pessoa}</strong><span style="color: #c9d1e6; font-size: 14px">${papel}</span></div>
</div>
</div>
</header>

<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-direction: column; gap: 28px">
${main}
</main>
</div>`
}
const linhaGrade = (grade, cols, ultima) =>
  `<div style="display: grid; grid-template-columns: ${grade}; gap: 12px; padding: 14px 0; ${ultima ? '' : 'border-bottom: 1px solid #d6deea; '}align-items: center">\n${cols.map((c, i) => (i === 0 ? `<strong>${c}</strong>` : `<span>${c}</span>`)).join('')}\n</div>`
const cabecaGrade = (grade, cols) =>
  `<div style="display: grid; grid-template-columns: ${grade}; gap: 12px; padding: 10px 0; color: #46536e; font-size: 15px; font-weight: 700; border-bottom: 1px solid #d6deea">\n${cols.map((c) => `<div>${c}</div>`).join('')}\n</div>`
const numero = (valor, rotulo) => `<div style="${CARTAO_I}; padding: 24px; display: flex; flex-direction: column; gap: 4px">
<span style="${BRICO}; font-weight: 800; font-size: 40px; line-height: 1.1">${valor}</span>
<span style="color: #46536e">${rotulo}</span>
</div>`
const acao = (texto) => `<a href="#acao" style="font-weight: 700">${texto}</a>`

// =====================================================================================
// A8 · Gestão · Pessoas
// =====================================================================================
const GP = '1.1fr 1.6fr 1fr 0.9fr'
const GA = '1fr 1.7fr 0.8fr 1.3fr'
arquivo(
  'Tela-Pessoas.dc.html',
  'Gestão: pessoas',
  F_INST,
  '#f5f7fb',
  instituicao({
    nav: NAV_GESTAO,
    ativo: 'pessoas',
    pessoa: 'Marta',
    papel: 'Gestora',
    main: `
<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="${H1_I}">Pessoas</h1>
<span style="color: #46536e">Professores, alunos e famílias do Colégio Araucária.</span>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
<button type="button" style="${BOTAO_I2}">Cadastrar um aluno</button>
<button type="button" style="${BOTAO_I}">Convidar professor</button>
</div>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_I}">Professores</h2>
<div style="overflow-x: auto"><div style="min-width: 640px">
${cabecaGrade(GP, ['Professor', 'Turmas', 'Formação de mediador', 'Situação'])}
${linhaGrade(GP, ['Renata', '6º ano A e 6º ano B', selo('Concluída', ...VERDE), 'Ativa'])}
${linhaGrade(GP, ['Caio', '7º ano A e 7º ano B', selo('Concluída', ...VERDE), 'Ativo'])}
${linhaGrade(GP, ['Lúcia', 'Criação de Jogos, no contraturno', selo('Concluída', ...VERDE), 'Ativa'], true)}
</div></div>
<span style="color: #46536e; font-size: 15px">O professor só recebe as turmas depois de concluir a formação de mediador. Quem já tem conta no Sistema Zero aceita o convite com a conta que tem.</span>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="${H2_I}">Alunos e famílias</h2>
<label style="display: flex; align-items: center; gap: 10px; font-weight: 700">Turma<select style="${CAMPO_I}; height: 44px"><option>6º ano B</option></select></label>
</div>
<span><strong>21 de 28 famílias</strong> já fizeram o primeiro acesso.</span>
<div style="overflow-x: auto"><div style="min-width: 680px">
${cabecaGrade(GA, ['Aluno', 'Primeiro acesso da família', 'Crachá', ''])}
${linhaGrade(GA, ['Theo M.', 'Feito por Marina, em 12 de fevereiro', '7K3Q-M2', acao('Mover de turma')])}
${linhaGrade(GA, ['Sofia S.', 'Feito, em 14 de fevereiro', '4T8W-N6', acao('Mover de turma')])}
${linhaGrade(GA, ['Bento A.', selo('Ainda não fez', ...AMARELO), '9P2H-R5', acao('Emitir outro bilhete')])}
${linhaGrade(GA, ['Pedro R.', selo('Sem e-mail do responsável', ...CINZA), '3M7K-X4', acao('Informar o e-mail')])}
${linhaGrade(GA, ['Alice P.', 'Feito, em 13 de fevereiro', '6C4D-V8', acao('Gerar outro crachá')], true)}
</div></div>
<a href="#todos" style="font-weight: 700">Ver os 28</a>
</section>

</div>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">Plano de cortesia</h2>
<span style="color: #c9d1e6">Com 22 famílias pagantes no contraturno, a escola tem 1 plano de cortesia. Escolha o aluno que vai receber.</span>
<select style="${CAMPO_I}; width: 100%"><option>Escolher o aluno</option></select>
<button type="button" style="align-self: flex-start; ${BOTAO_I}">Indicar o bolsista</button>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">E-mail errado no cadastro?</h2>
<span>Corrija o e-mail do responsável e emita outro bilhete. O bilhete antigo para de valer na hora. Se o aluno já usou a plataforma e o e-mail certo é de uma família que já tem conta, ela escolhe qual perfil segue.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Quando um aluno sai da escola</h2>
<span>Ao tirar o aluno da turma, o acesso pago pela escola segue por 30 dias, e a família é avisada. O que ele criou continua com ele. No contraturno, tirar o aluno da turma encerra a inscrição dele.</span>
</section>
</aside>

</div>`,
  }),
)

// =====================================================================================
// A9 · Gestão · Relatório da BNCC
// =====================================================================================
const GB = '0.7fr 2fr 0.9fr 1.2fr 0.7fr'
const GL = '1.2fr 1fr 1fr'
arquivo(
  'Tela-Bncc.dc.html',
  'Gestão: relatório da BNCC',
  F_INST,
  '#f5f7fb',
  instituicao({
    nav: NAV_GESTAO,
    ativo: 'relatorios',
    pessoa: 'Marta',
    papel: 'Gestora',
    main: `
<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px; flex: 1 1 520px">
<a href="#relatorios" style="font-weight: 700">Relatórios</a>
<h1 style="${H1_I}">Relatório da BNCC Computação</h1>
<span style="color: #46536e">O que a turma trabalhou, com os códigos do ano escolar. Sai dos registros das aulas e das tarefas, sem ninguém preencher nada.</span>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
<button type="button" style="${BOTAO_I2}">Baixar a planilha</button>
<button type="button" style="${BOTAO_I}">Baixar em PDF</button>
</div>
</div>

<div style="display: flex; gap: 16px; flex-wrap: wrap">
<label style="display: flex; flex-direction: column; gap: 6px; font-weight: 700">Turma<select style="${CAMPO_I}; min-width: 220px"><option>6º ano B</option></select></label>
<label style="display: flex; flex-direction: column; gap: 6px; font-weight: 700">Período<select style="${CAMPO_I}; min-width: 260px"><option>De 3 a 11 de setembro de 2029</option></select></label>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 20px">
${numero('28', 'alunos na turma')}
${numero('25', 'com registro nas aulas da tarefa')}
${numero('2', 'códigos da BNCC trabalhados')}
${numero('1', 'tarefa em andamento')}
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_I}">O que foi trabalhado</h2>
<div style="overflow-x: auto"><div style="min-width: 800px">
${cabecaGrade(GB, ['Código', 'O que a BNCC pede', 'Habilidade do Mapa', 'Onde foi trabalhada', 'Com registro'])}
${linhaGrade(GB, ['EF06CO02', 'Elaborar algoritmos que envolvam instruções sequenciais, de repetição e de seleção usando uma linguagem de programação.', 'Pensar em passos', 'Nave Contra Asteroides, aulas 1 a 3', '25 de 28'])}
${linhaGrade(GB, ['EF06CO03', 'Descrever com precisão a solução de um problema, construindo o programa que implementa a solução descrita.', 'Testar e corrigir', 'Nave Contra Asteroides, aulas 2 e 3', '22 de 28'], true)}
</div></div>
<span style="color: #46536e; font-size: 15px">Os textos são os do documento oficial da BNCC Computação. O arquivo baixado traz também a lista das aulas. Planejar e persistir aparecem ligados às competências gerais da BNCC.</span>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="${H2_I}">Aluno por aluno</h2>
<a href="#todos" style="font-weight: 700">Ver os 28</a>
</div>
<div style="overflow-x: auto"><div style="min-width: 620px">
${cabecaGrade(GL, ['Aluno', 'EF06CO02', 'EF06CO03'])}
${linhaGrade(GL, ['Rafael L.', selo('Com registro', ...VERDE), selo('Com registro', ...VERDE)])}
${linhaGrade(GL, ['Theo M.', selo('Com registro', ...VERDE), selo('Com registro', ...VERDE)])}
${linhaGrade(GL, ['Sofia S.', selo('Com registro', ...VERDE), selo('Ainda não', ...CINZA)])}
${linhaGrade(GL, ['Pedro R.', selo('Ainda não', ...CINZA), selo('Ainda não', ...CINZA)], true)}
</div></div>
</section>

</div>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">O que este relatório é</h2>
<span style="color: #c9d1e6">Um registro do que foi trabalhado e de quem participou. Ele mostra o que o aluno fez, e não mede o quanto ele sabe. Não é nota.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Para quem serve</h2>
<span>Para a coordenação pedagógica mostrar que a escola cumpre o ensino de computação, e para o conselho de classe ver a participação de cada turma.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">O ano inteiro</h2>
<span>Troque o período para ver o bimestre ou o ano letivo. O relatório do ano junta todas as turmas num arquivo só.</span>
<a href="#ano" style="font-weight: 700">Ver o ano letivo de 2029</a>
</section>
</aside>

</div>`,
  }),
)

// =====================================================================================
// A10 · Gestão · Conversa com o Zappy
// =====================================================================================
const segmento = (cor, titulo, alunos, regra, corpo) => `<section style="background: ${cor}; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<span style="font-size: 15px; font-weight: 700; color: #46536e">${alunos}</span>
<h2 style="${H2_I}">${titulo}</h2>
<strong style="font-size: 19px">${regra}</strong>
${corpo}
</section>`
const opcao = (texto, marcada) =>
  `<label style="display: flex; align-items: center; gap: 12px; background: #ffffff; border: ${marcada ? '2px solid #1b5cf3' : '1.5px solid #d6deea'}; border-radius: 14px; padding: 12px 16px; font-weight: 700; min-height: 50px"><input type="radio" name="medio"${marcada ? ' checked' : ''} style="width: 20px; height: 20px">${texto}</label>`

arquivo(
  'Tela-RegraIA.dc.html',
  'Gestão: conversa com o Zappy',
  F_INST,
  '#f5f7fb',
  instituicao({
    nav: NAV_GESTAO,
    ativo: 'turmas',
    pessoa: 'Marta',
    papel: 'Gestora',
    main: `
<div style="display: flex; flex-direction: column; gap: 4px; max-width: 900px">
<a href="#turmas" style="font-weight: 700">Turmas</a>
<h1 style="${H1_I}">Conversa com o Zappy</h1>
<span style="color: #46536e">A regra segue a resolução do Conselho Nacional de Educação sobre inteligência artificial. Ela vale para o aluno em qualquer aparelho, inclusive em casa.</span>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 24px">
${segmento('#e2ebff', 'Até o 5º ano', '22 alunos, no contraturno', 'Desligada', '<span>É a regra, e não há escolha. O aluno não conversa com a inteligência artificial, nem com supervisão.</span>')}
${segmento('#dcf0e4', 'Do 6º ao 9º ano', '118 alunos, na grade', 'Só quando o professor liga na aula', '<span>É a regra, e não há escolha. A conversa desliga sozinha no fim do horário da aula.</span>')}
${segmento(
  '#fff3c4',
  'Ensino médio',
  'Nenhuma turma ainda',
  'A escola decide',
  `<div style="display: flex; flex-direction: column; gap: 10px">
${opcao('Desligada', false)}
${opcao('Só quando o professor liga na aula', true)}
${opcao('Ligada, com as conversas registradas', false)}
</div>
<span style="color: #5c4000; font-size: 15px">A escolha fica guardada para quando a escola tiver turmas do ensino médio no Sistema Zero.</span>`,
)}
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 24px">
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">O que continua igual</h2>
<span>As falas do Zappy dentro das aulas são conteúdo pronto, e não conversa. Elas aparecem para todos os alunos.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Vale também para</h2>
<span>O Pensa e a descrição do jogo feita por inteligência artificial seguem a mesma regra da conversa.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Quem pode mudar</h2>
<span>Só a gestão, e só no ensino médio. Toda mudança fica registrada, com a data e o nome de quem fez.</span>
</section>
</div>`,
  }),
)

// =====================================================================================
// D5 · Professor · Recados
// =====================================================================================
const conversa = (nome, trecho, quando, novo, aberta) => `<a href="#conversa" style="text-decoration: none; color: #0f1a33; background: ${aberta ? '#eff3f9' : '#ffffff'}; border: ${aberta ? '2px solid #1b5cf3' : '1px solid #d6deea'}; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 4px">
<div style="display: flex; justify-content: space-between; gap: 10px; align-items: center"><strong>${nome}</strong>${novo ? selo('Novo', ...AMARELO) : `<span style="color: #46536e; font-size: 15px">${quando}</span>`}</div>
<span style="color: #46536e">${trecho}</span>
</a>`
const fala = (quem, quando, texto, minha) => `<div style="align-self: ${minha ? 'flex-end' : 'flex-start'}; max-width: 82%; background: ${minha ? '#e2ebff' : '#eff3f9'}; border-radius: 16px; padding: 12px 16px; display: flex; flex-direction: column; gap: 2px">
<span style="font-size: 14px; font-weight: 700; color: #46536e">${quem} · ${quando}</span>
<span>${texto}</span>
</div>`

arquivo(
  'Tela-RecadosProf.dc.html',
  'Professor: recados',
  F_INST,
  '#f5f7fb',
  instituicao({
    nav: NAV_PROFESSOR,
    ativo: 'recados',
    pessoa: 'Renata',
    papel: 'Professora',
    main: `
<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="${H1_I}">Recados</h1>
<span style="color: #46536e">Uma caixa para cada turma e uma para a equipe do Sistema Zero. Com alunos, você fala só com os das suas turmas.</span>
</div>
<button type="button" style="${BOTAO_I}">Recado para a turma</button>
</div>

<div style="display: flex; gap: 10px; flex-wrap: wrap">
<a href="#6b" style="background: #121733; color: #ffffff; text-decoration: none; font-weight: 700; padding: 8px 18px; border-radius: 999px">6º ano B · 1 novo</a>
<a href="#6a" style="background: #ffffff; border: 1px solid #d6deea; color: #0f1a33; text-decoration: none; font-weight: 600; padding: 8px 18px; border-radius: 999px">6º ano A</a>
<a href="#equipe" style="background: #ffffff; border: 1px solid #d6deea; color: #0f1a33; text-decoration: none; font-weight: 600; padding: 8px 18px; border-radius: 999px">Equipe do Sistema Zero</a>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 1 1 360px; min-width: 0; display: flex; flex-direction: column; gap: 12px">
${conversa('Sofia S.', 'Prof, o meu tiro fica parado lá em cima e não some.', '', true, true)}
${conversa('Theo M.', 'Você: Que bom que você voltou e tentou de novo.', 'Hoje', false, false)}
${conversa('Pedro R.', 'Você: Pedro, a tarefa vai até sexta. Precisa de ajuda para começar?', 'Ontem', false, false)}
${conversa('Para a turma toda', 'Você: Lembrem do prazo: sexta, 14 de setembro.', 'Segunda', false, false)}
</div>

<section style="flex: 999 1 560px; min-width: 0; ${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column"><h2 style="${H2_I}">Sofia S.</h2><span style="color: #46536e">6º ano B · parada na aula 2 de Nave Contra Asteroides</span></div>
<a href="#projeto" style="font-weight: 700">Abrir o projeto dela</a>
</div>
<div style="display: flex; flex-direction: column; gap: 10px">
${fala('Sofia', 'terça, 4 de setembro', 'Prof, o meu tiro fica parado lá em cima e não some.', false)}
</div>
<div style="display: flex; flex-direction: column; gap: 10px">
<label for="resposta" style="font-weight: 700">Sua resposta</label>
<textarea id="resposta" rows="3" style="border: 1.5px solid #74829f; border-radius: 12px; padding: 12px 14px; font-family: inherit; font-size: 17px; color: #0f1a33; width: 100%; resize: vertical">Sofia, olhe o que acontece com o tiro depois que ele passa do alto da tela. O que você quer que aconteça ali?</textarea>
<button type="button" style="align-self: flex-start; ${BOTAO_I}">Enviar</button>
</div>
<span style="color: #46536e; font-size: 15px">Os recados ficam registrados. A família da Sofia lê esta conversa na área dos pais, e a gestão da escola pode abrir, com o registro de quem abriu e quando.</span>
</section>

</div>`,
  }),
)

// =====================================================================================
// D6 · Quem é professor e pai · Escolher a área
// =====================================================================================
arquivo(
  'Tela-EscolherArea.dc.html',
  'Entrar: escolher a área',
  F_INST,
  '#f5f7fb',
  `<div style="font-family: 'Atkinson Hyperlegible Next', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #f5f7fb; min-height: 760px; display: flex; flex-direction: column">

<header style="background: #ffffff; border-bottom: 1px solid #d6deea">
<div style="max-width: 1100px; margin: 0 auto; padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap">
<img src="${LOGO_CLARO}" alt="Sistema Zero" style="width: 200px; height: auto">
<a href="#ajuda" style="font-weight: 700">Preciso de ajuda para entrar</a>
</div>
</header>

<main style="max-width: 1100px; width: 100%; margin: 0 auto; padding: 56px 40px 72px; display: flex; flex-direction: column; gap: 32px">

<div style="display: flex; flex-direction: column; gap: 8px">
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 44px; line-height: 1.1">Onde você quer entrar?</h1>
<span style="font-size: 19px; color: #46536e">Quem é professor e também é pai usa a mesma conta nas duas áreas. Uma não mostra o que é da outra.</span>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 24px">
<a href="#pais" style="text-decoration: none; color: #0f1a33; ${CARTAO_I}; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<span style="align-self: flex-start; background: #f8e4ee; color: #8e1650; border-radius: 999px; padding: 4px 14px; font-weight: 700; font-size: 15px">Sua família</span>
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 30px; line-height: 1.15">Área dos pais</h2>
<span>O que os seus filhos praticam, o tempo de uso, os cursos para pais e a sua conta.</span>
<strong style="color: #1343b8">Entrar na área dos pais</strong>
</a>
<a href="#escola" style="text-decoration: none; color: #0f1a33; ${CARTAO_I}; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<span style="align-self: flex-start; background: #dcf0e4; color: #096b4a; border-radius: 999px; padding: 4px 14px; font-weight: 700; font-size: 15px">Seu trabalho</span>
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 30px; line-height: 1.15">Área da escola ou da instituição</h2>
<span>Para professores, gestores e profissionais. As turmas, as tarefas, os recados e a formação.</span>
<strong style="color: #1343b8">Entrar na área da escola</strong>
</a>
</div>

<span style="color: #46536e; max-width: 760px">É a mesma conta, com o mesmo e-mail e a mesma senha. Cada área pede a senha quando você entra nela. Quem dá aula em duas escolas escolhe a escola depois de entrar.</span>

</main>
</div>`,
)

// ---------- Área do aluno (no espaço da escola) ----------
const CARTAO_K = 'background: #ffffff; border-radius: 24px; box-shadow: 0 8px 22px rgba(28,48,90,0.1)'
const H1_K = `margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1`
const H2_K = `margin: 0; ${BALOO}; font-weight: 800; font-size: 24px; line-height: 1.15`
const BOTAO_K = 'height: 52px; padding: 0 30px; border: 0; border-radius: 999px; background: #1b5cf3; color: #ffffff; font-family: inherit; font-size: 17px; font-weight: 800; box-shadow: 0 4px 0 #1343b8'
const falaK = (quem, quando, texto, minha) => `<div style="align-self: ${minha ? 'flex-end' : 'flex-start'}; max-width: 82%; background: ${minha ? '#e2ebff' : '#eff3f9'}; border-radius: 18px; padding: 12px 18px; display: flex; flex-direction: column; gap: 2px">
<span style="font-size: 14px; font-weight: 800; color: #46536e">${quem} · ${quando}</span>
<span>${texto}</span>
</div>`

function aluno(ativo, conteudo) {
  const itens = [['Início', 'inicio'], ['Cursos', 'cursos'], ['Mural da escola', 'mural'], ['Recados', 'recados'], ['Meu espaço', 'espaco']]
    .map(([rotulo, id]) =>
      id === ativo
        ? `<a href="#${id}" style="background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`
        : `<a href="#${id}" style="color: #cbd4e8; text-decoration: none; font-weight: 700; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`,
    )
    .join('\n')
  return `<div style="font-family: 'Nunito', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #e9eef6; display: flex; flex-wrap: wrap">

<nav style="flex: 1 1 268px; max-width: 100%; background: #121a30; color: #cbd4e8; padding: 28px 20px; display: flex; flex-direction: column; gap: 24px">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 180px; height: auto">
<div style="display: flex; align-items: center; gap: 12px; background: #1b2540; border-radius: 16px; padding: 10px 12px">
<div style="width: 40px; height: 40px; min-width: 40px; border-radius: 10px; background: #0b7a54; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 17px">CA</div>
<div style="display: flex; flex-direction: column; line-height: 1.25"><strong style="color: #ffffff">Colégio Araucária</strong><span style="font-size: 15px">6º ano B</span></div>
</div>
<div style="display: flex; flex-direction: column; gap: 6px">
${itens}
</div>
<div style="margin-top: auto; display: flex; flex-direction: column; gap: 14px">
<a href="#comofazer" style="color: #cbd4e8; text-decoration: none; font-weight: 700; padding: 0 16px">Como fazer</a>
<div style="display: flex; align-items: center; gap: 12px; background: #1b2540; border-radius: 16px; padding: 12px">
<div style="width: 44px; height: 44px; min-width: 44px; border-radius: 50%; background: #ffc02e; color: #121a30; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 22px">T</div>
<div style="display: flex; flex-direction: column; line-height: 1.25"><strong style="color: #ffffff">Theo</strong><span style="font-size: 15px">Construtor · 1.240 XP</span></div>
</div>
</div>
</nav>

<main style="flex: 999 1 640px; min-width: 0; padding: 40px 44px 56px; display: flex; flex-direction: column; gap: 24px">
${conteudo}
</main>
</div>`
}

// =====================================================================================
// C6 · Aluno · Recados
// =====================================================================================
arquivo(
  'Tela-RecadosAluno.dc.html',
  'Aluno: recados',
  F_KIDS,
  '#e9eef6',
  aluno(
    'recados',
    `
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="${H1_K}">Recados</h1>
<span style="font-size: 19px; color: #46536e">Aqui você fala com a professora Renata.</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<section style="flex: 999 1 520px; min-width: 0; ${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<h2 style="${H2_K}">Professora Renata</h2>
<div style="display: flex; flex-direction: column; gap: 10px">
${falaK('Professora Renata', 'segunda', 'Theo, vi que você terminou a aula 1. Boa!', false)}
${falaK('Você', 'segunda', 'Prof, travei no tiro da nave, mas consegui!', true)}
${falaK('Professora Renata', 'hoje', 'Que bom que você voltou e tentou de novo. Hoje a gente segue com os asteroides.', false)}
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center">
<input type="text" aria-label="Escreva o seu recado" value="" placeholder="Escreva o seu recado" style="flex: 1 1 260px; height: 52px; border: 1.5px solid #74829f; border-radius: 999px; padding: 0 20px; font-family: inherit; font-size: 17px; color: #0f1a33">
<button type="button" style="${BOTAO_K}">Enviar</button>
</div>
</section>

<aside style="flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<h2 style="${H2_K}">Recado para a turma</h2>
<span>Lembrem do prazo: sexta, 14 de setembro.</span>
<span style="color: #5c4000; font-size: 15px">Professora Renata, na segunda</span>
</section>
<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<h2 style="${H2_K}">Quem lê os seus recados</h2>
<span>A professora Renata e a sua mãe. A gestão da escola pode ler, se precisar.</span>
</section>
</aside>

</div>`,
  ),
)

// ---------- Área dos pais ----------
function pais({ ativo, filhos, nome }, conteudo) {
  const item = (rotulo, id, filho) => {
    const base = filho ? 'padding: 8px 16px 8px 32px' : 'padding: 12px 16px'
    return id === ativo
      ? `<a href="#${id}" style="background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; ${base}; border-radius: 14px">${rotulo}</a>`
      : `<a href="#${id}" style="color: #cbd4e8; text-decoration: none; font-weight: ${filho ? 600 : 700}; ${base}; border-radius: 14px">${rotulo}</a>`
  }
  return `<div style="font-family: 'Nunito', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #eff3f9; display: flex; flex-wrap: wrap">

<nav style="flex: 1 1 268px; max-width: 100%; background: #121a30; color: #cbd4e8; padding: 28px 20px; display: flex; flex-direction: column; gap: 24px">
<div style="display: flex; flex-direction: column; gap: 8px">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 180px; height: auto">
<span style="font-size: 13px; font-weight: 800; letter-spacing: 0.12em; color: #8e9bba">ÁREA DOS PAIS</span>
</div>
<div style="display: flex; flex-direction: column; gap: 6px">
${item('Início', 'inicio')}
${item('Família', 'familia')}
${filhos.map((f) => item(f, f.toLowerCase(), true)).join('\n')}
${item('Cursos para pais', 'cursos')}
${item('Oficinas ao vivo', 'oficinas')}
${item('Conta', 'conta')}
${item('Ajuda', 'ajuda')}
</div>
<div style="margin-top: auto; display: flex; flex-direction: column; gap: 14px">
<a href="#crianca" style="display: flex; align-items: center; justify-content: center; height: 48px; border-radius: 999px; background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; box-shadow: 0 4px 0 #1343b8">Ir para a área da criança</a>
<div style="display: flex; flex-direction: column; background: #1b2540; border-radius: 16px; padding: 12px 16px; line-height: 1.3"><strong style="color: #ffffff">${nome}</strong><span style="font-size: 15px">Responsável</span></div>
</div>
</nav>

<main style="flex: 999 1 640px; min-width: 0; padding: 40px 44px 56px; display: flex; flex-direction: column; gap: 24px">
${conteudo}
</main>
</div>`
}

// =====================================================================================
// B11 · Pais · Recados
// =====================================================================================
arquivo(
  'Tela-RecadosPais.dc.html',
  'Área dos pais: recados',
  F_KIDS,
  '#eff3f9',
  pais(
    { ativo: 'familia', filhos: ['Theo', 'Lia'], nome: 'Marina' },
    `
<a href="#inicio" style="font-weight: 800">← Início</a>

<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="${H1_K}">Recados</h1>
<span style="font-size: 19px; color: #46536e">O que os seus filhos conversam, e a sua conversa com quem acompanha.</span>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 24px; align-items: start">

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; flex-direction: column; gap: 2px">
<span style="align-self: flex-start; background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 14px">Colégio Araucária</span>
<h2 style="${H2_K}">Theo com a professora Renata</h2>
</div>
<div style="display: flex; flex-direction: column; gap: 10px">
${falaK('Professora Renata', 'segunda', 'Theo, vi que você terminou a aula 1. Boa!', false)}
${falaK('Theo', 'segunda', 'Prof, travei no tiro da nave, mas consegui!', true)}
${falaK('Professora Renata', 'hoje', 'Que bom que você voltou e tentou de novo. Hoje a gente segue com os asteroides.', false)}
</div>
<span style="color: #46536e">Você lê esta conversa, e não escreve nela.</span>
<div style="background: #eff3f9; border-radius: 16px; padding: 14px 16px"><strong>Lia com a professora Lúcia:</strong> nenhum recado nesta semana.</div>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; flex-direction: column; gap: 2px">
<span style="align-self: flex-start; background: #dcf0e4; color: #096b4a; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 14px">Clínica Girassol</span>
<h2 style="${H2_K}">Você com a Camila</h2>
</div>
<div style="display: flex; flex-direction: column; gap: 10px">
${falaK('Você', 'ontem', 'Ele travou no tiro da nave, saiu de perto, e depois voltou sozinho e terminou.', true)}
${falaK('Camila', 'hoje', 'Ótima notícia. Da próxima vez, pergunte o que ele mudou entre uma tentativa e a outra.', false)}
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center">
<input type="text" aria-label="Escreva para a Camila" value="" placeholder="Escreva para a Camila" style="flex: 1 1 240px; height: 52px; border: 1.5px solid #74829f; border-radius: 999px; padding: 0 20px; font-family: inherit; font-size: 17px; color: #0f1a33">
<button type="button" style="${BOTAO_K}">Enviar</button>
</div>
<span style="color: #46536e">Só você e a Camila leem esta conversa. A escola não vê, e o Theo não recebe recados da Camila.</span>
</section>

</div>`,
  ),
)

// =====================================================================================
// B12 · Pais · Limites (família que não está ligada a uma escola para este filho)
// =====================================================================================
const chave = (texto, ligada) =>
  `<label style="display: flex; gap: 12px; align-items: flex-start; background: #eff3f9; border-radius: 16px; padding: 14px 16px; font-weight: 700"><input type="checkbox"${ligada ? ' checked' : ''} style="width: 22px; height: 22px; min-width: 22px; margin-top: 2px"><span>${texto}</span></label>`
const CAMPO_K = 'height: 48px; border: 1.5px solid #74829f; border-radius: 14px; padding: 0 14px; font-family: inherit; font-size: 17px; color: #0f1a33; background: #ffffff'

arquivo(
  'Tela-Limites.dc.html',
  'Área dos pais: limites do filho',
  F_KIDS,
  '#eff3f9',
  pais(
    { ativo: 'gabriel', filhos: ['Júlia', 'Gabriel'], nome: 'Fernanda' },
    `
<a href="#familia" style="font-weight: 800">← Família</a>

<div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap">
<div style="width: 76px; height: 76px; min-width: 76px; border-radius: 50%; background: #9ec5ff; color: #121a30; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 36px">G</div>
<div style="display: flex; flex-direction: column; gap: 4px">
<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap"><h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 40px; line-height: 1.1">Gabriel</h1><span style="background: #1b5cf3; color: #ffffff; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Faísca</span></div>
<span style="color: #46536e">8 anos · plano de R$ 97</span>
</div>
</div>

<div style="display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 2px solid #d6deea">
<a href="#progresso" style="color: #46536e; text-decoration: none; font-weight: 700; padding: 10px 18px">Progresso</a>
<a href="#aparelhos" style="color: #46536e; text-decoration: none; font-weight: 700; padding: 10px 18px">Aparelhos</a>
<a href="#limites" style="color: #1343b8; text-decoration: none; font-weight: 800; padding: 10px 18px; border-bottom: 3px solid #1b5cf3">Limites</a>
<a href="#jogo" style="color: #46536e; text-decoration: none; font-weight: 700; padding: 10px 18px">No jogo</a>
<a href="#perfil" style="color: #46536e; text-decoration: none; font-weight: 700; padding: 10px 18px">Perfil</a>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 24px; align-items: start">

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_K}">Tempo de uso</h2>
<span>Nos últimos 7 dias, o Gabriel usou <strong>4 h 10 min</strong>, em 5 dias.</span>
<label style="display: flex; flex-direction: column; gap: 6px; font-weight: 700; max-width: 300px">Limite por dia<select style="${CAMPO_K}"><option>1 hora</option></select></label>
${chave('Avisar o Gabriel 5 minutos antes de o tempo acabar', true)}
<span style="color: #46536e">Quando o tempo acaba, o trabalho é salvo e a tela fecha até o dia seguinte.</span>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_K}">Conversa com o Zappy</h2>
${chave('Deixar o Gabriel conversar com o Zappy', true)}
<span style="color: #46536e">Como o Gabriel não está ligado a uma escola, a escolha é sua. Para a Júlia, vale a regra do Colégio Araucária.</span>
<span style="color: #46536e">As falas do Zappy dentro das aulas não dependem desta chave.</span>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_K}">Com quem ele conversa</h2>
${chave('Deixar o Gabriel participar do Clube dos Criadores', true)}
${chave('Deixar o Gabriel aparecer no ranking', true)}
<span style="color: #46536e">As mensagens passam pela moderação do Sistema Zero. Os recados com a equipe continuam sempre ligados.</span>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_K}">Dias seguidos</h2>
${chave('Mostrar ao Gabriel a sequência de dias', true)}
<span style="color: #46536e">Falhar um dia não tira nada dele, e não há aviso de perda.</span>
</section>

</div>

<section style="background: #fff3c4; border-radius: 24px; padding: 24px 28px; display: flex; flex-direction: column; gap: 6px">
<strong style="font-size: 19px">O Gabriel sabe que você acompanha</strong>
<span>Na área dele aparece um aviso de que a mãe vê o que ele faz e quanto tempo usa.</span>
</section>`,
  ),
)
