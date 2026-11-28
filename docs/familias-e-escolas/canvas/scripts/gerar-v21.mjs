// Versão 2.1: a prancha "Quem paga em cada situação" e três telas novas
// (família que já é cliente usando o bilhete, Conta na área dos pais e o Início do aluno em casa).
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

// =====================================================================================
// B2 · Família que já é cliente · Usar o bilhete da escola
// =====================================================================================
const CARTAO_K = 'background: #ffffff; border-radius: 24px; box-shadow: 0 8px 22px rgba(28,48,90,0.1)'
const LEGENDA_K = `padding: 0; ${BALOO}; font-weight: 800; font-size: 26px; margin-bottom: 12px`

arquivo(
  'Tela-JaAssina.dc.html',
  'Família que já é cliente: usar o bilhete da escola',
  F_KIDS,
  '#e9eef6',
  `<div style="font-family: 'Nunito', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #e9eef6">

<header style="background: #ffffff; border-bottom: 1px solid #d6deea">
<div style="max-width: 1200px; margin: 0 auto; padding: 18px 40px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap">
<img src="${LOGO_CLARO}" alt="Sistema Zero" style="width: 200px; height: auto">
<span style="color: #46536e; font-weight: 700">com</span>
<div style="display: flex; align-items: center; gap: 10px">
<div style="width: 44px; height: 44px; border-radius: 12px; background: #0b7a54; color: #ffffff; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 20px">CA</div>
<strong style="font-size: 18px">Colégio Araucária</strong>
</div>
<span style="margin-left: auto; color: #46536e">Você entrou como <strong style="color: #0f1a33">Fernanda</strong></span>
</div>
</header>

<main style="max-width: 1200px; margin: 0 auto; padding: 48px 40px 72px; display: flex; flex-direction: column; gap: 36px">

<div style="display: flex; flex-direction: column; gap: 12px; max-width: 860px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 46px; line-height: 1.1">A Júlia agora tem acesso pelo Colégio Araucária</h1>
<p style="margin: 0; font-size: 20px; color: #46536e">Você já é cliente do Sistema Zero. Use o bilhete para ligar a Júlia à turma do 7º ano A. Ela continua com tudo o que já fez, e nada muda na sua assinatura.</p>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start">

<form style="flex: 999 1 560px; min-width: 0; ${CARTAO_K}; padding: 36px; display: flex; flex-direction: column; gap: 32px">

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px">
<legend style="${LEGENDA_K}">1. O bilhete</legend>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px">
<div style="display: flex; flex-direction: column; gap: 6px"><label for="codigo" style="font-weight: 700">Código que veio no bilhete</label><input id="codigo" type="text" value="P4T8-W6HN-3C" style="height: 52px; border: 2px solid #0b7a54; border-radius: 14px; padding: 0 16px; font-family: inherit; font-size: 18px; font-weight: 800; letter-spacing: 0.06em; color: #0f1a33; width: 100%"></div>
<div style="display: flex; flex-direction: column; gap: 6px"><label for="nascimento" style="font-weight: 700">Data de nascimento da sua filha</label><input id="nascimento" type="text" value="09/02/2017" style="height: 52px; border: 2px solid #0b7a54; border-radius: 14px; padding: 0 16px; font-family: inherit; font-size: 18px; color: #0f1a33; width: 100%"></div>
</div>
<span style="color: #096b4a; font-weight: 700">Tudo certo: Júlia F., 7º ano A.</span>
</fieldset>

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px">
<legend style="${LEGENDA_K}">2. Quem é a Júlia na sua conta</legend>
<label style="display: flex; align-items: center; gap: 12px; border: 2px solid #1b5cf3; background: #eff3f9; border-radius: 16px; padding: 14px 18px; font-weight: 700; min-height: 56px"><input type="radio" name="perfil" checked style="width: 20px; height: 20px">Júlia, 12 anos, Inventora: o perfil que ela já usa</label>
<label style="display: flex; align-items: center; gap: 12px; border: 1.5px solid #d6deea; border-radius: 16px; padding: 14px 18px; font-weight: 700; min-height: 56px"><input type="radio" name="perfil" style="width: 20px; height: 20px">O perfil novo, que a escola criou para ela</label>
<span style="color: #46536e">A turma passa a usar o perfil que a Júlia já tem. Ela não fica com dois perfis e não perde nada do que criou.</span>
</fieldset>

<fieldset style="border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px">
<legend style="${LEGENDA_K}">3. O que muda no que você paga</legend>
<div style="background: #dcf0e4; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 10px">
<div style="display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap">
<span style="color: #46536e; font-weight: 700">Você continua pagando</span>
<span style="${BALOO}; font-weight: 800; font-size: 34px; line-height: 1.1; color: #096b4a">R$ 97 por mês</span>
</div>
<span>A escola passa a pagar as aulas e as tarefas da Júlia. A sua assinatura continua dando o que a escola não dá: as ferramentas livres para criar em casa, o segundo filho, o Arquipélago, o ranking geral e o Mural e o Clube dos Criadores.</span>
<span>Se preferir pagar menos, as famílias do Colégio Araucária têm o plano pelo código da escola, de R$ 69,90. Ele mantém as ferramentas livres e o segundo filho, sem o Arquipélago, o ranking geral e o Mural e o Clube dos Criadores. A troca é feita em Conta, na tela Planos.</span>
</div>
<span style="color: #46536e">Se preferir ficar só com o que a escola paga, você cancela o plano quando quiser, em Conta. Nada é cancelado nem cobrado sem você pedir.</span>
</fieldset>

<div style="display: flex; flex-direction: column; gap: 14px">
<label style="display: flex; gap: 12px; align-items: flex-start"><input type="checkbox" checked style="width: 22px; height: 22px; min-width: 22px; margin-top: 2px"><span>Sou responsável pela Júlia.</span></label>
<button type="button" style="align-self: flex-start; height: 52px; padding: 0 32px; border: 0; border-radius: 999px; background: #1b5cf3; color: #ffffff; font-family: inherit; font-size: 17px; font-weight: 800; box-shadow: 0 4px 0 #1343b8">Ligar a Júlia ao 7º ano A</button>
</div>
</form>

<aside style="flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 20px">
<div style="background: #121a30; color: #ffffff; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 14px">
<div style="font-size: 14px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #cbd4e8">O que muda para a Júlia</div>
<ul style="margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px">
<li>Na escola, ela entra com o crachá e encontra a Jornada do jeito que deixou</li>
<li>As tarefas do professor Caio aparecem no Início dela</li>
<li>Em casa, ela continua com a Jornada, os projetos e as ferramentas</li>
</ul>
</div>
<div style="background: #fff3c4; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 8px">
<strong>A conversa com o Zappy</strong>
<span>Como o acesso passa a ser da escola, vale a regra da escola também em casa: no 7º ano, a conversa só funciona quando o professor liga na aula. As falas do Zappy dentro das aulas continuam iguais.</span>
</div>
<div style="background: #ffffff; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 8px">
<strong>O que a escola vê</strong>
<span>O posto da Júlia e o que ela fizer nas aulas das tarefas da escola. O resto do que ela cria continua sendo só da família.</span>
<a href="#escolave" style="font-weight: 800">Ver a lista completa</a>
</div>
</aside>

</div>
</main>
</div>`,
)

// =====================================================================================
// Molduras da área dos pais e do aluno em casa
// =====================================================================================
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

const H2_K = `margin: 0; ${BALOO}; font-weight: 800; font-size: 26px; line-height: 1.15`
const filho = (inicial, cor, nome, lugar, quem, detalhe, acoes) => `<div style="display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; background: #eff3f9; border-radius: 20px; padding: 20px">
<div style="width: 56px; height: 56px; min-width: 56px; border-radius: 50%; background: ${cor}; color: #121a30; display: flex; align-items: center; justify-content: center; ${BALOO}; font-weight: 800; font-size: 26px">${inicial}</div>
<div style="flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 4px">
<strong style="font-size: 20px">${nome}</strong>
<span>${lugar}</span>
<span><strong>${quem}</strong></span>
<span style="color: #46536e">${detalhe}</span>
${acoes}
</div>
</div>`

// =====================================================================================
// B8 · Pais · Conta
// =====================================================================================
arquivo(
  'Tela-Conta.dc.html',
  'Área dos pais: Conta',
  F_KIDS,
  '#eff3f9',
  pais(
    'conta',
    `
<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1">Conta</h1>
<span style="font-size: 19px; color: #46536e">De onde vem o acesso dos seus filhos, o que você paga e os seus dados.</span>
</div>

<section style="background: #dcf0e4; border-radius: 24px; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap">
<div style="display: flex; flex-direction: column; gap: 4px">
<span style="color: #096b4a; font-weight: 800">Você paga hoje</span>
<span style="${BALOO}; font-weight: 800; font-size: 40px; line-height: 1.05">R$ 69,90 por mês</span>
<span>É o plano pelo código do Colégio Araucária, para até 2 filhos. O plano de R$ 97 acrescenta o Arquipélago, o ranking geral e o Mural e o Clube dos Criadores.</span>
<span style="color: #46536e">No cartão final 4321. Próxima cobrança em 3 de outubro.</span>
<div style="display: flex; gap: 18px; flex-wrap: wrap"><a href="#planos" style="font-weight: 800">Ver os planos</a><a href="#cartao" style="font-weight: 800">Trocar o cartão</a><a href="#cancelar" style="font-weight: 800">Cancelar o plano</a></div>
</div>
<a href="#codigo" style="display: inline-flex; align-items: center; height: 48px; padding: 0 26px; border-radius: 999px; background: #ffffff; border: 2px solid #1b5cf3; color: #1343b8; text-decoration: none; font-weight: 800">Tenho um bilhete ou um código</a>
</section>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 16px">
<h2 style="${H2_K}">De onde vem o acesso de cada filho</h2>
${filho('T', '#ffc02e', 'Theo', 'Colégio Araucária, 6º ano B', 'A escola paga as aulas e as tarefas dele.', 'O seu plano dá a ele as ferramentas livres e o acompanhamento da Clínica Girassol.', '')}
${filho('L', '#9ec5ff', 'Lia', 'Colégio Araucária, contraturno', 'Entra pelo seu plano, com o código da escola.', 'O plano da família cobre a Lia e o Theo.', '<div style="display: flex; gap: 18px; flex-wrap: wrap"><a href="#sair" style="font-weight: 800">Tirar a Lia do contraturno</a></div>')}
</section>

<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 14px">
<h2 style="${H2_K}">Pagamentos</h2>
<div style="display: grid; grid-template-columns: 1fr 2fr 0.8fr 0.9fr; gap: 12px; padding: 10px 0; color: #46536e; font-size: 15px; font-weight: 800; border-bottom: 2px solid #d6deea">
<div>Data</div><div>O quê</div><div>Valor</div><div>Nota fiscal</div>
</div>
<div style="display: grid; grid-template-columns: 1fr 2fr 0.8fr 0.9fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid #d6deea; align-items: center">
<span>3 de setembro</span><span>Plano da família, código do Colégio Araucária</span><span>R$ 69,90</span><a href="#nota" style="font-weight: 800">Baixar</a>
</div>
<div style="display: grid; grid-template-columns: 1fr 2fr 0.8fr 0.9fr; gap: 12px; padding: 10px 0; align-items: center">
<span>3 de agosto</span><span>Plano da família, código do Colégio Araucária</span><span>R$ 69,90</span><a href="#nota" style="font-weight: 800">Baixar</a>
</div>
</section>

</div>

<aside style="flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 22px; line-height: 1.2">Se algo mudar</h2>
<span><strong>Se você cancelar o plano,</strong> o Theo continua com as aulas e as tarefas pela escola, sem as ferramentas livres e sem o acompanhamento da clínica, e a Lia sai do contraturno no fim do mês pago.</span>
<span><strong>Se a Lia sair do contraturno,</strong> o plano continua valendo para os dois, pelo vínculo do Theo com a escola.</span>
<span><strong>Se a família deixar de ter vínculo com uma escola ou instituição,</strong> o preço do código vale até o fim do período pago. Depois disso, o plano custa R$ 97, e só continua se você assinar.</span>
<span><strong>Em qualquer mudança,</strong> o que eles criaram continua com eles.</span>
</section>

<section style="${CARTAO_K}; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 22px; line-height: 1.2">Seus dados</h2>
<span>Marina Duarte</span>
<span>marina@exemplo.com.br</span>
<span>(31) 90000-0000</span>
<a href="#dados" style="font-weight: 800">Alterar</a>
</section>

</aside>

</div>`,
  ),
)

// =====================================================================================
// C5 · Aluno · Início em casa
// =====================================================================================
const BOTAO_K = 'display: inline-flex; align-items: center; height: 52px; padding: 0 30px; border-radius: 999px; background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; box-shadow: 0 4px 0 #1343b8'
const menuCasa = [
  ['Início', true],
  ['Cursos', false],
  ['Criar', false],
  ['Mural da escola', false],
  ['Recados', false],
  ['Meu espaço', false],
]
  .map(([rotulo, ativo]) =>
    ativo
      ? `<a href="#m" style="background: #1b5cf3; color: #ffffff; text-decoration: none; font-weight: 800; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`
      : `<a href="#m" style="color: #cbd4e8; text-decoration: none; font-weight: 700; padding: 12px 16px; border-radius: 14px">${rotulo}</a>`,
  )
  .join('\n')

arquivo(
  'Tela-Casa.dc.html',
  'Aluno: Início em casa',
  F_KIDS,
  '#e9eef6',
  `<div style="font-family: 'Nunito', system-ui, sans-serif; color: #0f1a33; font-size: 17px; line-height: 1.5; background: #e9eef6; display: flex; flex-wrap: wrap">

<nav style="flex: 1 1 268px; max-width: 100%; background: #121a30; color: #cbd4e8; padding: 28px 20px; display: flex; flex-direction: column; gap: 24px">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 180px; height: auto">
<div style="display: flex; flex-direction: column; gap: 6px">
${menuCasa}
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

<div style="display: flex; flex-direction: column; gap: 4px">
<h1 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 44px; line-height: 1.1">Oi, Theo!</h1>
<span style="font-size: 19px; color: #46536e">Você tem uma tarefa da escola e um plano combinado com a Camila.</span>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start">

<div style="flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 24px">

<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 14px">
<span style="align-self: flex-start; background: #e2ebff; color: #1343b8; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Colégio Araucária · tarefa da professora Renata</span>
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 30px; line-height: 1.15">Nave Contra Asteroides, aulas 1 a 3</h2>
<span>Falta a aula 3, Os asteroides. A entrega é até sexta, 14 de setembro.</span>
<a href="#continuar" style="align-self: flex-start; ${BOTAO_K}">Continuar a aula 3</a>
</section>

<section style="${CARTAO_K}; padding: 32px; display: flex; flex-direction: column; gap: 14px">
<span style="align-self: flex-start; background: #dcf0e4; color: #096b4a; border-radius: 999px; padding: 4px 14px; font-weight: 800; font-size: 15px">Clínica Girassol · plano combinado com a Camila</span>
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 30px; line-height: 1.15">Terminar o que começa</h2>
<span>O combinado são 2 aulas por semana, e você já fez as 2 desta semana. A aula 3 também conta para o plano combinado.</span>
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

<section style="background: #fff3c4; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 8px">
<h2 style="margin: 0; ${BALOO}; font-weight: 800; font-size: 24px">Sua mãe acompanha</h2>
<span>Ela vê o que você faz aqui e quanto tempo você usa. É para ajudar você.</span>
</section>

</aside>

</div>
</main>
</div>`,
)
