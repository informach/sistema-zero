// Versão 2.5: as quatro telas que faltavam.
// B9 Planos (área dos pais), B10 O que a clínica vê, A7 Vagas e cobrança (Admin), E5 a criança no aparelho da clínica.
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const projeto = RAIZ + '/project'
const LOGO_ESCURO = '/_blob/b071f94b0478ee7c6b96469a94dbe0b1'
const F_KIDS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap'
const BALOO = "font-family: 'Baloo 2', system-ui, sans-serif"
const BRICO = "font-family: 'Bricolage Grotesque', system-ui, sans-serif"
const CARTAO_K = 'background: #ffffff; border-radius: 24px; box-shadow: 0 8px 22px rgba(28,48,90,0.1)'
const BOTAO_K = 'display: inline-flex; align-items: center; height: 52px; padding: 0 30px; border-radius: 999px; background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; box-shadow: 0 4px 0 #1343b8'
const H1_K = `margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1`
const H2_K = `margin: 0; ${BALOO}; font-weight: 800; font-size: 26px; line-height: 1.15`

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

function pais(ativo, conteudo) {
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
${item('Theo', 'theo', true)}
${item('Lia', 'lia', true)}
${item('Cursos para pais', 'cursos')}
${item('Oficinas ao vivo', 'oficinas')}
${item('Conta', 'conta')}
${item('Ajuda', 'ajuda')}
</div>
<div style="margin-top: auto; display: flex; flex-direction: column; gap: 14px">
<a href="#crianca" style="display: flex; align-items: center; justify-content: center; height: 48px; border-radius: 999px; background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; box-shadow: 0 4px 0 #1343b8">Ir para a área da criança</a>
<div style="display: flex; flex-direction: column; background: #1b2540; border-radius: 16px; padding: 12px 16px; line-height: 1.3"><strong style="color: #ffffff">Marina</strong><span style="font-size: 15px">Responsável</span></div>
</div>
</nav>

<main style="flex: 999 1 640px; min-width: 0; padding: 40px 44px 56px; display: flex; flex-direction: column; gap: 24px">
${conteudo}
</main>
</div>`
}

// =====================================================================================
// B9 · Pais · Planos
// =====================================================================================
const lista = (itens) => `<ul style="margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px">\n${itens.map((i) => `<li>${i}</li>`).join('\n')}\n</ul>`
const degrau = ({ borda, selo, nome, preco, itens, rodape }) => `<section style="background: #ffffff; border-radius: 24px; ${borda}; box-shadow: 0 8px 22px rgba(28,48,90,0.1); padding: 28px; display: flex; flex-direction: column; gap: 14px">
${selo}
<h2 style="${H2_K}">${nome}</h2>
<div style="${BALOO}; font-weight: 800; font-size: 30px; line-height: 1.1">${preco}</div>
${lista(itens)}
<div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px">${rodape}</div>
</section>`

arquivo(
  'Tela-Planos.dc.html',
  'Área dos pais: planos',
  F_KIDS,
  '#eff3f9',
  pais(
    'conta',
    `
<a href="#conta" style="font-weight: 800">← Conta</a>

<div style="display: flex; flex-direction: column; gap: 4px; max-width: 860px">
<h1 style="${H1_K}">Planos</h1>
<span style="font-size: 19px; color: #46536e">São três degraus, e você paga só um: o mais alto que escolher.</span>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 24px">
${degrau({
  borda: 'border: 2px solid transparent',
  selo: '<span style="align-self: flex-start; background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 14px">Pago pelo Colégio Araucária</span>',
  nome: 'Só com a escola',
  preco: 'Sem custo para você',
  itens: ['As aulas e as tarefas do Theo, na escola e em casa', 'As ferramentas dentro das aulas', 'O mural da escola', 'Os cursos para pais'],
  rodape: '<span style="color: #46536e">É o que o Theo tem pelo 6º ano B.</span>',
})}
${degrau({
  borda: 'border: 3px solid #1b5cf3',
  selo: '<span style="align-self: flex-start; background: #1b5cf3; color: #ffffff; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 14px">O seu plano</span>',
  nome: 'Plano pelo código',
  preco: 'R$ 69,90 por mês',
  itens: ['Tudo o que a escola dá', 'Estúdio, Pinta, Pensa e Molda livres, para criar à vontade', 'Até 2 filhos', 'A Lia no contraturno e o acompanhamento da Clínica Girassol', 'Ou 6 meses por R$ 399, no Pix'],
  rodape: '<a href="#cancelar" style="font-weight: 800">Cancelar o plano</a>',
})}
${degrau({
  borda: 'border: 2px solid transparent',
  selo: '<span style="align-self: flex-start; background: #f8e4ee; color: #8e1650; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 14px">O mais completo</span>',
  nome: 'Plano de R$ 97',
  preco: 'R$ 97 por mês',
  itens: ['Tudo do plano pelo código', 'O Arquipélago e o ranking geral', 'O Mural e o Clube dos Criadores, com famílias do Brasil inteiro', 'Não depende de escola nem de instituição', 'Ou R$ 970 por ano'],
  rodape: `<a href="#trocar" style="align-self: flex-start; ${BOTAO_K}">Passar para este plano</a>`,
})}
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 24px">
<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 22px; line-height: 1.2">Se você passar para o plano de R$ 97</h2>
<span><strong>Hoje você paga R$ 27,10,</strong> que é a diferença deste mês. A partir de 3 de outubro, R$ 97 por mês.</span>
<span>Você digita o cartão de novo. Por segurança, o Sistema Zero não guarda o número.</span>
</section>
<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 22px; line-height: 1.2">Se você cancelar o plano</h2>
<span>O Theo continua com as aulas e as tarefas, pela escola, sem as ferramentas livres e sem o acompanhamento da clínica. A Lia sai do contraturno no fim do mês pago. Tudo o que eles criaram fica guardado.</span>
</section>
</div>

<span style="color: #46536e">O plano pelo código custa R$ 69,90 enquanto a sua família estiver ligada a uma escola ou a uma instituição parceira.</span>
<span style="color: #46536e">Tem mais de 2 filhos? Cada criança a mais entra com um perfil extra, por R$ 39,90 por mês. <a href="#extra" style="font-weight: 800">Incluir mais uma criança</a></span>`,
  ),
)

// =====================================================================================
// B10 · Pais · O que a clínica vê
// =====================================================================================
arquivo(
  'Tela-ClinicaVe.dc.html',
  'Área dos pais: o que a clínica vê',
  F_KIDS,
  '#eff3f9',
  pais(
    'familia',
    `
<a href="#inicio" style="font-weight: 800">← Início</a>

<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap">
<div style="width: 60px; height: 60px; min-width: 60px; border-radius: 16px; background: #6d3bf5; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 26px">CG</div>
<div style="display: flex; flex-direction: column; gap: 2px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 40px; line-height: 1.1">O que a Clínica Girassol vê</h1>
<span style="color: #46536e">Theo, com a Camila. Você autorizou em 20 de agosto.</span>
</div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 24px">
<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_K}; color: #096b4a">A clínica vê</h2>
${lista(['O posto do Theo na Jornada do Criador.', 'O plano que vocês combinaram.', 'As aulas desse plano, com os projetos delas.', 'As habilidades praticadas nessas aulas.', 'Os recados que você trocar com a Camila.'])}
</section>
<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<h2 style="${H2_K}; color: #a32a22">A clínica não vê</h2>
${lista(['O que ele faz fora do plano.', 'A escola dele e as tarefas da escola.', 'O tempo de uso e os aparelhos de casa.', 'Os seus pagamentos.', 'Nenhuma conversa com o Theo: a Camila fala só com você.'])}
</section>
</div>

<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 14px">
<h2 style="${H2_K}">Quem são as pessoas com acesso</h2>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 16px">
<div style="background: #eff3f9; border-radius: 16px; padding: 16px; display: flex; flex-direction: column"><strong>Camila</strong><span>Profissional. Vê o plano combinado e os fatos da semana do Theo.</span></div>
<div style="background: #eff3f9; border-radius: 16px; padding: 16px; display: flex; flex-direction: column"><strong>Sílvia</strong><span>Coordenadora. Vê só que o Theo é acompanhado e por quem.</span></div>
</div>
</section>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 24px">
<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<strong style="font-size: 19px">Mural da Clínica Girassol</strong>
<span>O mural da clínica está desligado. Se a clínica ligar, o Theo só participa se você deixar.</span>
<label style="display: flex; gap: 12px; align-items: flex-start; background: #eff3f9; border-radius: 16px; padding: 14px 16px"><input type="checkbox" style="width: 22px; height: 22px; min-width: 22px; margin-top: 2px"><span>Deixar o Theo participar do mural da clínica. As outras famílias da clínica vão ver os jogos dele e saber que ele é atendido ali.</span></label>
</section>
<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<strong style="font-size: 19px">Encerrar o acompanhamento</strong>
<span>A Camila deixa de ver o Theo em até 15 minutos. O plano da família não muda, porque ele vem do código do Colégio Araucária.</span>
<a href="#encerrar" style="font-weight: 800">Encerrar o acompanhamento</a>
</section>
</div>`,
  ),
)

// =====================================================================================
// A7 · Equipe · Vagas e cobrança (usa a moldura do Admin que já está em A1)
// =====================================================================================
const GRADE_COB = 'display: grid; grid-template-columns: 1.3fr 1.5fr 1fr 0.8fr 0.9fr 1.3fr 1.2fr; gap: 12px'
const selo = (texto, fundo, cor) => `<span style="background: ${fundo}; color: ${cor}; border-radius: 999px; padding: 3px 12px; font-weight: 700; font-size: 14px">${texto}</span>`
const linhaCob = (cols, ultima) =>
  `<div style="${GRADE_COB}; padding: 14px 0; ${ultima ? '' : 'border-bottom: 1px solid #d6deea; '}align-items: center">\n${cols.map((c, i) => (i === 0 ? `<strong>${c}</strong>` : `<span>${c}</span>`)).join('')}\n</div>`
const CARTAO_A = 'background: #ffffff; border: 1px solid #d6deea; border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 10px'

const mainCobranca = `<main style="flex: 999 1 640px; min-width: 0; padding: 32px 36px 48px; display: flex; flex-direction: column; gap: 22px">

<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 34px; line-height: 1.1">Vagas e cobrança</h1>
<span style="color: #46536e">A conta de cada instituição no mês, pelos alunos ativos no dia 1º.</span>
</div>
<label style="display: flex; align-items: center; gap: 10px; font-weight: 700">Mês<select style="height: 44px; border: 1.5px solid #74829f; border-radius: 12px; padding: 0 12px; font-family: inherit; font-size: 16px; color: #0f1a33; background: #ffffff"><option>Setembro de 2029</option></select></label>
</div>

<section style="background: #ffffff; border: 1px solid #d6deea; border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 6px">
<div style="overflow-x: auto">
<div style="min-width: 1000px">
<div style="${GRADE_COB}; padding: 10px 0; color: #46536e; font-size: 14px; font-weight: 700; border-bottom: 1px solid #d6deea">
<div>Instituição</div><div>Como contrata</div><div>Ativos no dia 1º</div><div>Valor</div><div>Total do mês</div><div>Pix</div><div>Nota fiscal</div>
</div>
${linhaCob(['Colégio Araucária', 'Grade, paga pela escola', '118 alunos', 'R$ 39,90', 'R$ 4.708,20', selo('Recebido no dia 5', '#dcf0e4', '#096b4a'), '<a href="#nota" style="font-weight: 700">Nota nº 142</a>'])}
${linhaCob(['Ateliê Curumim', 'Programa próprio, pago pela instituição', '22 crianças', 'R$ 49,90', 'R$ 1.097,80', selo('Aguardando', '#fff3c4', '#5c4000'), '<a href="#registrar" style="font-weight: 700">Registrar o Pix</a>'])}
${linhaCob(['Clínica Girassol', 'As famílias pagam pelo código', '7 famílias pagantes', 'Sem cobrança', 'Sem cobrança', 'Sem cobrança', 'Sem nota'])}
${linhaCob(['Colégio Ipê', 'Contraturno', 'Preparando', 'Sem cobrança', 'Sem cobrança', 'Sem cobrança', 'Sem nota'], true)}
</div>
</div>
</section>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 22px">
<section style="${CARTAO_A}">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">Como a conta é feita</h2>
<span>Contam os alunos ativos no dia 1º. Quem entra no meio do mês conta a partir do mês seguinte.</span>
<span>A escola na grade paga R$ 39,90 por aluno com 50 alunos ou mais, e R$ 49,90 abaixo disso. A instituição que paga as vagas paga R$ 49,90.</span>
</section>
<section style="${CARTAO_A}">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">Planos de cortesia</h2>
<span><strong>Colégio Araucária:</strong> 22 famílias pagantes no contraturno, 1 plano de cortesia. Bolsista ainda não indicado.</span>
<span><strong>Clínica Girassol:</strong> 7 famílias pagantes. Faltam 13 para o primeiro plano de cortesia.</span>
</section>
<section style="${CARTAO_A}; background: #fff3c4; border-color: #fff3c4">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 22px">Nesta fase</h2>
<span>A equipe confere o Pix e emite a nota fiscal para CNPJ à mão, no emissor nacional. Esta tela guarda o registro. A cobrança feita pelo sistema fica para quando houver mais instituições.</span>
</section>
</div>

</main>`

{
  let s = readFileSync(join(projeto, 'Tela-Admin.dc.html'), 'utf8')
  const troca = (de, para) => {
    if (s.split(de).length !== 2) throw new Error(`Admin: nao casou: ${de.slice(0, 60)}`)
    s = s.replace(de, () => para)
  }
  troca(
    '<a href="#instituicoes" style="background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 700; padding: 8px 12px; border-radius: 10px">Escolas e parceiras</a>',
    '<a href="#instituicoes" style="color: #cbd4e8; text-decoration: none; padding: 8px 12px; border-radius: 10px">Escolas e parceiras</a>',
  )
  troca(
    '<a href="#cobranca" style="color: #cbd4e8; text-decoration: none; padding: 8px 12px; border-radius: 10px">Vagas e cobrança</a>',
    '<a href="#cobranca" style="background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 700; padding: 8px 12px; border-radius: 10px">Vagas e cobrança</a>',
  )
  s = s.replace('background: #e9eef6; display: flex; flex-wrap: wrap">', 'background: #e9eef6; display: flex; flex-wrap: wrap; min-height: 900px">')
  const a = s.indexOf('<main')
  const b = s.indexOf('</main>') + '</main>'.length
  if (a === -1 || b < a) throw new Error('Admin: sem <main>')
  s = s.slice(0, a) + mainCobranca + s.slice(b)
  s = s.replace(/<title>[^<]*<\/title>/, '<title>Admin: vagas e cobrança</title>')
  s = s.replace(/"\$preview":\{"width":1440,"height":\d+\}/, '"$preview":{"width":1440,"height":1200}')
  writeFileSync(join(projeto, 'Tela-Cobranca.dc.html'), s)
  console.log('escrita: Tela-Cobranca.dc.html')
}

// =====================================================================================
// E5 · Criança · No aparelho da clínica
// =====================================================================================
const itemMenu = (rotulo, ativo) =>
  ativo
    ? `<a href="#m" style="background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`
    : `<a href="#m" style="color: #cbd4e8; text-decoration: none; font-weight: 700; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`

arquivo(
  'Tela-ClinicaAluno.dc.html',
  'Criança: no aparelho da clínica',
  F_KIDS,
  '#e9eef6',
  `<div style="font-family: 'Nunito', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #e9eef6; display: flex; flex-wrap: wrap">

<nav style="flex: 1 1 268px; max-width: 100%; background: #121a30; color: #cbd4e8; padding: 28px 20px; display: flex; flex-direction: column; gap: 24px">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 180px; height: auto">
<div style="display: flex; align-items: center; gap: 12px; background: #1b2540; border-radius: 16px; padding: 10px 12px">
<div style="width: 40px; height: 40px; min-width: 40px; border-radius: 10px; background: #6d3bf5; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 17px">CG</div>
<div style="display: flex; flex-direction: column; line-height: 1.25"><strong style="color: #ffffff">Clínica Girassol</strong><span style="font-size: 15px">com a Camila</span></div>
</div>
<div style="display: flex; flex-direction: column; gap: 6px">
${itemMenu('Início', true)}
${itemMenu('Cursos', false)}
${itemMenu('Meu espaço', false)}
</div>
<div style="margin-top: auto; display: flex; flex-direction: column; gap: 14px">
<a href="#comofazer" style="color: #cbd4e8; text-decoration: none; font-weight: 700; padding: 0 16px">Como fazer</a>
<div style="display: flex; align-items: center; gap: 12px; background: #1b2540; border-radius: 16px; padding: 12px">
<div style="width: 44px; height: 44px; min-width: 44px; border-radius: 50%; background: #9ec5ff; color: #121a30; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 22px">B</div>
<div style="display: flex; flex-direction: column; line-height: 1.25"><strong style="color: #ffffff">Bia</strong><span style="font-size: 15px">Faísca · 380 XP</span></div>
</div>
</div>
</nav>

<main style="flex: 999 1 640px; min-width: 0; padding: 40px 44px 56px; display: flex; flex-direction: column; gap: 28px">

<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="${H1_K}">Oi, Bia!</h1>
<span style="font-size: 19px; color: #46536e">Hoje você está na Clínica Girassol. Vamos continuar o seu plano combinado?</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<section style="flex: 999 1 520px; min-width: 0; ${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 16px">
<span style="align-self: flex-start; background: #dcf0e4; color: #096b4a; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Plano combinado com a Camila</span>
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 32px; line-height: 1.15">Pedir ajuda depois de tentar</h2>
<span style="color: #46536e">A Chave do Farol, aulas 4 a 6. O combinado são 2 aulas por semana.</span>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 12px">
<div style="background: #dcf0e4; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column"><strong style="color: #096b4a">Aula 4</strong><span>Feita nesta semana!</span></div>
<div style="background: #eff3f9; border: 2px solid #1b5cf3; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column"><strong style="color: #1343b8">Aula 5</strong><span>É a sua vez.</span></div>
<div style="background: #eff3f9; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column"><strong style="color: #46536e">Aula 6</strong><span>Vem depois.</span></div>
</div>
<a href="#continuar" style="align-self: flex-start; ${BOTAO_K}">Continuar a aula 5</a>
</section>

<aside style="flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">O que você praticou</h2>
<div style="display: flex; gap: 8px; flex-wrap: wrap">
<span style="background: #ffffff; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Planejar</span>
<span style="background: #ffffff; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Persistir</span>
</div>
<span>Você tentou 2 vezes antes de pedir uma pista. Foi o combinado!</span>
</section>
<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 10px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">Jornada do Criador</h2>
<span><strong>Hoje:</strong> Faísca</span>
<span><strong>Próxima conquista:</strong> Construtor</span>
<div style="height: 12px; border-radius: 999px; background: #eff3f9"><div style="width: 45%; height: 12px; border-radius: 999px; background: #1b5cf3"></div></div>
</section>
</aside>

</div>
</main>
</div>`,
)
