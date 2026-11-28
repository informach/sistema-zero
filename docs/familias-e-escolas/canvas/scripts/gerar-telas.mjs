// Gera as telas dos fluxos C (aluno), D (professor) e E (instituição parceira) da versão 2.
// A saída é marcação literal, igual à das telas escritas à mão: sem laços nem variáveis no arquivo final.
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

// ---------- Moldura do aluno (área da criança, dentro do espaço da escola) ----------
const CARTAO_K = 'background: #ffffff; border-radius: 24px; box-shadow: 0 8px 22px rgba(28,48,90,0.1)'
const BOTAO_K = 'display: inline-flex; align-items: center; height: 52px; padding: 0 30px; border-radius: 999px; background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; box-shadow: 0 4px 0 #1343b8'

function aluno(ativo, conteudo) {
  const itens = [
    ['Início', 'inicio'],
    ['Cursos', 'cursos'],
    ['Mural da escola', 'mural'],
    ['Recados', 'recados'],
    ['Meu espaço', 'espaco'],
  ]
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

<main style="flex: 999 1 640px; min-width: 0; padding: 40px 44px 56px; display: flex; flex-direction: column; gap: 28px">
${conteudo}
</main>
</div>`
}

// ---------- Moldura da área das instituições (gestão, professor, coordenação, profissional) ----------
const CARTAO_I = 'background: #ffffff; border: 1px solid #d6deea; border-radius: 20px; box-shadow: 0 4px 0 #d6deea'
const BOTAO_I = 'min-height: 50px; padding: 0 22px; border: 0; border-radius: 12px; background: #ffc02e; color: #0b0e1a; font-family: inherit; font-size: 17px; font-weight: 700; box-shadow: 0 4px 0 #c98a00'
const BOTAO_I2 = 'min-height: 50px; padding: 0 22px; border: 1.5px solid #74829f; border-radius: 12px; background: #ffffff; color: #0f1a33; font-family: inherit; font-size: 17px; font-weight: 700'
const H2_I = `margin: 0; ${BRICO}; font-weight: 700; font-size: 26px; line-height: 1.2`
const H3_I = `margin: 0; ${BRICO}; font-weight: 700; font-size: 24px; line-height: 1.2`
const CAMPO_I = 'height: 50px; border: 1.5px solid #74829f; border-radius: 12px; padding: 0 14px; font-family: inherit; font-size: 17px; color: #0f1a33; background: #ffffff; width: 100%'

const ESCOLA = { sigla: 'CA', nome: 'Colégio Araucária', cor: '#0b7a54' }
const CLINICA = { sigla: 'CG', nome: 'Clínica Girassol', cor: '#6d3bf5' }
const NAV_PROFESSOR = [
  ['Início', 'inicio'],
  ['Minhas turmas', 'turmas'],
  ['Tarefas', 'tarefas'],
  ['Recados', 'recados'],
  ['Minha formação', 'formacao'],
]
const NAV_COORDENACAO = [
  ['Início', 'inicio'],
  ['Crianças', 'criancas'],
  ['Profissionais', 'profissionais'],
  ['Vagas', 'vagas'],
  ['Aparelhos', 'aparelhos'],
  ['Formação', 'formacao'],
]
const NAV_PROFISSIONAL = [
  ['Início', 'inicio'],
  ['Crianças', 'criancas'],
  ['Planos combinados', 'planos'],
  ['Famílias', 'familias'],
  ['Minha formação', 'formacao'],
]

function instituicao({ inst, nav, ativo, pessoa, papel, main }) {
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
<div style="width: 36px; height: 36px; border-radius: 9px; background: ${inst.cor}; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BRICO}; font-weight: 800; font-size: 16px">${inst.sigla}</div>
<strong>${inst.nome}</strong>
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

${main}
</div>`
}

const selo = (texto, fundo, cor) =>
  `<span style="background: ${fundo}; color: ${cor}; border-radius: 999px; padding: 4px 12px; font-weight: 700; font-size: 15px">${texto}</span>`
const VERDE = ['#dcf0e4', '#096b4a']
const AZUL = ['#e2ebff', '#1343b8']
const AMARELO = ['#fff3c4', '#5c4000']
const CINZA = ['#eff3f9', '#46536e']

// =====================================================================================
// C2 · Aluno · Início
// =====================================================================================
arquivo(
  'Tela-Aluno.dc.html',
  'Aluno: Início no espaço da escola',
  F_KIDS,
  '#e9eef6',
  aluno(
    'inicio',
    `
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1">Oi, Theo!</h1>
<span style="font-size: 19px; color: #46536e">Hoje tem aula de criação com a turma do 6º ano B.</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 16px">
<span style="align-self: flex-start; background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Tarefa da professora Renata</span>
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 32px; line-height: 1.15">Nave Contra Asteroides, aulas 1 a 3</h2>
<span style="color: #46536e">Entrega até sexta, 14 de setembro.</span>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 12px">
<div style="background: #dcf0e4; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column"><strong style="color: #096b4a">Aula 1</strong><span>A nave se move. Feita!</span></div>
<div style="background: #dcf0e4; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column"><strong style="color: #096b4a">Aula 2</strong><span>A nave atira. Feita!</span></div>
<div style="background: #eff3f9; border: 2px solid #1b5cf3; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column"><strong style="color: #1343b8">Aula 3</strong><span>Os asteroides. É a sua vez.</span></div>
</div>
<div style="display: flex; gap: 18px; flex-wrap: wrap; align-items: center">
<a href="#continuar" style="${BOTAO_K}">Continuar a aula 3</a>
<a href="#tarefa" style="font-weight: 800">Ver a tarefa</a>
</div>
</section>

<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 16px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 26px">Missões</h2>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(170px, 100%), 1fr)); gap: 14px">
<div style="border: 2px solid #1b5cf3; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 4px"><strong style="color: #1343b8">Hoje</strong><span>Conclua 1 aula</span></div>
<div style="border: 2px solid #c8246f; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 4px"><strong style="color: #8e1650">Esta semana</strong><span>Verifique o seu projeto 3 vezes</span></div>
<div style="border: 2px solid #0b7a54; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 4px"><strong style="color: #096b4a">Este mês</strong><span>Publique um jogo no mural da escola</span></div>
</div>
</section>

</div>

<aside style="flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">Jornada do Criador</h2>
<span><strong>Hoje:</strong> Construtor</span>
<span><strong>Próxima conquista:</strong> Inventor</span>
<div style="height: 12px; border-radius: 999px; background: #eff3f9"><div style="width: 60%; height: 12px; border-radius: 999px; background: #1b5cf3"></div></div>
<a href="#jornada" style="font-weight: 800">Ver a minha Jornada</a>
</section>

<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">O que você praticou</h2>
<div style="display: flex; gap: 8px; flex-wrap: wrap">
<span style="background: #ffffff; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Pensar em passos</span>
<span style="background: #ffffff; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Testar e corrigir</span>
</div>
<span>Você tentou 4 vezes até a nave atirar, e conseguiu. É assim que se cria um jogo.</span>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">Mural da escola</h2>
<span>3 jogos novos do 6º e do 7º ano para você jogar.</span>
<a href="#mural" style="font-weight: 800">Ver o mural</a>
</section>

</aside>

</div>`,
  ),
)

// =====================================================================================
// C3 · Aluno · A tarefa
// =====================================================================================
const objetivo = (texto, feito) =>
  `<li style="display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap"><span>${texto}</span>${
    feito
      ? '<span style="background: #dcf0e4; color: #096b4a; border-radius: 999px; padding: 2px 12px; font-weight: 800; font-size: 15px">Cumprido</span>'
      : '<span style="background: #eff3f9; color: #46536e; border-radius: 999px; padding: 2px 12px; font-weight: 800; font-size: 15px">Falta</span>'
  }</li>`

arquivo(
  'Tela-TarefaAluno.dc.html',
  'Aluno: a tarefa da escola',
  F_KIDS,
  '#e9eef6',
  aluno(
    'inicio',
    `
<a href="#inicio" style="font-weight: 800">← Início</a>

<div style="display: flex; flex-direction: column; gap: 10px">
<span style="align-self: flex-start; background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Tarefa da professora Renata</span>
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1">Nave Contra Asteroides, aulas 1 a 3</h1>
<span style="font-size: 19px; color: #46536e">Entrega até sexta, 14 de setembro. Faltam 3 dias.</span>
<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; max-width: 620px">
<div style="flex: 1 1 260px; height: 14px; border-radius: 999px; background: #ffffff"><div style="width: 66%; height: 14px; border-radius: 999px; background: #0b7a54"></div></div>
<strong>2 de 3 aulas feitas</strong>
</div>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 20px">

<section style="${CARTAO_K}; padding: 28px 32px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 26px; line-height: 1.15">Aula 1 · A nave se move</h2>
<span style="background: #0b7a54; color: #ffffff; border-radius: 999px; padding: 4px 16px; font-weight: 800; font-size: 15px">Feita</span>
</div>
<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">
${objetivo('A nave anda para os lados com as setas', true)}
${objetivo('A nave não sai da tela', true)}
</ul>
</section>

<section style="${CARTAO_K}; padding: 28px 32px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 26px; line-height: 1.15">Aula 2 · A nave atira</h2>
<span style="background: #0b7a54; color: #ffffff; border-radius: 999px; padding: 4px 16px; font-weight: 800; font-size: 15px">Feita</span>
</div>
<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">
${objetivo('O tiro sai da ponta da nave', true)}
${objetivo('O tiro some quando sai da tela', true)}
${objetivo('Quiz da aula', true)}
</ul>
</section>

<section style="background: #ffffff; border: 3px solid #1b5cf3; border-radius: 24px; box-shadow: 0 8px 22px rgba(28,48,90,0.1); padding: 28px 32px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 26px; line-height: 1.15">Aula 3 · Os asteroides</h2>
<span style="background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 16px; font-weight: 800; font-size: 15px">É a sua vez</span>
</div>
<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px">
${objetivo('Os asteroides caem do alto da tela', false)}
${objetivo('O asteroide some quando o tiro acerta', false)}
${objetivo('O placar conta os acertos', false)}
</ul>
<a href="#continuar" style="align-self: flex-start; ${BOTAO_K}">Continuar a aula 3</a>
</section>

</div>

<aside style="flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 20px">

<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px; line-height: 1.15">Como a entrega funciona</h2>
<span>Você não precisa enviar nada à parte. Quando o seu jogo cumpre os objetivos e você clica em <strong>Verificar projeto</strong>, a aula fica feita e a professora Renata fica sabendo.</span>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px; line-height: 1.15">Travou?</h2>
<span>Peça <strong>Uma pista</strong> dentro da aula. Se continuar difícil, chame a professora ou mande um recado.</span>
<a href="#recado" style="font-weight: 800">Mandar um recado para a professora</a>
<span style="color: #46536e">A conversa com o Zappy aparece quando a professora liga na aula.</span>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px; line-height: 1.15">O que você pratica aqui</h2>
<div style="display: flex; gap: 8px; flex-wrap: wrap">
<span style="background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Pensar em passos</span>
<span style="background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Testar e corrigir</span>
</div>
</section>

</aside>

</div>`,
  ),
)

// =====================================================================================
// C4 · Aluno · Mural da escola
// =====================================================================================
const jogo = (nome, autor, turma, fundo, tinta, novo) => `<article style="${CARTAO_K}; overflow: hidden; display: flex; flex-direction: column">
<div style="height: 168px; background: ${fundo}; color: ${tinta}; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; ${BALOO}; font-weight: 800; font-size: 28px; line-height: 1.1">${nome}</div>
<div style="padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 10px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap"><strong style="font-size: 19px">${nome}</strong>${novo ? '<span style="background: #fff3c4; color: #5c4000; border-radius: 999px; padding: 2px 12px; font-weight: 800; font-size: 14px">Novo</span>' : ''}</div>
<span style="color: #46536e">de ${autor} · ${turma}</span>
<a href="#jogar" style="align-self: flex-start; display: inline-flex; align-items: center; height: 44px; padding: 0 24px; border-radius: 999px; border: 2px solid #1b5cf3; color: #1343b8; text-decoration: none; font-weight: 800">Jogar</a>
</div>
</article>`

arquivo(
  'Tela-Mural.dc.html',
  'Aluno: mural da escola',
  F_KIDS,
  '#e9eef6',
  aluno(
    'mural',
    `
<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1">Mural da escola</h1>
<span style="font-size: 19px; color: #46536e">Jogos do 6º e do 7º ano do Colégio Araucária. Só essas turmas veem e jogam.</span>
</div>
<a href="#publicar" style="${BOTAO_K}">Publicar um jogo</a>
</div>

<div style="display: flex; gap: 10px; flex-wrap: wrap">
<a href="#todos" style="background: #121a30; color: #ffffff; text-decoration: none; font-weight: 800; padding: 8px 18px; border-radius: 999px">Todos os jogos</a>
<a href="#sexto" style="background: #ffffff; color: #0f1a33; text-decoration: none; font-weight: 700; padding: 8px 18px; border-radius: 999px">6º ano</a>
<a href="#setimo" style="background: #ffffff; color: #0f1a33; text-decoration: none; font-weight: 700; padding: 8px 18px; border-radius: 999px">7º ano</a>
<a href="#meus" style="background: #ffffff; color: #0f1a33; text-decoration: none; font-weight: 700; padding: 8px 18px; border-radius: 999px">Os meus</a>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 24px">
${jogo('Chuva de Meteoros', 'Sofia S.', '6º ano B', '#1b2540', '#ffc02e', true)}
${jogo('Nave do Rafa', 'Rafael L.', '6º ano B', '#0b7a54', '#ffffff', true)}
${jogo('Dino Veloz', 'Júlia F.', '7º ano A', '#ffc02e', '#121a30', true)}
${jogo('Labirinto da Alice', 'Alice P.', '6º ano B', '#8e1650', '#ffffff', false)}
${jogo('Robô Perdido', 'Miguel T.', '7º ano B', '#1343b8', '#ffffff', false)}
${jogo('Fuga do Asteroide', 'Isabela N.', '6º ano A', '#5b3fd6', '#ffffff', false)}
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 24px">
<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<strong style="font-size: 19px">Mostra de Jogos em novembro</strong>
<span>As turmas vão mostrar os jogos para as famílias. O jogo que você publicar aqui pode entrar na mostra.</span>
</section>
<section style="background: #ffffff; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<strong style="font-size: 19px">Antes de aparecer aqui</strong>
<span>Todo jogo passa pela conferência da equipe do Sistema Zero. Publicar um jogo no mural da escola conta para a sua Jornada.</span>
</section>
</div>`,
  ),
)

// =====================================================================================
// D2 · Professor · A turma
// =====================================================================================
const GRADE_TURMA = 'display: grid; grid-template-columns: 1.1fr 0.9fr 1fr 0.8fr 1.9fr; gap: 12px'
const linhaTurma = (nome, posto, feito, tent, situacao, cor, ultima) =>
  `<div style="${GRADE_TURMA}; padding: 14px 0; ${ultima ? '' : 'border-bottom: 1px solid #d6deea; '}align-items: center">
<strong>${nome}</strong><span>${posto}</span><span>${feito}</span><span>${tent}</span><span>${selo(situacao, ...cor)}</span>
</div>`

arquivo(
  'Tela-Turma.dc.html',
  'Professor: a turma',
  F_INST,
  '#f5f7fb',
  instituicao({
    inst: ESCOLA,
    nav: NAV_PROFESSOR,
    ativo: 'turmas',
    pessoa: 'Renata',
    papel: 'Professora',
    main: `<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-direction: column; gap: 28px">

<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<a href="#turmas" style="font-weight: 700">Minhas turmas</a>
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 40px; line-height: 1.1">6º ano B</h1>
<span style="color: #46536e">28 alunos · terças-feiras, no 3º horário</span>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
<button type="button" style="${BOTAO_I2}">Recado para a turma</button>
<button type="button" style="${BOTAO_I}">Nova tarefa</button>
</div>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<span style="color: #46536e; font-size: 15px; font-weight: 700">Tarefa em andamento</span>
<h2 style="${H2_I}">Nave Contra Asteroides, aulas 1 a 3</h2>
<span>Entrega até sexta, 14 de setembro. Faltam 3 dias.</span>
</div>
<a href="#resultado" style="font-weight: 700">Ver o resultado</a>
</div>
<div style="display: flex; height: 16px; border-radius: 999px; overflow: hidden; background: #eff3f9">
<div style="width: 61%; background: #0b7a54"></div>
<div style="width: 28%; background: #1b5cf3"></div>
<div style="width: 11%; background: #b9c6d9"></div>
</div>
<div style="display: flex; gap: 24px; flex-wrap: wrap">
<span><strong style="color: #096b4a">17</strong> concluíram</span>
<span><strong style="color: #1343b8">8</strong> estão fazendo</span>
<span><strong style="color: #46536e">3</strong> não começaram</span>
</div>
<div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
<span style="color: #46536e">Nesta tarefa a turma pratica:</span>
${selo('Pensar em passos', ...AZUL)}
${selo('Testar e corrigir', ...AZUL)}
</div>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="${H2_I}">Alunos</h2>
<a href="#todos" style="font-weight: 700">Ver os 28</a>
</div>
<div style="overflow-x: auto">
<div style="min-width: 680px">
<div style="${GRADE_TURMA}; padding: 10px 0; color: #46536e; font-size: 15px; font-weight: 700; border-bottom: 1px solid #d6deea">
<div>Aluno</div><div>Posto</div><div>Nesta tarefa</div><div>Tentativas</div><div>Situação</div>
</div>
${linhaTurma('Theo M.', 'Construtor', '2 de 3 aulas', '5', 'Fazendo', AZUL)}
${linhaTurma('Sofia S.', 'Construtora', '1 de 3 aulas', '6', 'Parada na aula 2', AMARELO)}
${linhaTurma('Rafael L.', 'Construtor', '3 de 3 aulas', '8', 'Concluiu no prazo', VERDE)}
${linhaTurma('Alice P.', 'Construtora', '3 de 3 aulas', '7', 'Já tinha feito em casa', VERDE)}
${linhaTurma('Pedro R.', 'Construtor', '0 de 3 aulas', '0', 'Ainda não começou', CINZA)}
${linhaTurma('Bento A.', 'Faísca', 'Ainda não abriu', '0', 'Terminando o posto Faísca antes', CINZA, true)}
</div>
</div>
<span style="color: #46536e; font-size: 15px">7 alunos desta turma ainda não tiveram o primeiro acesso da família. Eles fazem as aulas e as tarefas normalmente.</span>
<a href="#cracha" style="font-weight: 700">Um aluno perdeu o crachá? Gerar outro código</a>
</section>

</div>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<h2 style="${H3_I}">Quem precisa de você agora</h2>
<div style="display: flex; flex-direction: column; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid #d6deea"><span><strong>Sofia S.</strong> está parada na aula 2 desde a semana passada, depois de 6 tentativas.</span><a href="#sofia" style="font-weight: 700">Ver o projeto dela</a></div>
<div style="display: flex; flex-direction: column; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid #d6deea"><span><strong>Pedro R.</strong> ainda não começou a tarefa.</span><a href="#pedro" style="font-weight: 700">Mandar um recado</a></div>
<div style="display: flex; flex-direction: column; gap: 6px"><span><strong>Bento A.</strong> ainda está no posto Faísca. Ele recebe esta tarefa quando terminar o que falta.</span><span style="color: #46536e; font-size: 15px">Você vê o posto dele, e não as aulas que ele faz fora das tarefas.</span></div>
</section>

<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">O Zappy nesta turma</h2>
<span style="color: #c9d1e6">No 6º ano, a conversa com o Zappy só funciona quando você liga durante a aula. Ela desliga sozinha no fim do horário. Para os 7 alunos sem o primeiro acesso da família, ela continua desligada.</span>
<button type="button" style="align-self: flex-start; ${BOTAO_I}">Ligar o Zappy nesta aula</button>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Recados</h2>
<span>2 recados novos de alunos desta turma.</span>
<a href="#recados" style="font-weight: 700">Abrir os recados</a>
<span style="color: #46536e; font-size: 15px">Os recados ficam registrados, e a gestão da escola pode abrir.</span>
</section>

</aside>

</div>
</main>`,
  }),
)

// =====================================================================================
// D3 · Professor · Nova tarefa
// =====================================================================================
const CAIXA = `margin: 0; ${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 14px`
const LEGENDA = `float: left; padding: 0; ${BRICO}; font-weight: 700; font-size: 24px`
const conjunto = (nome, apoio, marcado) =>
  `<label style="display: flex; gap: 14px; align-items: flex-start; border: ${marcado ? '2px solid #1b5cf3; background: #eff3f9' : '1.5px solid #d6deea'}; border-radius: 16px; padding: 16px 18px"><input type="radio" name="conjunto"${marcado ? ' checked' : ''} style="width: 20px; height: 20px; min-width: 20px; margin-top: 3px"><span style="display: flex; flex-direction: column; gap: 2px"><strong>${nome}</strong><span style="color: #46536e">${apoio}</span></span></label>`
const resumo = (rotulo, valor) =>
  `<div style="display: flex; flex-direction: column; gap: 2px"><span style="color: #a3aecb; font-size: 15px">${rotulo}</span><strong>${valor}</strong></div>`

arquivo(
  'Tela-Tarefa.dc.html',
  'Professor: nova tarefa',
  F_INST,
  '#f5f7fb',
  instituicao({
    inst: ESCOLA,
    nav: NAV_PROFESSOR,
    ativo: 'tarefas',
    pessoa: 'Renata',
    papel: 'Professora',
    main: `<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-direction: column; gap: 28px">

<div style="display: flex; flex-direction: column; gap: 4px">
<a href="#tarefas" style="font-weight: 700">Tarefas</a>
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 40px; line-height: 1.1">Nova tarefa</h1>
<span style="color: #46536e">Você escolhe o que a turma vai fazer e até quando. As aulas gravadas ensinam, e a plataforma confere a entrega.</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<form style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">1. O que a turma vai fazer</legend>
<span style="color: #46536e">Cada conjunto já vem com as aulas, os objetivos e o que a plataforma confere.</span>
${conjunto('Nave Contra Asteroides, aulas 1 a 3', '3 aulas gravadas, para cerca de 2 encontros com a turma. Pratica pensar em passos e testar e corrigir.', true)}
${conjunto('Nave Contra Asteroides, aulas 4 a 6', '3 aulas gravadas, para cerca de 2 encontros com a turma. Pratica dividir o problema e persistir.', false)}
${conjunto('Corre, Dino, aulas 1 a 3', '3 aulas gravadas, para cerca de 2 encontros com a turma. Pratica planejar e pensar em passos.', false)}
</fieldset>

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">2. Para quem</legend>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
<label style="display: flex; align-items: center; gap: 10px; border: 2px solid #1b5cf3; background: #eff3f9; border-radius: 14px; padding: 12px 16px; font-weight: 700; min-height: 50px"><input type="checkbox" checked style="width: 20px; height: 20px">6º ano B, 28 alunos</label>
<label style="display: flex; align-items: center; gap: 10px; border: 1.5px solid #d6deea; border-radius: 14px; padding: 12px 16px; font-weight: 700; min-height: 50px"><input type="checkbox" style="width: 20px; height: 20px">6º ano A, 29 alunos</label>
</div>
<a href="#alunos" style="font-weight: 700">Escolher alunos um a um</a>
<div style="background: #fff3c4; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 6px">
<strong>5 alunos do 6º ano B já fizeram estas aulas em casa.</strong>
<span>Para eles, a tarefa já aparece como feita. Você pode passar o conjunto seguinte só para esses cinco.</span>
<a href="#seguinte" style="font-weight: 700">Passar as aulas 4 a 6 para eles</a>
</div>
<span style="color: #46536e">1 aluno ainda está no posto Faísca. Ele recebe esta tarefa assim que terminar o que falta.</span>
</fieldset>

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">3. Quando</legend>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px">
<div style="display: flex; flex-direction: column; gap: 6px"><label for="comeca" style="font-weight: 700">Começa em</label><input id="comeca" type="text" value="Segunda, 3 de setembro" style="${CAMPO_I}"></div>
<div style="display: flex; flex-direction: column; gap: 6px"><label for="entrega" style="font-weight: 700">Entrega até</label><input id="entrega" type="text" value="Sexta, 14 de setembro" style="${CAMPO_I}"></div>
<div style="display: flex; flex-direction: column; gap: 6px"><label for="depois" style="font-weight: 700">Depois do prazo</label><select id="depois" style="${CAMPO_I}"><option>Aceitar com atraso</option></select></div>
</div>
<label style="display: flex; align-items: center; gap: 10px"><input type="checkbox" style="width: 20px; height: 20px">Esta tarefa não tem prazo</label>
</fieldset>

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">4. Nota</legend>
<label style="display: flex; align-items: center; gap: 10px; font-weight: 700"><input type="checkbox" style="width: 20px; height: 20px">Usar nota nesta tarefa</label>
<span style="color: #46536e">Sem nota, a tarefa mostra só quem concluiu e quem ainda não. Com nota, ela vale de 0 a 10 e usa só o que a plataforma confere sozinha: 7 pontos pelos objetivos cumpridos nos projetos e 3 pontos pela melhor tentativa do quiz. Você não precisa corrigir nenhum jogo.</span>
</fieldset>

</form>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 24px">Resumo</h2>
${resumo('O quê', 'Nave Contra Asteroides, aulas 1 a 3')}
${resumo('Para quem', '6º ano B, 28 alunos')}
${resumo('Quando', 'De 3 a 14 de setembro')}
${resumo('Nota', 'Sem nota')}
<button type="button" style="${BOTAO_I}">Passar a tarefa</button>
<a href="#depois" style="color: #ffc02e; font-weight: 700; text-align: center">Salvar para depois</a>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<strong>Quem fica sabendo</strong>
<span>Os alunos veem a tarefa no Início deles, com o prazo e o que falta. As famílias veem na área dos pais.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<strong>O Zappy no 6º ano</strong>
<span>A conversa com o Zappy fica desligada para os alunos, e você liga durante a aula quando quiser.</span>
</section>
</aside>

</div>
</main>`,
  }),
)

// =====================================================================================
// D4 · Professor · Resultado da tarefa
// =====================================================================================
const GRADE_RES = 'display: grid; grid-template-columns: 1.1fr 0.8fr 0.9fr 0.9fr 0.8fr 1.7fr; gap: 12px'
const linhaRes = (nome, aulas, objetivos, quiz, tent, situacao, cor, destaque, ultima) =>
  `<div style="${GRADE_RES}; padding: 14px ${destaque ? '12px' : '0'}; ${destaque ? 'margin: 0 -12px; background: #eff3f9; border-radius: 12px; ' : ultima ? '' : 'border-bottom: 1px solid #d6deea; '}align-items: center">
<strong>${nome}</strong><span>${aulas}</span><span>${objetivos}</span><span>${quiz}</span><span>${tent}</span><span>${selo(situacao, ...cor)}</span>
</div>`
const numero = (valor, rotulo) =>
  `<div style="${CARTAO_I}; padding: 24px; display: flex; flex-direction: column; gap: 4px">
<span style="${BRICO}; font-weight: 800; font-size: 40px; line-height: 1.1">${valor}</span>
<span style="color: #46536e">${rotulo}</span>
</div>`

arquivo(
  'Tela-Resultado.dc.html',
  'Professor: resultado da tarefa',
  F_INST,
  '#f5f7fb',
  instituicao({
    inst: ESCOLA,
    nav: NAV_PROFESSOR,
    ativo: 'tarefas',
    pessoa: 'Renata',
    papel: 'Professora',
    main: `<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-direction: column; gap: 28px">

<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<a href="#tarefas" style="font-weight: 700">Tarefas</a>
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 40px; line-height: 1.1">Nave Contra Asteroides, aulas 1 a 3</h1>
<span style="color: #46536e">6º ano B · de 3 a 14 de setembro · faltam 3 dias · sem nota</span>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
<button type="button" style="${BOTAO_I2}">Baixar a lista</button>
<button type="button" style="${BOTAO_I}">Passar as aulas 4 a 6</button>
</div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 20px">
${numero('17 <span style="font-size: 22px; font-weight: 700; color: #46536e">de 28</span>', 'alunos concluíram as três aulas')}
${numero('25', 'fizeram a aula 1, A nave se move')}
${numero('22', 'fizeram a aula 2, A nave atira')}
${numero('17', 'fizeram a aula 3, Os asteroides')}
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="${H2_I}">Aluno por aluno</h2>
<a href="#todos" style="font-weight: 700">Ver os 28</a>
</div>
<div style="overflow-x: auto">
<div style="min-width: 760px">
<div style="${GRADE_RES}; padding: 10px 0; color: #46536e; font-size: 15px; font-weight: 700; border-bottom: 1px solid #d6deea">
<div>Aluno</div><div>Aulas</div><div>Objetivos</div><div>Quiz</div><div>Tentativas</div><div>Situação</div>
</div>
${linhaRes('Rafael L.', '3 de 3', '7 de 7', 'Aprovado', '8', 'Concluiu no prazo', VERDE)}
${linhaRes('Alice P.', '3 de 3', '7 de 7', 'Aprovado', '7', 'Fez em casa, em agosto', VERDE)}
${linhaRes('Theo M.', '2 de 3', '4 de 7', 'Aprovado', '5', 'Fazendo a aula 3', AZUL)}
${linhaRes('Sofia S.', '1 de 3', '3 de 7', 'Ainda não fez', '6', 'Parada na aula 2', AMARELO, true)}
${linhaRes('Pedro R.', '0 de 3', '0 de 7', 'Ainda não fez', '0', 'Não começou', CINZA)}
${linhaRes('Bento A.', 'Não abriu', 'Não abriu', 'Não abriu', '0', 'No posto Faísca', CINZA, false, true)}
</div>
</div>
<span style="color: #46536e; font-size: 15px">Tentativas são as vezes em que o aluno clicou em Verificar projeto. Tentar de novo faz parte da aula, e não tira ponto.</span>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_I}">Onde a turma mais travou</h2>
<span><strong>Aula 2, objetivo "O tiro some quando sai da tela".</strong> 9 alunos precisaram de 4 tentativas ou mais para cumprir.</span>
<span style="color: #46536e">Vale retomar com a turma: o que acontece com o tiro depois que ele passa do alto da tela?</span>
<div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
<span style="color: #46536e">Nesta tarefa a turma praticou:</span>
${selo('Pensar em passos', ...AZUL)}
${selo('Testar e corrigir', ...AZUL)}
</div>
</section>

</div>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="background: #ffffff; border: 2px solid #1b5cf3; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; flex-direction: column; gap: 2px">
<h2 style="${H3_I}">Sofia S.</h2>
<span style="color: #46536e">Construtora · 1 de 3 aulas · 6 tentativas</span>
</div>
<div style="display: flex; flex-direction: column; gap: 8px">
<strong>Aula 2 · A nave atira</strong>
<div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap"><span>O tiro sai da ponta da nave</span>${selo('Cumprido', ...VERDE)}</div>
<div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap"><span>O tiro some quando sai da tela</span>${selo('Falta', ...AMARELO)}</div>
<span style="color: #46536e; font-size: 15px">Última verificação na terça passada, 4 de setembro.</span>
</div>
<div style="background: #eff3f9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px">
<span style="color: #46536e; font-size: 15px">Recado dela, na terça passada</span>
<span>"Prof, o meu tiro fica parado lá em cima e não some."</span>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
<button type="button" style="${BOTAO_I}">Abrir o projeto</button>
<button type="button" style="${BOTAO_I2}">Responder</button>
</div>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<strong>O que conta como entrega</strong>
<span>A aula fica feita quando o projeto cumpre os objetivos e o aluno verifica. Ninguém precisa enviar arquivo, e você não precisa corrigir jogo por jogo.</span>
</section>

</aside>

</div>
</main>`,
  }),
)

// =====================================================================================
// E1 · Família · Página do código da instituição parceira
// =====================================================================================
const CAMPO_K = 'height: 48px; border: 1.5px solid #74829f; border-radius: 14px; padding: 0 14px; font-family: inherit; font-size: 17px; color: #0f1a33; background: #ffffff; width: 100%'
const LEGENDA_K = `padding: 0; ${BALOO}; font-weight: 800; font-size: 26px; margin-bottom: 12px`
const campoK = (id, rotulo, valor, tipo = 'text') =>
  `<div style="display: flex; flex-direction: column; gap: 6px"><label for="${id}" style="font-weight: 700">${rotulo}</label><input id="${id}" type="${tipo}" value="${valor}" style="${CAMPO_K}"></div>`

arquivo(
  'Tela-CodigoInst.dc.html',
  'Família: página do código da instituição parceira',
  F_KIDS,
  '#e9eef6',
  `<div style="font-family: 'Nunito', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #e9eef6">

<header style="background: #ffffff; border-bottom: 1px solid #d6deea">
<div style="max-width: 1200px; margin: 0 auto; padding: 18px 40px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap">
<img src="${LOGO_CLARO}" alt="Sistema Zero" style="width: 200px; height: auto">
<span style="color: #46536e; font-weight: 700">com</span>
<div style="display: flex; align-items: center; gap: 10px">
<div style="width: 44px; height: 44px; border-radius: 12px; background: #6d3bf5; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 20px">CG</div>
<strong style="font-size: 18px">Clínica Girassol</strong>
</div>
</div>
</header>

<main style="max-width: 1200px; margin: 0 auto; padding: 48px 40px 72px; display: flex; flex-direction: column; gap: 36px">

<div style="display: flex; flex-direction: column; gap: 12px; max-width: 860px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 46px; line-height: 1.1">A Clínica Girassol convidou a sua família para o Sistema Zero</h1>
<p style="margin: 0; font-size: 20px; color: #46536e">Aqui a criança aprende a pensar criando os próprios jogos. A profissional da clínica combina um plano com vocês e acompanha o que a criança pratica. A participação é opcional.</p>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start">

<form style="flex: 999 1 560px; min-width: 0; ${CARTAO_K}; padding: 36px; display: flex; flex-direction: column; gap: 32px">

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px">
<legend style="${LEGENDA_K}">1. O código da clínica</legend>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px">
<div style="display: flex; flex-direction: column; gap: 6px"><label for="codigo" style="font-weight: 700">Código que a clínica passou</label><input id="codigo" type="text" value="GIRASSOL-CRIAR" style="height: 52px; border: 2px solid #0b7a54; border-radius: 14px; padding: 0 16px; font-family: inherit; font-size: 18px; font-weight: 800; letter-spacing: 0.06em; color: #0f1a33; width: 100%"></div>
<div style="display: flex; flex-direction: column; gap: 6px"><label for="quem" style="font-weight: 700">Quem atende a criança na clínica</label><select id="quem" style="${CAMPO_K}; height: 52px"><option>Camila</option></select></div>
</div>
<span style="color: #096b4a; font-weight: 700">Tudo certo: Clínica Girassol.</span>
</fieldset>

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px">
<legend style="${LEGENDA_K}">2. Sua conta</legend>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px">
${campoK('nome', 'Seu nome completo', 'Paula Lemos')}
${campoK('email', 'Seu e-mail', 'paula@exemplo.com.br', 'email')}
${campoK('celular', 'Seu celular', '(31) 90000-0000', 'tel')}
</div>
<a href="#entrar" style="font-weight: 700">Já tenho conta no Sistema Zero</a>
</fieldset>

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px">
<legend style="${LEGENDA_K}">3. A criança</legend>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px">
${campoK('crianca', 'Como a criança é chamada', 'Bia')}
${campoK('nascimento', 'Data de nascimento', '22/05/2020')}
</div>
</fieldset>

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px">
<legend style="${LEGENDA_K}">4. Autorização</legend>
<label style="display: flex; gap: 12px; align-items: flex-start"><input type="checkbox" checked style="width: 22px; height: 22px; min-width: 22px; margin-top: 2px"><span>Sou responsável pela Bia.</span></label>
<label style="display: flex; gap: 12px; align-items: flex-start; background: #eff3f9; border-radius: 16px; padding: 16px 18px"><input type="checkbox" checked style="width: 22px; height: 22px; min-width: 22px; margin-top: 2px"><span>Autorizo a Camila, da Clínica Girassol, a ver o posto da Bia, o plano combinado com a nossa família, as aulas desse plano, com os projetos delas, e as habilidades praticadas nessas aulas. Ela não vê pagamentos, tempo de uso nem os recados da Bia com a escola, e não conversa com a Bia pela plataforma. Posso encerrar quando quiser, na área dos pais.</span></label>
</fieldset>

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px">
<legend style="${LEGENDA_K}">5. Pagamento</legend>
<label style="display: flex; align-items: center; gap: 12px; border: 2px solid #1b5cf3; background: #eff3f9; border-radius: 16px; padding: 14px 18px; font-weight: 700; min-height: 56px"><input type="radio" name="pagamento" checked style="width: 20px; height: 20px">No cartão, R$ 69,90 por mês, sem fidelidade</label>
<label style="display: flex; align-items: center; gap: 12px; border: 1.5px solid #d6deea; border-radius: 16px; padding: 14px 18px; font-weight: 700; min-height: 56px"><input type="radio" name="pagamento" style="width: 20px; height: 20px">No Pix, 6 meses por R$ 399</label>
<div style="max-width: 320px">${campoK('cpf', 'Seu CPF, para a nota fiscal', '000.000.000-00')}</div>
</fieldset>

<div style="display: flex; flex-direction: column; gap: 14px">
<button type="button" style="align-self: flex-start; height: 52px; padding: 0 32px; border: 0; border-radius: 999px; background: #1b5cf3; color: #ffffff; font-family: inherit; font-size: 17px; font-weight: 800; box-shadow: 0 4px 0 #1343b8">Cadastrar a Bia e pagar</button>
<p style="margin: 0; color: #46536e; font-size: 16px">Você pode cancelar quando quiser, na área dos pais, e a Bia usa até o fim do mês pago. Nos primeiros 7 dias, devolvemos o valor inteiro. No Pix, o acesso vale pelos 6 meses pagos.</p>
</div>
</form>

<aside style="flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 20px">
<div style="background: #121a30; color: #ffffff; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<div style="font-size: 14px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #cbd4e8">O plano da família, com o código da clínica</div>
<div style="${BALOO}; font-weight: 800; font-size: 38px; line-height: 1.05">R$ 69,90 por mês</div>
<ul style="margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px">
<li>Todos os cursos da Jornada do Criador</li>
<li>Estúdio, Pinta, Pensa e Molda livres, para criar à vontade</li>
<li>O acompanhamento da Camila, com o que vocês combinarem</li>
<li>Os cursos para pais e a área dos pais para você</li>
<li>O mesmo valor cobre até 2 filhos</li>
</ul>
</div>
<div style="background: #fff3c4; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 8px">
<strong>Já tem o plano da família?</strong>
<span>Entre com a sua conta. Quem já tem o plano pelo código de uma escola não paga de novo. Quem paga R$ 97 continua nos R$ 97 e não paga nada a mais. Se preferir, pode trocar para o plano pelo código, em Conta.</span>
</div>
<div style="background: #ffffff; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 8px">
<strong>Para onde vai o pagamento</strong>
<span>O pagamento é feito ao Sistema Zero. A Clínica Girassol não recebe nenhum valor pela sua inscrição.</span>
</div>
</aside>

</div>
</main>
</div>`,
)

// =====================================================================================
// E2 · Coordenação · Início
// =====================================================================================
const GRADE_PROF = 'display: grid; grid-template-columns: 1fr 1.2fr 0.7fr 1.4fr; gap: 12px'
const GRADE_CRI = 'display: grid; grid-template-columns: 1fr 0.9fr 1.8fr; gap: 12px'

arquivo(
  'Tela-Coordenacao.dc.html',
  'Coordenação da instituição parceira',
  F_INST,
  '#f5f7fb',
  instituicao({
    inst: CLINICA,
    nav: NAV_COORDENACAO,
    ativo: 'inicio',
    pessoa: 'Sílvia',
    papel: 'Coordenadora',
    main: `<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-direction: column; gap: 28px">

<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 40px; line-height: 1.1">Bom dia, Sílvia</h1>
<span style="color: #46536e">Clínica Girassol · instituição parceira desde março de 2029</span>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
<button type="button" style="${BOTAO_I2}">Convidar profissional</button>
<button type="button" style="${BOTAO_I}">Copiar o link das famílias</button>
</div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 20px">
${numero('9', 'crianças acompanhadas pela clínica')}
${numero('8', 'com o plano combinado em andamento')}
${numero('1', 'esperando o primeiro plano combinado')}
${numero('2 <span style="font-size: 22px; font-weight: 700; color: #46536e">de 3</span>', 'profissionais com a formação feita')}
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="${H2_I}">Profissionais</h2>
<a href="#profissionais" style="font-weight: 700">Ver todos</a>
</div>
<div style="overflow-x: auto">
<div style="min-width: 620px">
<div style="${GRADE_PROF}; padding: 10px 0; color: #46536e; font-size: 15px; font-weight: 700; border-bottom: 1px solid #d6deea">
<div>Profissional</div><div>Formação de mediador</div><div>Crianças</div><div>Planos combinados</div>
</div>
<div style="${GRADE_PROF}; padding: 14px 0; border-bottom: 1px solid #d6deea; align-items: center">
<strong>Camila</strong><span>${selo('Concluída', ...VERDE)}</span><span>3</span><span>2 em andamento</span>
</div>
<div style="${GRADE_PROF}; padding: 14px 0; border-bottom: 1px solid #d6deea; align-items: center">
<strong>Tânia</strong><span>${selo('Concluída', ...VERDE)}</span><span>6</span><span>6 em andamento</span>
</div>
<div style="${GRADE_PROF}; padding: 14px 0; align-items: center">
<strong>Rodrigo</strong><span>${selo('Aula 3 de 4', ...AMARELO)}</span><span>0</span><span style="color: #46536e">Atende quando concluir</span>
</div>
</div>
</div>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="${H2_I}">Crianças</h2>
<a href="#criancas" style="font-weight: 700">Ver as 9</a>
</div>
<div style="overflow-x: auto">
<div style="min-width: 620px">
<div style="${GRADE_CRI}; padding: 10px 0; color: #46536e; font-size: 15px; font-weight: 700; border-bottom: 1px solid #d6deea">
<div>Criança</div><div>Profissional</div><div>Situação</div>
</div>
<div style="${GRADE_CRI}; padding: 14px 0; border-bottom: 1px solid #d6deea; align-items: center">
<strong>Davi P., 13 anos</strong><span>Camila</span><span>${selo('Ativa, entrou na segunda', ...VERDE)}</span>
</div>
<div style="${GRADE_CRI}; padding: 14px 0; border-bottom: 1px solid #d6deea; align-items: center">
<strong>Bia L., 9 anos</strong><span>Camila</span><span>${selo('Ativa', ...VERDE)}</span>
</div>
<div style="${GRADE_CRI}; padding: 14px 0; align-items: center">
<strong>Theo M., 11 anos</strong><span>Camila</span><span>${selo('Ativa', ...VERDE)}</span>
</div>
</div>
</div>
<span style="color: #46536e; font-size: 15px">Você vê os profissionais, as crianças e a situação de cada criança. Os pagamentos de cada família ficam só com ela e com o Sistema Zero.</span>
</section>

</div>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<h2 style="${H3_I}">Precisa de você</h2>
<div style="display: flex; flex-direction: column; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid #d6deea"><span>O Rodrigo está na aula 3 de 4 da formação de mediador. Ele começa a atender quando concluir.</span><a href="#lembrar" style="font-weight: 700">Mandar um lembrete</a></div>
<div style="display: flex; flex-direction: column; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid #d6deea"><span>A página da Clínica Girassol entre as instituições parceiras está sem a foto da equipe.</span><a href="#pagina" style="font-weight: 700">Completar a página</a></div>
<div style="display: flex; flex-direction: column; gap: 6px"><span>O mural da Clínica Girassol está desligado. Se você ligar, cada família decide se o filho participa.</span><a href="#mural" style="font-weight: 700">Ver como funciona</a></div>
</section>

<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">Código das famílias</h2>
<div style="${BRICO}; font-weight: 800; font-size: 28px; letter-spacing: 0.04em; color: #ffc02e">GIRASSOL-CRIAR</div>
<span style="color: #c9d1e6">As famílias usam este código para cadastrar a criança e autorizar o acompanhamento. A clínica não recebe valor pelas inscrições.</span>
<a href="#link" style="color: #ffc02e; font-weight: 700">Copiar o link das famílias</a>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Vagas</h2>
<span><strong>Como as famílias entram:</strong> pelo código, com o plano da família a R$ 69,90 por mês, para até 2 filhos.</span>
<span>A cada 20 famílias pagantes, a clínica recebe 1 plano de cortesia para um bolsista. Hoje são 7.</span>
<a href="#programa" style="font-weight: 700">Contratar vagas pagas pela clínica</a>
<span style="color: #46536e; font-size: 15px">No programa próprio, a clínica paga R$ 49,90 por vaga ao mês, cobra da família esse mesmo valor e, à parte, o honorário pelo serviço dela. As famílias que já têm o plano pelo código continuam com ele.</span>
</section>

</aside>

</div>
</main>`,
  }),
)

// =====================================================================================
// E3 · Profissional · Combinar o plano
// =====================================================================================
const habilidade = (nome, marcado) =>
  `<label style="display: flex; align-items: center; gap: 10px; border: ${marcado ? '2px solid #0b7a54; background: #dcf0e4' : '1.5px solid #d6deea'}; border-radius: 14px; padding: 10px 16px; font-weight: 700; min-height: 50px"><input type="checkbox"${marcado ? ' checked' : ''} style="width: 20px; height: 20px">${nome}</label>`

arquivo(
  'Tela-Plano.dc.html',
  'Profissional: combinar o plano',
  F_INST,
  '#f5f7fb',
  instituicao({
    inst: CLINICA,
    nav: NAV_PROFISSIONAL,
    ativo: 'criancas',
    pessoa: 'Camila',
    papel: 'Profissional',
    main: `<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-direction: column; gap: 28px">

<div style="display: flex; flex-direction: column; gap: 4px">
<a href="#criancas" style="font-weight: 700">Crianças</a>
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 40px; line-height: 1.1">Combinar o plano do Davi P.</h1>
<span style="color: #46536e">13 anos · posto Faísca · entrou na segunda, pelo código da Clínica Girassol. O pai, Jorge, autorizou o acompanhamento no cadastro.</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<form style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">1. O objetivo, nas palavras da família</legend>
<div style="display: flex; flex-direction: column; gap: 6px"><label for="objetivo" style="font-weight: 700">O que vocês combinaram</label><input id="objetivo" type="text" value="Começar sem adiar" style="${CAMPO_I}"></div>
<span style="color: #46536e">Escreva como a família fala, em poucas palavras. A família e o Davi leem este texto. Este campo não é para diagnóstico nem para anotação clínica.</span>
</fieldset>

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">2. O que ele vai fazer</legend>
<span style="color: #46536e">São os mesmos conjuntos de aulas que as escolas usam, preparados pela equipe do Sistema Zero.</span>
${conjunto('A Chave do Farol, aulas 1 a 3', 'O começo da Jornada. Pratica pensar em passos e persistir.', true)}
${conjunto('A Chave do Farol, aulas 4 a 6', 'Pratica planejar e dividir o problema.', false)}
</fieldset>

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">3. O ritmo</legend>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px">
<div style="display: flex; flex-direction: column; gap: 6px"><label for="ritmo" style="font-weight: 700">Quantas aulas por semana</label><select id="ritmo" style="${CAMPO_I}"><option>2 aulas por semana</option></select></div>
<div style="display: flex; flex-direction: column; gap: 6px"><label for="rever" style="font-weight: 700">Rever o plano em</label><input id="rever" type="text" value="Segunda, 8 de outubro" style="${CAMPO_I}"></div>
</div>
<span style="color: #46536e">O plano não tem prazo de entrega nem nota. Ele mostra o ritmo combinado e o que foi feito.</span>
</fieldset>

<fieldset style="${CAIXA}">
<legend style="${LEGENDA}">4. Habilidades em foco</legend>
<span style="color: #46536e">Escolha até três. Você vê os registros delas com mais destaque.</span>
<div style="display: flex; gap: 12px; flex-wrap: wrap">
${habilidade('Planejar', false)}
${habilidade('Dividir o problema', false)}
${habilidade('Pensar em passos', true)}
${habilidade('Testar e corrigir', false)}
${habilidade('Persistir', true)}
${habilidade('Criar e mostrar', false)}
</div>
</fieldset>

</form>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 24px">Resumo</h2>
${resumo('Objetivo', 'Começar sem adiar')}
${resumo('O quê', 'A Chave do Farol, aulas 1 a 3')}
${resumo('Ritmo', '2 aulas por semana')}
${resumo('Em foco', 'Pensar em passos e persistir')}
<button type="button" style="${BOTAO_I}">Combinar o plano</button>
<a href="#depois" style="color: #ffc02e; font-weight: 700; text-align: center">Salvar para depois</a>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<strong>Quem fica sabendo</strong>
<span>O Jorge vê o plano na área dos pais e pode escrever para você. O Davi vê o plano no Início dele, com o ritmo da semana.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<strong>O que o plano não é</strong>
<span>Não é avaliação nem tratamento. Ele não aparece para a escola do Davi, e a plataforma não guarda anotação clínica.</span>
</section>
</aside>

</div>
</main>`,
  }),
)

// =====================================================================================
// E4 · Profissional · Crianças que atende
// =====================================================================================
const crianca = (nome, plano, estado, cor, ativa) =>
  `<a href="#crianca" style="text-decoration: none; color: #0f1a33; background: #ffffff; border: ${ativa ? '2px solid #1b5cf3' : '1px solid #d6deea'}; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 4px">
<strong style="font-size: 19px">${nome}</strong>
<span>${plano}</span>
<span style="color: ${cor}; font-weight: 700">${estado}</span>
</a>`
const barra = (nome, vezes, largura) =>
  `<div style="display: flex; flex-direction: column; gap: 6px"><div style="display: flex; justify-content: space-between; gap: 12px"><strong>${nome}</strong><span style="color: #46536e">${vezes}</span></div><div style="height: 12px; border-radius: 999px; background: #dcf0e4"><div style="width: ${largura}; height: 12px; border-radius: 999px; background: #0b7a54"></div></div></div>`

arquivo(
  'Tela-Profissional.dc.html',
  'Profissional: crianças que atende',
  F_INST,
  '#f5f7fb',
  instituicao({
    inst: CLINICA,
    nav: NAV_PROFISSIONAL,
    ativo: 'criancas',
    pessoa: 'Camila',
    papel: 'Profissional',
    main: `<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 16px">
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 30px; line-height: 1.15">Crianças que você atende</h1>
${crianca('Theo M., 11 anos', 'Plano: terminar o que começa', '2 de 2 aulas nesta semana', '#096b4a', true)}
${crianca('Bia L., 9 anos', 'Plano: pedir ajuda depois de tentar', '1 de 2 aulas nesta semana', '#46536e', false)}
${crianca('Davi P., 13 anos', 'Plano: começar sem adiar', 'Combinado hoje', '#1343b8', false)}
<div style="${CARTAO_I}; padding: 20px; display: flex; flex-direction: column; gap: 6px">
<strong>O que você não vê</strong>
<span style="color: #46536e">O que a criança faz fora do plano, a escola dela, o tempo de uso e os pagamentos da família.</span>
</div>
</aside>

<div style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px; flex: 1 1 420px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 36px; line-height: 1.1">Theo M., 11 anos</h2>
<span style="color: #46536e">Posto Construtor. A mãe, Marina, autorizou o acompanhamento em 20 de agosto, pelo código da Clínica Girassol.</span>
</div>
<button type="button" style="${BOTAO_I2}">Escrever para a família</button>
</div>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h3 style="${H3_I}">Plano combinado</h3>
<a href="#editar" style="font-weight: 700">Rever o plano</a>
</div>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 16px">
<div style="display: flex; flex-direction: column; gap: 2px"><span style="color: #46536e; font-size: 15px">Objetivo, nas palavras da família</span><strong>Terminar o que começa</strong></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="color: #46536e; font-size: 15px">Ritmo</span><strong>2 aulas por semana</strong></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="color: #46536e; font-size: 15px">Aulas</span><strong>Nave Contra Asteroides, 1 a 6</strong></div>
</div>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<h3 style="${H3_I}">Fatos desta semana</h3>
<div style="display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 8px 16px">
<strong>Segunda</strong><span>Concluiu a aula 1, A nave se move, na primeira verificação.</span>
<strong>Segunda, mais tarde</strong><span>Começou a aula 2, A nave atira, e parou depois de 2 tentativas. Voltou no mesmo dia e concluiu na quarta tentativa.</span>
</div>
<span style="color: #46536e; font-size: 15px">São registros do que o Theo fez na plataforma. A leitura é sua.</span>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; flex-direction: column; gap: 2px">
<h3 style="${H3_I}">Habilidades em foco neste mês</h3>
<span style="color: #46536e">Vezes em que ele concluiu uma parte de aula ou cumpriu um objetivo ligado a cada habilidade.</span>
</div>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px 32px">
${barra('Pensar em passos', '6 vezes', '60%')}
${barra('Testar e corrigir', '5 vezes', '50%')}
${barra('Persistir', '3 vezes', '30%')}
</div>
</section>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 24px">
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h3 style="${H3_I}">Resumo da semana</h3>
<span>Baixe os fatos da semana para levar ao atendimento ou guardar no prontuário da clínica.</span>
<button type="button" style="align-self: flex-start; ${BOTAO_I}">Exportar o resumo da semana</button>
<span style="color: #46536e; font-size: 15px">As suas anotações ficam no prontuário da clínica. A plataforma não guarda anotação clínica.</span>
</section>
<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h3 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 24px">Conversa com a família</h3>
<span style="color: #c9d1e6">Último recado da Marina, ontem:</span>
<span>"Ele travou no tiro da nave, saiu de perto, e depois voltou sozinho e terminou."</span>
<a href="#responder" style="color: #ffc02e; font-weight: 700">Responder</a>
<span style="color: #c9d1e6; font-size: 15px">Você conversa com a família. A criança não recebe recados seus.</span>
</section>
</div>

</div>
</main>`,
  }),
)
