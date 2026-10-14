from pathlib import Path
import json,re
root=Path.cwd();base=root/'docs/marketing/kids/comunidade-dos-criadores/instagram';work=root/'output/instagram/light-copy-2026-10-12'
p=json.loads((work/'final-posts-normalizados.json').read_text(encoding='utf-8'));s=json.loads((work/'final-stories.json').read_text(encoding='utf-8'))
def write(path,text):path.write_text(text,encoding='utf-8')
t='''# Calendário editorial: 30 postagens e seis extras

**Revisão: 12/10/2026.** São 30 postagens principais, seis extras para famílias que já começaram e 60 telas novas de stories. Os três fixados ficam fora dessas contagens. Os 30 principais mantêm 14 carrosséis, dez Reels e seis imagens únicas; os extras acrescentam três carrosséis, dois Reels e uma imagem. Total disponível: **36 posts**, além dos fixados.

## Direção que governa o feed

A primeira cena e o primeiro argumento pertencem ao cotidiano dos pais: uma dificuldade, um desejo, uma curiosidade ou uma dica útil. A peça desenvolve esse interesse e entrega uma orientação. Só depois conecta o raciocínio a uma ação que a criança pratica ao programar e criar jogos. O jogo não é a vitrine de abertura das postagens principais.

O responsável encontra situações como ajudar sem saber a resposta, organizar uma tarefa, ouvir uma ideia própria, acompanhar uma tentativa ou preparar o filho para construir com tecnologia. Raciocínio lógico, resolução de problemas, criatividade e inovação aparecem como ações observáveis. Não prometemos que uma atividade garante notas, concentração, profissão ou transferência automática para toda situação da vida.

Os destaques e fixados apresentam o curso e suas condições. A bio permanece como entrada para quem procura a oferta. Seis posts têm convite opcional para receber uma atividade complementar no direct; a conversa pode apresentar as aulas após escolha da pessoa. O feed não depende de automação para entregar seu valor.

## Entregas completas

| Material | Arquivo |
| --- | --- |
| P01–P10 | [Primeiras dez](postagens/01-p01-a-p10.md) |
| P11–P20 | [Dez seguintes](postagens/02-p11-a-p20.md) |
| P21–P30 | [Últimas dez](postagens/03-p21-a-p30.md) |
| ST01–ST20 | [60 telas de stories](postagens/04-stories.md) |
| E01–E06 | [Seis extras de acompanhamento](postagens/07-extras-para-familias.md) |
| Direct opcional | [Seis entregas e sequência ManyChat completa](postagens/06-manychat.md) |
| Produção | [Direção visual](postagens/05-direcao-visual-e-producao.md) |
| Links | [Destinos e medição](apoio/links-e-publicacao.md) |
| Pesquisa | [50 publicações da Kodland](pesquisas/kodland-50-publicacoes-2026-10-12.md) e [método e fontes](pesquisas/light-copy-valor-e-persuasao-2026-10-12.md) |

Cada peça tem copy literal, legenda, direção de cena e descrição visual. Os Reels têm falas e tempos; a leitura natural na gravação governa o ajuste final. As cenas familiares podem ser encenadas ou ilustradas, sem serem apresentadas como comprovação de um aluno. Depoimentos usam os registros reais autorizados.

## Dez semanas, sem datas fictícias

Três posts principais por semana, em dias distintos, e duas sequências de stories. A primeira semana começa quando a produção estiver pronta. Registrar data e hora reais em America/Sao_Paulo. Os seis extras podem ampliar o ciclo conforme as dúvidas das famílias e a capacidade de produção; não substituem nem reduzem os trinta principais.

| Semana | ID e abertura | Entrada | Formato | Prática conectada à criação |
| --- | --- | --- | --- | --- |
'''
for i,x in enumerate(p[:30]):
    fmt=x['format']+(f", {len(x['slides'])} telas" if 'slides'in x else f", {x['duration']} s" if 'duration'in x else '')
    t+=f"| {i//3+1} | {x['id']} · {x['title']} | {x['pillar']} | {fmt} | {x['skill']} |\n"
t+='\n## Stories de apoio\n\n| Semana | Primeira sequência | Segunda sequência |\n| --- | --- | --- |\n'
for i in range(10):t+=f'| {i+1} | {s[i*2][0]} · {s[i*2][2]} | {s[i*2+1][0]} · {s[i*2+1][2]} |\n'
t+='\nSão 60 cartelas completas, sem link comercial obrigatório, promessa de resposta por enquete ou dependência de automação. Não republicar todos os stories nos destaques; acrescentar apenas respostas perenes úteis. A ordem dos destaques continua viva.\n\n## Extras para quem já começou\n\n'
for x in p[30:]:t+=f"- **{x['id']} · {x['title']}** {x['format']}. {x['skill']}\n"
t+='\n## Direct e leitura dos resultados\n\nPASSO/P01, APOIO/P06, IDEIA/P08, TESTE/P16, CRIAR/P25 e ROTINA/P29 entregam complementos pelo direct. As chamadas só entram após configurar e testar o fluxo. Não retirar a resposta principal do post para obrigar comentário. A compra é apresentada ao responsável que escolhe conhecer as aulas.\n\nApós sete dias, registrar alcance, salvamentos, compartilhamentos e retenção disponível; comparar peças com função e formato semelhantes. Após 28 dias, observar conversas pertinentes, cliques e compras atribuíveis. Comentários com palavra-chave não são vendas. O link comum da bio não identifica sozinho qual post gerou uma compra.\n\n## Estado de produção\n\nCopies e direções das 36 postagens e 60 stories completas. Pesquisa de 50 publicações concluída com limites documentados. ManyChat planejado, não configurado. O novo P01 substitui o carrossel que começava pela chave do Farol; conferir a versão atual no [controle de produção](producao/postagens/README.md). As mídias das demais peças ainda precisam ser captadas e compostas. Nenhuma publicação ou mensagem foi enviada.\n'
write(base/'03-postagens.md',t)

r=(base/'README.md').read_text(encoding='utf-8')
r=r.replace('**Revisão: 11/10/2026. Perfil:','**Revisão: 12/10/2026. Perfil:')
r=r.replace('O calendário contém 30 publicações próprias, além dos três fixados, e 60 telas novas de stories.','O calendário contém 30 publicações principais, seis extras para famílias que já começaram e 60 telas novas de stories. Os três fixados ficam separados.')
r=r.replace('O Instagram de Helena e Júlio apresenta o **Desafio do Primeiro Jogo como primeiro passo** para famílias com crianças de **9 a 14 anos**. O exemplo principal é **A Chave do Farol**: a criança aprende a fazer o personagem andar, pegar uma chave e acender o farol quando chega com ela.','O feed de Helena e Júlio começa nas **dores, desejos, curiosidades e dicas do cotidiano dos pais**, principalmente de crianças de **9 a 14 anos**. Entrega uma orientação e conduz o raciocínio até mostrar como programar e criar jogos oferece situações para organizar ideias, resolver problemas, inventar e construir com tecnologia.\n\n**Papel dos espaços:** postagens e stories atraem pelo interesse da família; destaques e fixados explicam a oferta. O Desafio do Primeiro Jogo continua sendo o primeiro passo comercial sugerido, com A Chave do Farol como projeto. A bio permite conhecer as ofertas. O [ManyChat planejado](postagens/06-manychat.md) entrega atividades e apresenta as aulas a quem escolher continuar a conversa.')
r=r.replace('Queremos mostrar **o que a criança faz na aula, como recebe ajuda e o que consegue mostrar para a família**. O responsável precisa entender a atividade antes de decidir pela compra. Usar cenas do jogo e das aulas para explicar, sem prometer melhora na escola ou resultados que não foram medidos.','Queremos ajudar o responsável a enxergar possibilidades para o filho: iniciativa, ideias próprias, raciocínio lógico e capacidade de investigar uma dificuldade. A demonstração de criação aparece como conclusão concreta da conversa. Nos espaços de apresentação, explicar também o que a criança faz na aula e como recebe apoio. Não prometer melhora escolar ou resultados não medidos.')
r=r.replace('> No Desafio do Primeiro Jogo, seu filho aprende a criar A Chave do Farol. As aulas mostram como fazer o personagem andar, pegar a chave e acender o farol. Ele faz uma parte de cada vez e joga para conferir se funcionou. Para criar outros jogos depois, vocês podem conhecer os cursos da Comunidade dos Criadores.','> Seu filho pode usar a tecnologia também para criar. Ao programar jogos, ele organiza ideias, constrói uma parte, testa e decide o que mudar. Você pode acompanhar as escolhas que ele faz e as dúvidas que aprende a investigar.')
r=r.replace('Primeiro passo sugerido e principal exemplo de aprendizagem; oferta acessível pela página da bio','Primeiro passo comercial sugerido nos destaques, fixados e direct solicitado; oferta na bio')
r=r.replace('Projeto ensinado no Desafio; referência principal das demonstrações deste ciclo','Projeto do Desafio; exemplo visual quando a conversa do feed chegar à criação')
r=r.replace('P01–P30: 14 carrosséis, dez Reels e seis imagens únicas; mais 20 sequências novas de três stories, com copy completa','P01–P30: 14 carrosséis, dez Reels e seis imagens; seis extras E01–E06; 20 sequências de três stories')
r=r.replace('Portanto, são 33 posts de feed ao considerar os dois conjuntos, além dos stories.','Com os seis extras, são 36 posts de calendário; incluindo os três fixados, são 39 peças de feed disponíveis, além dos stories.')
r=r.replace('A [pesquisa de 11/10](pesquisas/revisao-calendario-30-postagens-2026-10-11.md) fundamenta o calendário atual.','A [análise de 50 publicações](pesquisas/kodland-50-publicacoes-2026-10-12.md) e a [revisão de método de 12/10](pesquisas/light-copy-valor-e-persuasao-2026-10-12.md) fundamentam o calendário atual. A pesquisa de 11/10 registra a primeira etapa, superada por esta direção.')
r=r.replace('1. Gravar primeiro o Farol: personagem andando, chave sendo pega, farol com e sem chave, escolhas de visual e publicação do jogo. Usar conta com acesso correspondente ao Desafio; acesso administrativo não comprova o que a família recebe.','1. Produzir primeiro as cenas do cotidiano previstas nas fichas: tarefa, conversa, tentativa, escolha e acompanhamento. Captar as demonstrações reais de jogos como fechamento do raciocínio. Acesso administrativo não comprova o que a família recebe.')
write(base/'README.md',r)
write(base/'historico/2026-10-12-antes-light-copy/LEIA-ME.md','# Material substituído em 12/10/2026\n\nArquivo histórico da primeira versão de 30 posts e do P01 centrado na chave do Farol. Não publicar esta versão. O usuário definiu uma nova direção: cotidiano e interesses dos pais primeiro; criação de jogos como conclusão. A versão vigente está em ../../03-postagens.md.\n')
print('Calendário, posicionamento e histórico atualizados.')
