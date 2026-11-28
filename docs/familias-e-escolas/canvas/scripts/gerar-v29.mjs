// Versão 2.9: C7 o ranking da escola visto pelo aluno (quando a gestão liga) e E6 as vagas e famílias na coordenação.
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const projeto = RAIZ + '/project'
const LOGO_ESCURO = '/_blob/b071f94b0478ee7c6b96469a94dbe0b1'
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

// =====================================================================================
// C7 · Aluno · Ranking da escola
// =====================================================================================
const CARTAO_K = 'background: #ffffff; border-radius: 24px; box-shadow: 0 8px 22px rgba(28,48,90,0.1)'
const itensAluno = [['Início', false], ['Cursos', false], ['Mural da escola', false], ['Ranking da escola', true], ['Recados', false], ['Meu espaço', false]]
  .map(([rotulo, ativo]) =>
    ativo
      ? `<a href="#m" style="background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`
      : `<a href="#m" style="color: #cbd4e8; text-decoration: none; font-weight: 700; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`,
  )
  .join('\n')
const lugar = (posicao, nome, turma, xp, cor) => `<div style="display: flex; align-items: center; gap: 16px; background: #eff3f9; border-radius: 18px; padding: 14px 18px">
<div style="width: 52px; height: 52px; min-width: 52px; border-radius: 50%; background: ${cor}; color: #121a30; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 24px">${posicao}</div>
<div style="display: flex; flex-direction: column; line-height: 1.3; flex: 1 1 auto"><strong style="font-size: 19px">${nome}</strong><span style="color: #46536e">${turma}</span></div>
<strong>${xp}</strong>
</div>`

arquivo(
  'Tela-Ranking.dc.html',
  'Aluno: ranking da escola',
  F_KIDS,
  '#e9eef6',
  `<div style="font-family: 'Nunito', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #e9eef6; display: flex; flex-wrap: wrap">

<nav style="flex: 1 1 268px; max-width: 100%; background: #121a30; color: #cbd4e8; padding: 28px 20px; display: flex; flex-direction: column; gap: 24px">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 180px; height: auto">
<div style="display: flex; align-items: center; gap: 12px; background: #1b2540; border-radius: 16px; padding: 10px 12px">
<div style="width: 40px; height: 40px; min-width: 40px; border-radius: 10px; background: #0b7a54; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 17px">CA</div>
<div style="display: flex; flex-direction: column; line-height: 1.25"><strong style="color: #ffffff">Colégio Araucária</strong><span style="font-size: 15px">6º ano B</span></div>
</div>
<div style="display: flex; flex-direction: column; gap: 6px">
${itensAluno}
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

<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1">Ranking da escola</h1>
<span style="font-size: 19px; color: #46536e">Os primeiros lugares do 6º e do 7º ano nesta semana, e onde você está.</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<section style="flex: 999 1 520px; min-width: 0; ${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 26px">Os primeiros lugares</h2>
${lugar('1º', 'Rafael L.', '6º ano B', '320 XP', '#ffc02e')}
${lugar('2º', 'Júlia F.', '7º ano A', '300 XP', '#cbd4e8')}
${lugar('3º', 'Miguel T.', '7º ano B', '290 XP', '#e9b98a')}
<div style="display: flex; align-items: center; gap: 16px; background: #e2ebff; border: 2px solid #1b5cf3; border-radius: 18px; padding: 14px 18px; margin-top: 8px">
<div style="width: 52px; height: 52px; min-width: 52px; border-radius: 50%; background: #1b5cf3; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 22px">12º</div>
<div style="display: flex; flex-direction: column; line-height: 1.3; flex: 1 1 auto"><strong style="font-size: 19px">Você</strong><span style="color: #46536e">6º ano B</span></div>
<strong>180 XP</strong>
</div>
<span style="color: #46536e">A lista mostra só os três primeiros e a sua posição.</span>
</section>

<aside style="flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">Como funciona</h2>
<span>Conta o que você fez nas aulas e nas tarefas na semana. Toda segunda começa de novo.</span>
</section>
<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">Quem vê</h2>
<span>Só os alunos do 6º e do 7º ano do Colégio Araucária. Ninguém de fora da escola.</span>
</section>
</aside>

</div>
</main>
</div>`,
)

// =====================================================================================
// E6 · Coordenação · Vagas e famílias
// =====================================================================================
const CARTAO_I = 'background: #ffffff; border: 1px solid #d6deea; border-radius: 20px; box-shadow: 0 4px 0 #d6deea'
const BOTAO_I2 = 'min-height: 50px; padding: 0 22px; border: 1.5px solid #74829f; border-radius: 12px; background: #ffffff; color: #0f1a33; font-family: inherit; font-size: 17px; font-weight: 700'
const H2_I = `margin: 0; ${BRICO}; font-weight: 700; font-size: 26px; line-height: 1.2`
const H3_I = `margin: 0; ${BRICO}; font-weight: 700; font-size: 22px; line-height: 1.2`
const navCoord = [['Início', false], ['Crianças', false], ['Profissionais', false], ['Vagas', true], ['Aparelhos', false], ['Formação', false]]
  .map(([rotulo, ativo]) =>
    ativo
      ? `<a href="#n" style="color: #0b0e1a; background: #ffc02e; text-decoration: none; font-weight: 700; padding: 10px 16px; border-radius: 10px">${rotulo}</a>`
      : `<a href="#n" style="color: #f2f4fa; text-decoration: none; font-weight: 600; padding: 10px 16px; border-radius: 10px">${rotulo}</a>`,
  )
  .join('\n')
const GF = '1.1fr 0.9fr 1fr 1fr'
const linhaF = (cols, ultima) =>
  `<div style="display: grid; grid-template-columns: ${GF}; gap: 12px; padding: 14px 0; ${ultima ? '' : 'border-bottom: 1px solid #d6deea; '}align-items: center">\n${cols.map((c, i) => (i === 0 ? `<strong>${c}</strong>` : `<span>${c}</span>`)).join('')}\n</div>`
const tirar = '<a href="#tirar" style="font-weight: 700">Tirar do espaço</a>'

arquivo(
  'Tela-VagasInst.dc.html',
  'Coordenação: vagas e famílias',
  F_INST,
  '#f5f7fb',
  `<div style="font-family: 'Atkinson Hyperlegible Next', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #f5f7fb">

<header style="background: #0b0e1a; color: #f2f4fa">
<div style="max-width: 1360px; margin: 0 auto; padding: 14px 40px; display: flex; align-items: center; gap: 28px; flex-wrap: wrap">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 170px; height: auto">
<div style="display: flex; align-items: center; gap: 10px; background: #1a2040; border: 1px solid #2c3563; border-radius: 12px; padding: 6px 14px 6px 6px">
<div style="width: 36px; height: 36px; border-radius: 9px; background: #6d3bf5; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BRICO}; font-weight: 800; font-size: 16px">CG</div>
<strong>Clínica Girassol</strong>
</div>
<nav style="display: flex; gap: 6px; flex-wrap: wrap; flex: 1 1 420px">
${navCoord}
</nav>
<div style="display: flex; align-items: center; gap: 10px">
<div style="width: 40px; height: 40px; border-radius: 50%; background: #6e9bff; color: #0b0e1a; display: flex; align-items: center; justify-content: center; font-weight: 700">S</div>
<div style="display: flex; flex-direction: column; line-height: 1.2"><strong>Sílvia</strong><span style="color: #c9d1e6; font-size: 14px">Coordenadora</span></div>
</div>
</div>
</header>

<main style="max-width: 1360px; margin: 0 auto; padding: 40px 40px 64px; display: flex; flex-direction: column; gap: 28px">

<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 40px; line-height: 1.1">Vagas e famílias</h1>
<span style="color: #46536e">Quem entrou pelo código da clínica, o plano de cortesia, o mural e a página da clínica.</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 620px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
<h2 style="${H2_I}">Quem entrou pelo código</h2>
<a href="#todas" style="font-weight: 700">Ver as 9</a>
</div>
<div style="overflow-x: auto"><div style="min-width: 620px">
<div style="display: grid; grid-template-columns: ${GF}; gap: 12px; padding: 10px 0; color: #46536e; font-size: 15px; font-weight: 700; border-bottom: 1px solid #d6deea">
<div>Criança</div><div>Profissional</div><div>Entrou em</div><div></div>
</div>
${linhaF(['Davi P., 13 anos', 'Camila', '10 de setembro', tirar])}
${linhaF(['Theo M., 11 anos', 'Camila', '20 de agosto', tirar])}
${linhaF(['Bia L., 9 anos', 'Camila', '16 de abril', tirar], true)}
</div></div>
<span style="color: #46536e; font-size: 15px">Tirar do espaço encerra o acompanhamento em até 15 minutos. Se a família tem o plano pelo código da clínica, o preço do código vale até o fim do período pago.</span>
</section>

<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_I}">Programa próprio</h2>
<span>Hoje as famílias da clínica pagam o plano pelo código. Se a clínica preferir pagar as vagas, o valor é de R$ 49,90 por criança ao mês, com o que o acesso pago pela escola traz: as aulas, as ferramentas dentro das aulas e os cursos para pais.</span>
<span>As famílias que já têm o plano pelo código continuam com ele. O termo de parceria ganha um anexo de vagas.</span>
<button type="button" style="align-self: flex-start; ${BOTAO_I2}">Pedir a proposta do programa próprio</button>
</section>

</div>

<aside style="flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #121733; color: #f2f4fa; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">Plano de cortesia</h2>
<span style="color: #c9d1e6">7 famílias pagantes. Faltam 13 para o primeiro plano de cortesia. Quando chegar a 20, você escolhe aqui a criança que vai receber.</span>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Mural da clínica</h2>
<span><strong>Desligado.</strong> Se você ligar, cada família decide, na área dos pais, se o filho participa. Quem não autorizar não aparece.</span>
<label style="display: flex; align-items: center; gap: 12px; background: #eff3f9; border-radius: 14px; padding: 12px 16px; font-weight: 700"><input type="checkbox" style="width: 22px; height: 22px">Ligar o mural da Clínica Girassol</label>
</section>
<section style="${CARTAO_I}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="${H3_I}">Página da clínica</h2>
<span>A Clínica Girassol aparece na página das instituições parceiras do Sistema Zero. Falta a foto da equipe.</span>
<a href="#pagina" style="font-weight: 700">Completar a página</a>
</section>
</aside>

</div>
</main>
</div>`,
)
