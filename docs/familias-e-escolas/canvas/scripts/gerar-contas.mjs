// Prancha 7 · Quem paga em cada situação (versão 2.3: a escola paga a sala de aula, a família paga o plano da família,
// com preço menor pelo código; vale o maior valor, sem somar).
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const projeto = RAIZ + '/project'
const LOGO_ESCURO = '/_blob/b071f94b0478ee7c6b96469a94dbe0b1'
const F_INST = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700&family=Bricolage+Grotesque:wght@600;700;800&display=swap'
const BRICO = "font-family: 'Bricolage Grotesque', system-ui, sans-serif"
const H2 = `margin: 0; ${BRICO}; font-weight: 700; font-size: 34px; line-height: 1.15`
const H3 = `margin: 0; ${BRICO}; font-weight: 700; font-size: 24px; line-height: 1.2`
const CARTAO = 'background: #ffffff; border: 1px solid #d6deea; border-radius: 20px; box-shadow: 0 4px 0 #d6deea; padding: 28px; display: flex; flex-direction: column; gap: 10px'
const G3 = 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))'

const numerado = (n, titulo, texto) => `<div style="${CARTAO}">
<div style="${BRICO}; font-weight: 800; font-size: 32px; line-height: 1; color: #1343b8">${n}</div>
<h3 style="${H3}">${titulo}</h3>
<span>${texto}</span>
</div>`
const cartao = (titulo, texto) => `<div style="${CARTAO}">
<h3 style="${H3}">${titulo}</h3>
<span>${texto}</span>
</div>`
const faixa = (cor, titulo, texto) => `<article style="background: ${cor}; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<h3 style="${H3}">${titulo}</h3>
<p style="margin: 0">${texto}</p>
</article>`
const cabecalho = (grade, colunas) =>
  `<div style="display: grid; grid-template-columns: ${grade}; background: #121733; color: #f2f4fa; font-weight: 700">\n${colunas.map((c) => `<div style="padding: 14px 20px">${c}</div>`).join('')}\n</div>`
const linha = (grade, colunas, alternada) =>
  `<div style="display: grid; grid-template-columns: ${grade}; border-top: 1px solid #d6deea;${alternada ? ' background: #f4f6fb;' : ''} align-items: start">\n${colunas
    .map((c, i) => `<div style="padding: 16px 20px${i === 0 ? '; font-weight: 700' : ''}">${c}</div>`)
    .join('')}\n</div>`
const secao = (titulo, apoio, corpo) => `<section style="display: flex; flex-direction: column; gap: 24px">
<div style="display: flex; flex-direction: column; gap: 10px; max-width: 980px">
<h2 style="${H2}">${titulo}</h2>
${apoio ? `<p style="margin: 0; color: #46536e">${apoio}</p>` : ''}
</div>
${corpo}
</section>`
const tabela = (largura, grade, titulos, linhas) => `<div style="overflow-x: auto">
<div style="min-width: ${largura}px; background: #ffffff; border: 1px solid #d6deea; border-radius: 20px; overflow: hidden">
${cabecalho(grade, titulos)}
${linhas.map((l, i) => linha(grade, l, i % 2 === 1)).join('\n')}
</div>
</div>`

const GP = 'minmax(0, 1.3fr) repeat(3, minmax(0, 1fr))'
const planos = [
  ['Quanto a família paga por mês', 'Nada', 'R$ 69,90', 'R$ 97'],
  ['Cursos da Jornada e tarefas, na escola e em casa', 'Sim', 'Sim', 'Sim'],
  ['Ferramentas dentro das aulas', 'Sim', 'Sim', 'Sim'],
  ['Estúdio, Pinta, Pensa e Molda livres, para criar à vontade', 'Não', 'Sim', 'Sim'],
  ['Crianças', 'O aluno', 'Até 2', 'Até 2'],
  ['Cursos para pais e área dos pais', 'Sim', 'Sim', 'Sim'],
  ['Mural da escola ou da instituição de que faz parte', 'Sim', 'Sim', 'Sim, se fizer parte de uma'],
  ['Ranking da escola, quando a escola liga', 'Sim', 'Sim', 'Sim, se fizer parte de uma'],
  ['Arquipélago, ranking geral e Mural e Clube dos Criadores', 'Não', 'Não', 'Sim'],
  ['Acompanhamento', 'O professor, pelas tarefas', 'Aula do contraturno, ou plano combinado e conversa com a equipe da clínica', 'O da escola ou instituição, se fizer parte de uma'],
]

const GS = 'minmax(0, 1.05fr) minmax(0, 1.5fr) minmax(0, 0.95fr)'
const situacoes = [
  ['A escola põe o Sistema Zero na grade, e a família não tem plano', 'O responsável faz o primeiro acesso com o bilhete. O filho tem as aulas e as tarefas, na escola e em casa.', 'Nada'],
  ['A família da escola quer que o filho crie à vontade em casa', 'Na área dos pais, ela assina o plano da família com o código da escola.', 'R$ 69,90, para até 2 filhos'],
  ['O filho vai entrar no contraturno da escola', 'A família inscreve com o código da escola, que já é o plano da família.', 'R$ 69,90, para até 2 filhos'],
  ['A escola paga, e a família quer entrar pela clínica também', 'Ela entra pelo código da clínica e passa a ter o plano da família, com o acompanhamento da profissional.', 'R$ 69,90'],
  ['A família está na clínica e no contraturno', 'Um plano só cobre os dois lugares.', 'R$ 69,90, e não R$ 139,80'],
  ['Já paga R$ 97, e a escola do filho entra na grade, ou ele entra numa clínica', 'Nada muda na cobrança. A tela do bilhete ou do código mostra as duas opções: continuar nos R$ 97, com o Mural e o Clube dos Criadores, ou passar para o plano pelo código.', 'R$ 97, ou R$ 69,90 se ela preferir'],
  ['Tem o plano pelo código e quer o Arquipélago ou o Mural e o Clube dos Criadores', 'Na área dos pais, ela passa para o plano de R$ 97.', 'R$ 97'],
  ['Já paga R$ 97 e não tem escola nem instituição', 'Nada muda.', 'R$ 97'],
  ['Pagou o ano adiantado, e a escola do filho entra ou ele ganha um código', 'O período pago segue até o fim, como foi comprado, sem devolução. Na renovação nada muda sozinho: ela continua no plano que tem e pode pedir o plano pelo código.', 'Nada a mais'],
  ['A instituição parceira paga a vaga da criança, e a família quer as ferramentas livres', 'A família assina o plano pelo código, e a criança deixa de contar como vaga paga pela parceira. Na grade isso não vale: a escola paga por todos os alunos da turma.', 'R$ 69,90'],
  ['A família cancela o plano, e a escola continua pagando', 'O filho continua com as aulas e as tarefas. As ferramentas livres voltam quando ela assinar de novo. O que ele criou fica guardado.', 'Nada'],
  ['A família deixa de ter vínculo: o filho saiu da escola ou recebeu alta', 'O preço do código vale até o fim do período pago. Para continuar, ela assina pelo preço normal. Se era só o acesso da escola, ele segue por 30 dias.', 'R$ 97, se quiser continuar'],
  ['A família tem três filhos', 'O plano cobre dois. Cada criança a mais entra com um perfil extra, comprado na área dos pais.', 'O plano, mais R$ 39,90 por criança a mais'],
]

const corpo = `<div style="font-family: 'Atkinson Hyperlegible Next', system-ui, sans-serif; color: #0f1a33; font-size: 18px; line-height: 1.55; background: #f4f6fb">

<header style="background-color: #121733; background-image: radial-gradient(rgba(242,244,250,0.09) 1px, transparent 1px); background-size: 20px 20px; color: #f2f4fa">
<div style="max-width: 1280px; margin: 0 auto; padding: 40px 64px 48px; display: flex; flex-direction: column; gap: 24px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap">
<img src="${LOGO_ESCURO}" alt="Sistema Zero" style="width: 190px; height: auto">
<div style="font-size: 15px; color: #c9d1e6">2 · Como funciona · prancha 7</div>
</div>
<h1 style="margin: 0; ${BRICO}; font-weight: 800; font-size: 60px; line-height: 1.05; letter-spacing: -0.02em">Quem paga em cada situação</h1>
<p style="margin: 0; font-size: 21px; color: #f2f4fa; max-width: 980px">A escola paga a sala de aula. A família paga o plano que vai além da sala de aula, mais barato quando ela chega por uma escola ou instituição. Ninguém paga dois planos: vale o maior valor em que a família entrou.</p>
</div>
</header>

<main style="max-width: 1280px; margin: 0 auto; padding: 56px 64px 96px; display: flex; flex-direction: column; gap: 64px">

<section style="display: flex; flex-direction: column; gap: 24px">
<h2 style="${H2}">As quatro regras</h2>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 20px">
${numerado('1', 'Uma família, uma conta', 'Escola e clínica não criam outra conta para a família. Elas se ligam à criança que já está na conta dela.')}
${numerado('2', 'A escola paga a sala de aula', 'As aulas e as tarefas, na escola e em casa, com as ferramentas dentro das aulas, o mural da escola e os cursos para pais.')}
${numerado('3', 'A família paga o que vai além', 'O plano dá as ferramentas livres, para até 2 crianças. Custa R$ 69,90 com o código de uma escola ou instituição, e R$ 97 sem código, com o Arquipélago, o ranking geral e o Mural e o Clube dos Criadores.')}
${numerado('4', 'O maior valor, sem somar', 'A família paga um plano só, o mais completo em que entrou. Nada é cancelado nem cobrado sem ela pedir.')}
</div>
</section>

${secao(
  'O que entra em cada caso',
  'Tudo o que o professor exige do aluno está no que a escola paga. O que a família paga é o que vai além da sala de aula.',
  tabela(980, GP, ['', 'Só com a escola pagando', 'Plano pelo código', 'Plano de R$ 97'], planos) +
    '\n<p style="margin: 0; max-width: 980px">O plano pelo código é uma promoção da escola ou da instituição para as famílias dela, e vale enquanto durar o vínculo. O Arquipélago, o ranking geral e o Mural e o Clube dos Criadores ficam só no plano de R$ 97, que é a Comunidade dos Criadores de hoje. As Oficinas ao vivo continuam vendidas à parte. Cada criança além de duas entra com um perfil extra, por R$ 39,90 ao mês.</p>',
)}

${secao('Situação por situação', 'Em nenhuma delas a família paga dois planos.', tabela(980, GS, ['Situação', 'O que acontece', 'O que a família paga'], situacoes))}

${secao(
  'Como o preço muda',
  '',
  `<div style="display: grid; grid-template-columns: ${G3}; gap: 24px">
${faixa('#dcf0e4', 'Trocar de plano', 'Só acontece se a família pedir, para um lado ou para o outro. A troca é feita em Conta, na tela Planos: abre a assinatura nova e encerra a antiga, e a primeira cobrança desconta o que já foi pago no mês. Quem pagou adiantado troca no fim do período pago.')}
${faixa('#e2ebff', 'Quando o vínculo termina', 'O plano pelo código acaba no fim do período pago. Para continuar, a família assina o plano de R$ 97. Nada sobe de preço sozinho.')}
${faixa('#fff3c4', 'Quem pagou adiantado', 'O período pago vale até o fim, como foi comprado, e não há devolução depois dos primeiros 7 dias. Vale para o plano anual e para os 6 meses no Pix.')}
</div>`,
)}

${secao(
  'Mural e clube',
  'O mural é onde a criança publica os jogos. O clube é onde ela conversa com outras crianças.',
  `<div style="display: grid; grid-template-columns: ${G3}; gap: 24px">
${faixa('#e2ebff', 'Só com a escola pagando', 'O mural da escola, só com os alunos dela e separado por segmento. Não há clube nem Mural dos Criadores.')}
${faixa('#dcf0e4', 'Com o plano pelo código', 'O mural da escola e o da instituição de que a criança faz parte. Quem está nos dois lugares vê os dois. Não há Mural nem Clube dos Criadores.')}
${faixa('#f8e4ee', 'Com o plano de R$ 97', 'O Mural e o Clube dos Criadores, que já existem, com as famílias do Brasil inteiro. Se a criança fizer parte de uma escola ou instituição, ela vê também o mural de lá.')}
</div>
<ul style="margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; max-width: 980px">
<li>Um jogo fica publicado em um mural só, e a criança escolhe qual. Publicar em qualquer um deles vale para a Jornada.</li>
<li>O clube de cada escola entra numa fase seguinte, quando o professor puder moderar. Hoje só a equipe do Sistema Zero modera.</li>
<li>O ranking da escola começa desligado, e a gestão decide se liga. Ele mostra os primeiros lugares e a posição da própria criança, sem a lista até o último. A clínica não tem ranking.</li>
<li>Na clínica, o mural começa desligado. Se a coordenação ligar, cada família autoriza na área dos pais, porque participar mostra às outras famílias que a criança é atendida ali.</li>
<li>O aluno sem o primeiro acesso da família publica no mural da escola.</li>
</ul>`,
)}

${secao(
  'O cadastro da criança',
  'A criança é uma só no sistema, entre por onde entrar.',
  `<div style="display: grid; grid-template-columns: ${G3}; gap: 24px">
${cartao('A planilha traz o e-mail do responsável', 'Com ele, a conta da família é criada ou encontrada já na importação da turma, e o aluno nasce dentro dela. Irmãos caem na mesma conta, e quem já era cliente é reconhecido. O bilhete serve para o primeiro acesso, e o aluno só aparece para a família depois que ela usa o bilhete dele, com o código e a data de nascimento. Assim, um e-mail digitado errado não mostra a criança a ninguém.')}
${cartao('A criança já tinha perfil', 'A tela do bilhete pergunta qual perfil segue. A turma passa a usar esse perfil, e o outro é arquivado. Os dois não são somados: o que a criança fez pelo crachá antes da escolha fica no perfil arquivado. Por isso a família que já é cliente é avisada por e-mail assim que a escola importa a turma, para usar o bilhete antes da primeira aula.')}
${cartao('A planilha veio sem o e-mail', 'O aluno fica numa conta provisória, só dele, e usa a plataforma na escola, com o crachá. O responsável assume essa conta com o bilhete, pondo o e-mail e a senha. Se o e-mail certo for de uma família que já tem conta, ela escolhe qual perfil segue, como quem já era cliente.')}
</div>`,
)}

${secao(
  'Quem trabalha na instituição e também é pai',
  'Vale para professor, gestor, coordenador e profissional.',
  `<div style="display: grid; grid-template-columns: ${G3}; gap: 24px">
${cartao('Uma pessoa, um login', 'A professora aceita o convite da escola com a conta que já tem. Ela entra na área dos pais e na área da escola com o mesmo e-mail e a mesma senha.')}
${cartao('As duas visões não se misturam', 'Como professora, ela vê as turmas dela. Como mãe, vê tudo do filho. Se o filho estiver na turma dela, aparece ali como qualquer aluno, só com o que é da tarefa.')}
${cartao('O filho segue a regra de qualquer família', 'Trabalhar na instituição não muda quem paga. Se o filho estuda numa turma que a escola paga, ele tem a sala de aula. O plano da família é o mesmo de todos.')}
</div>`,
)}

<section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(520px, 100%), 1fr)); gap: 24px">
<div style="background: #ffffff; border: 1px solid #d6deea; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 26px; line-height: 1.2">Quando quem paga é a instituição</h2>
<ul style="margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px">
<li>A escola paga por todos os alunos das turmas da grade: R$ 39,90 por aluno ao mês com 50 alunos ou mais, e R$ 49,90 abaixo disso.</li>
<li>A conta é feita pelo número de alunos ativos no dia 1º. Quem entra no meio do mês conta a partir do mês seguinte.</li>
<li>Nas primeiras instituições, a cobrança é um Pix por mês, e a nota fiscal para CNPJ é emitida à mão pela equipe. A cobrança feita pelo sistema fica para quando houver mais instituições.</li>
<li>A instituição parceira que paga as vagas segue a mesma regra, a R$ 49,90, com o mesmo conteúdo do acesso pago pela escola.</li>
<li>A cada 20 famílias pagantes pelo código, a instituição recebe 1 plano de cortesia para um bolsista que ela escolhe. A família conta para a instituição por cujo código entrou, e a cortesia vale enquanto houver 20 pagantes. Quem recebe é uma criança, e não a instituição nem o profissional.</li>
<li>A instituição vê quem está inscrito e quantas famílias pagam pelo código dela, e nunca quem paga o quê.</li>
</ul>
</div>
<div style="display: flex; flex-direction: column; gap: 24px">
<div style="background: #fff3c4; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 26px; line-height: 1.2">Onde a oferta do plano aparece</h2>
<p style="margin: 0">Só para os pais: na área dos pais e nas telas do bilhete e do código. No espaço da escola e na área da criança não há venda, e o que a escola sabe do aluno não é usado para vender.</p>
</div>
<div style="background: #ffffff; border: 1px solid #d6deea; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; ${BRICO}; font-weight: 700; font-size: 26px; line-height: 1.2">Cursos para pais</h2>
<p style="margin: 0">Estão incluídos sempre que o Sistema Zero recebe: no plano da família, com ou sem código, e no acesso pago pela escola ou pela instituição. Quem não tem nenhum deles compra o curso à parte, como hoje.</p>
</div>
</div>
</section>

<section style="background: #ffffff; border: 1px solid #d6deea; border-radius: 24px; padding: 28px 32px; display: flex; flex-direction: column; gap: 8px">
<strong style="font-size: 20px">Onde isso aparece nas telas</strong>
<span>A tela B2 mostra a família que já assina usando o bilhete da escola. A tela B3 mostra a inscrição no contraturno, pelo plano da família. A tela B8 mostra Conta, na área dos pais, com o que cada filho tem e o que a família paga. A tela B9 mostra os três degraus, a troca de plano e o perfil extra, e a tela A7 mostra a cobrança das instituições.</span>
</section>

</main>
</div>`

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Quem paga em cada situação</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="${F_INST}">
<style>
body{margin:0;background:#f4f6fb}
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
writeFileSync(join(projeto, 'Contas.dc.html'), html)
console.log('escrita: Contas.dc.html')
