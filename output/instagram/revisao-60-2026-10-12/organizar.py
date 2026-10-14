from renderizar import BASE, WORK, posts, files, write, quote, link, need
import json, re
data=json.loads((WORK/'calendario-stories.json').read_text(encoding='utf-8'))
weeks=data['weeks']; stories=data['stories']
assert sorted(n for w in weeks for n in w)==list(range(1,61))

storytext='# Stories de apoio: 20 sequências completas\n\n**Revisão: 12/10/2026.** São 60 telas novas, três por sequência, para acompanhar o ciclo de 60 publicações. Uma sequência por semana é a sugestão de produção, ajustável à rotina da equipe. Não entram na contagem de uma publicação por dor ou desejo. [Calendário](../03-postagens.md) · [Mapa de cobertura](12-mapa-cobertura.md).\n\n'
storytext+='**Formato:** 1080 × 1920. Copy integral em citação, com direção visual por tela. Peças silenciosas; não dependem de fala gravada. Não há sticker, link ou enquete obrigatórios neste lote. O valor está nas três telas. Se publicar como vídeo, respeitar o tempo de leitura. Preservar as margens usadas pelos controles do aplicativo. Cenas encenadas ilustram situações; não comprovam resultado de alunos.\n\n'
for i,(title,related,units) in enumerate(stories,1):
 storytext+=f'<a id="st{i:02d}"></a>\n\n## ST{i:02d} · {title}\n\n**Semana sugerida:** {i}. **Apoio:** '+', '.join(f'[P{n:02d}]({files[(n-1)//10]}#p{n:02d})' for n in related)+'.\n\n'
 clean=[title]
 for j,(text,visual) in enumerate(units,1):
  storytext+=f'### Tela {j}\n\n'+quote(text)+f'**Visual/alt:** {visual}\n\n'
  clean.append(text)
 storytext+='**Texto alternativo:** incluir o texto da tela e a descrição da cena realmente produzida. **Destino:** a própria sequência, sem encaminhamento comercial obrigatório.\n\n'
 write(WORK/'copy-limpa'/f'ST{i:02d}.txt','\n\n'.join(clean))
write(BASE/'postagens/04-stories.md',storytext)

calendar='''# Calendário editorial: 60 postagens, 30 dores e 30 desejos

**Revisão: 12/10/2026.** São **60 publicações principais exclusivas**, uma para cada uma das 30 dores e dos 30 desejos da pesquisa: **30 carrosséis, 18 Reels e 12 imagens únicas**. Há também seis extras para famílias que já começaram e 20 sequências de stories, com 60 telas. Total disponível: **66 posts de feed**, além dos três fixados. Fixados, destaques, extras e stories não completam artificialmente a cobertura das 60 necessidades.

## Direção do conteúdo

O começo pertence à família: uma situação reconhecível, uma vontade, uma dúvida ou uma descoberta. A peça precisa acrescentar algo: um jeito de olhar, uma pergunta útil, um exemplo ou uma ação que dê para experimentar. A criação de jogos entra quando o raciocínio já oferece uma razão para falar dela.

A ligação mostra o que a criança faz: escolhe uma regra, coloca uma ideia em ordem, testa uma mudança, explica uma decisão. Isso dá ao responsável uma cena para compreender. Não atribuir à programação melhora garantida de notas, atenção, autoestima ou futuro profissional. Nem toda dor é resolvida por uma atividade; contratação, equipamento e apoio também precisam de informação clara.

A linguagem é simples, conversada e direta. Não tratar os pais como especialistas, nem como culpados pelo uso de telas. Reflexões podem terminar com uma ideia; dicas precisam dizer o que fazer. Nenhuma peça depende de comentar uma palavra para receber sua resposta principal.

**Variedade:** histórias reais, dicas de rotina, conversas em família, critérios de escolha e curiosidades sobre regras e criação. As demonstrações usam 11 bases de quatro extensões do Estúdio; os extras podem usar cursos existentes. Farol fica nos fixados, destaques e conversas de oferta. Exemplos da galeria não são anunciados como cursos ou como projetos feitos pelos alunos dos relatos.

## Pesquisa e cobertura

- [Pesquisa de mercado e avatar](pesquisas/mercado-e-avatar-2026-10-12.md).
- [30 dores e 30 desejos, com base de cada item](pesquisas/30-dores-e-30-desejos-2026-10-12.md).
- [Mapa verificável: uma publicação por necessidade](postagens/12-mapa-cobertura.md).
- [Revisão aplicada e conferências](pesquisas/revisao-60-dores-desejos-2026-10-12.md).

R, I e H nas fichas distinguem relatos, interpretações e hipóteses. A pesquisa não mede a frequência dessas necessidades nem comprova que criar jogos resolve todas elas. As oito hipóteses recebem abordagem condicional. Os cinco relatos deste ciclo mantêm as palavras e a atribuição das fontes reais.

## Copy completa para produzir

| Material | Arquivo |
| --- | --- |
| D01–D10 · P01–P10 | [Dez dores: rotina, tela e aprendizagem](postagens/01-p01-a-p10.md) |
| D11–D20 · P11–P20 | [Dez dores: ideias, ajuda e participação](postagens/02-p11-a-p20.md) |
| D21–D30 · P21–P30 | [Dez dores: escolha e acompanhamento](postagens/03-p21-a-p30.md) |
| W01–W10 · P31–P40 | [Dez desejos: autoria e raciocínio](postagens/09-p31-a-p40.md) |
| W11–W20 · P41–P50 | [Dez desejos: autonomia e possibilidades](postagens/10-p41-a-p50.md) |
| W21–W30 · P51–P60 | [Dez desejos: vínculo e desenvolvimento](postagens/11-p51-a-p60.md) |
| ST01–ST20 | [60 telas de stories](postagens/04-stories.md) |
| E01–E06 | [Seis extras de acompanhamento](postagens/07-extras-para-familias.md) |
| Direct opcional | [Seis materiais completos e conversa ManyChat](postagens/06-manychat.md) |
| Demonstrações | [Exemplos do Estúdio e regras a captar](postagens/08-exemplos-do-estudio.md) |
| Produção | [Direção visual](postagens/05-direcao-visual-e-producao.md) e [estado das mídias](producao/postagens/README.md) |
| Destinos | [Links e publicação](apoio/links-e-publicacao.md) |

Todas as peças têm copy literal, legenda e direção visual. Os Reels também têm falas, sobreposições e tempos de referência. Esses tempos orientam a edição; a leitura natural e o áudio original governam o corte final.

## Vinte semanas sugeridas

Três posts por semana e uma sequência de stories. A ordem abaixo intercala dores e desejos, evitando publicar blocos de trinta problemas seguidos de trinta aspirações. Os IDs organizam a cobertura, não a ordem de publicação. A primeira semana começa quando os materiais estiverem prontos. Não há datas, horários, responsáveis por gravação ou capacidade de produção presumidos.

| Semana | Primeira publicação | Segunda publicação | Terceira publicação | Stories |
| --- | --- | --- | --- | --- |
'''
for i,week in enumerate(weeks,1):
 cells=[]
 for n in week:
  p=posts[n-1]; cells.append(f'[P{n:02d} · {p["title"]}]({link(p)})<br>{p["format"]} · {need(p)}')
 calendar+=f'| {i} | '+' | '.join(cells)+f' | [ST{i:02d} · {stories[i-1][0]}](postagens/04-stories.md#st{i:02d}) |\n'
calendar+='''
As semanas são uma organização inicial. É possível mudar a ordem conforme conversas reais, materiais disponíveis e desempenho, mantendo os 60 IDs na fila. Não alegar que três publicações semanais são uma exigência do algoritmo. Registrar a data real e o fuso America/Sao_Paulo quando houver agendamento.

## Seis extras para quem já começou

- **E01:** reservar o computador e tempo para fazer a atividade. Pode acompanhar P24 ou P28.
- **E02:** pedir que a criança mostre uma parte do que fez. Complementa P43.
- **E03:** observar uma regra funcionando no Corre Dino. Complementa P26.
- **E04:** reconhecer a prática durante a pausa do vídeo. Aprofunda P23 para famílias participantes.
- **E05:** formular uma dúvida e usar Preciso de ajuda. Complementa P57.
- **E06:** conferir Guardado na sua conta antes de fechar. Complementa P56.

Os extras têm copy completa e público diferente dos conteúdos de atração. Usar conforme necessidade; evitar publicar um extra junto de uma peça muito parecida só para preencher frequência.

## Direct opcional

Somente seis publicações têm um convite adicional: **P11/IDEIA, P12/TESTE, P13/PASSO, P16/APOIO, P24/ROTINA e P30/CRIAR**. O material já está escrito no plano ManyChat. Primeiro entregar o que foi pedido; apresentar aulas depois da escolha do responsável. Até a automação estar configurada e testada, usar as legendas principais sem essas chamadas.

Os novos IDs e links substituem o mapeamento do ciclo anterior. A campanha de direct deste ciclo é `instagram_editorial_60_2026`. Bio e destaques mantêm suas próprias origens. Nenhuma automação foi ativada.

## Conferência e estado

**Copy e direção completas:** 60 principais, seis extras e 60 telas de stories. **Mídia nova:** a produzir. Os arquivos antigos de P01 ficam preservados como históricos; não correspondem ao novo P01. **Publicação, agendamento e envio de mensagens:** não realizados nesta revisão.

Na produção, confirmar capturas reais, acesso, legibilidade e correspondência entre imagem e fala. As demonstrações precisam mostrar a ação descrita; não substituir ilustração por uma segunda cópia do texto. Os relatos usam os vídeos fornecidos e não recebem falas sintetizadas. [Direção e fontes](postagens/05-direcao-visual-e-producao.md).

## Como ler os resultados

A função da peça define o que observar. Dicas: salvamentos e relatos de uso. Reflexões: compartilhamentos e comentários que acrescentam uma experiência. Relatos: retenção e conversas sobre interesse. Critérios de escolha: dúvidas pertinentes e visitas aos espaços que explicam a oferta. São sinais para comparar, não promessa de conversão.

Depois de sete dias, registrar alcance, salvamentos, compartilhamentos e retenção disponível. Comparar peças de função e formato semelhantes, considerando o alcance. Depois de 28 dias, observar conversas, cliques e compras atribuíveis quando houver dados. Comentário com palavra-chave não equivale a compra. Link comum da bio não identifica sozinho o post que despertou interesse.

Para as oito hipóteses, observar primeiro se a situação é reconhecida espontaneamente e o que os responsáveis contam. Não concluir que uma dor é comum ou que houve mudança na aprendizagem a partir de curtidas.
'''
write(BASE/'03-postagens.md',calendar)

# Atualizações nos documentos de apoio; preservar oferta e roteiros permanentes.
readme=(BASE/'README.md').read_text(encoding='utf-8')
readme=readme.replace('O calendário contém 30 publicações principais, seis extras para famílias que já começaram e 60 telas novas de stories.', 'O calendário contém 60 publicações principais, uma para cada uma das 30 dores e dos 30 desejos pesquisados, seis extras para famílias que já começaram e 60 telas novas de stories.')
readme=readme.replace('Esta etapa responde ao pedido de aprofundar a pesquisa antes de revisar novamente as postagens. Distingue relatos, interpretações e hipóteses; o calendário ainda precisa ser revisto à luz dessa base.', 'A pesquisa foi aplicada à revisão das 60 publicações. O [mapa de cobertura](postagens/12-mapa-cobertura.md) liga cada dor e desejo à copy completa, preservando a distinção entre relatos, interpretações e hipóteses. A ordem intercalada está no [calendário](03-postagens.md).')
write(BASE/'README.md',readme)

many=(BASE/'postagens/06-manychat.md').read_text(encoding='utf-8')
mapping={'P01':'P13','P06':'P16','P08':'P11','P16':'P12','P25':'P30','P29':'P24'}
many=re.sub(r'\bP(?:01|06|08|16|25|29)\b',lambda m:mapping[m.group()],many)
many=many.replace('P13 produzido usa a versão sem automação.', 'As novas peças ainda precisam de produção; nenhuma chamada depende de um fluxo já ativo.')
many=many.replace('Três formas de ajudar sem conhecer a resposta','Três formas de acompanhar uma dúvida de programação')
many=many.replace('Separei três formas de participar da busca por uma resposta.', 'Separei três formas de acompanhar uma dúvida de programação com seu filho.')
many=many.replace('Atividade para guardar ideias e escolher uma primeira parte','Roteiro para guardar ideias e escolher o primeiro pedaço de uma criação')
many=many.replace('A atividade ajuda a guardar as ideias e escolher uma primeira parte.', 'O roteiro ajuda a guardar ideias e escolher o primeiro pedaço de uma criação.')
many=many.replace('três perguntas para ajudar seu filho quando ele trava numa tarefa','três perguntas para ajudar seu filho a começar uma tarefa')

replacement='''### M01 · PASSO

**Mensagem 1**

> Quando seu filho não souber por onde começar, estas perguntas ajudam a escolher uma primeira ação:
>
> 1. “O que precisa ficar pronto?”
> 2. “O que você já sabe sobre isso?”
> 3. “Qual é a primeira coisa que precisa descobrir ou fazer?”
>
> Se o pedido não estiver claro, releiam a orientação antes de montar a lista. O primeiro passo precisa ser algo que ele entenda como tentar.

**Mensagem 2**

> Numa apresentação sobre um animal, por exemplo, ele pode começar anotando onde vive, o que come e como se desloca. Depois escolhe uma dessas informações para pesquisar. Cores e efeitos podem esperar.
>
> Criar jogos também oferece uma sequência para organizar. Numa fazenda, quem programa define o que acontece ao plantar e quando a planta fica pronta para colher. Uma ação precisa preparar a seguinte.
>
> Essa é uma oportunidade de praticar planejamento, junto das orientações necessárias para cada tarefa.

### M02 · APOIO

**Mensagem 1**

> Três formas de acompanhar uma dúvida de programação:
>
> 1. Pedir que mostre a intenção: “O que você queria fazer acontecer?”.
> 2. Comparar com a tentativa: “Me mostra o que aconteceu quando testou”.
> 3. Procurar a orientação: “Em qual trecho da aula essa parte aparece?”.
>
> Se a explicação não resolver, ajude a escrever a dúvida com essas informações. Você pode participar dessa busca sem saber o nome dos comandos.

**Mensagem 2**

> Imagine que a criança queria fazer o personagem pular, mas ele ficou parado. Ela pode mostrar qual controle usou e rever o trecho que ensina essa reação.
>
> O próximo teste tem uma pergunta clara: o personagem responde ao controle agora? Se ainda não responder, ela já tem o que contar ao pedir ajuda.
>
> Nas nossas aulas, usem Preciso de ajuda e acompanhem a resposta em Recados. O atendimento acontece por mensagem; enquanto esperam, não é preciso fingir que a dúvida foi resolvida.

### M03 · IDEIA

**Mensagem 1**

> Para uma criação cheia de ideias, façam duas listas: Começar por aqui e Guardar para depois.
>
> Primeiro, peça que seu filho conte a ideia inteira. Depois, escolham uma parte que ele consiga descrever: quem aparece e o que precisa acontecer nessa cena.
>
> As outras personagens, fases e surpresas ficam na segunda lista. Guardar uma ideia permite voltar a ela sem tentar construir tudo ao mesmo tempo.

**Mensagem 2**

> Se ele inventou uma aventura numa floresta, a primeira parte pode ser fazer um personagem andar por um caminho. Antes de acrescentar outras cenas, ele constrói e testa esse movimento com orientação.
>
> Ao criar jogos, cada regra precisa funcionar para a aventura acontecer. Começar com uma parte pequena dá um resultado para observar e ajuda a escolher o próximo passo.
>
> A lista de ideias continua ali. Uma primeira versão pode crescer depois.

'''
many=re.sub(r'### M01 · PASSO\n.*?(?=### M04 · TESTE)',replacement,many,flags=re.S)
many=many.replace('Numa conta, seu filho pode ter copiado um sinal diferente. Comparar o enunciado e olhar as linhas da resolução ajuda a encontrar esse ponto. Se o sinal estiver certo, ele ainda pode precisar de explicação sobre uma etapa.', 'Num jogo de rebater, seu filho esperava que a bola voltasse ao tocar a raquete. Mas ela atravessou. Agora ele tem uma reação específica para procurar na explicação e conferir nos comandos.')
many=many.replace('Se o personagem não alcança uma plataforma, quem programa pode ajustar o pulo e jogar de novo. Mantendo o restante igual, fica mais claro o que aquela mudança fez.', 'Depois de rever a reação ao toque, ele joga outra vez e observa o encontro da bola com a raquete. Manter o restante igual ajuda a perceber o que aquela mudança fez.')
write(BASE/'postagens/06-manychat.md',many)

links=(BASE/'apoio/links-e-publicacao.md').read_text(encoding='utf-8')
links=re.sub(r'\bP(?:01|06|08|16|25|29)\b',lambda m:mapping[m.group()],links)
lower={k.lower():v.lower() for k,v in mapping.items()}
links=re.sub(r'p(?:01|06|08|16|25|29)(?=_)',lambda m:lower[m.group()],links)
links=links.replace('instagram_editorial_30_2026','instagram_editorial_60_2026')
links=links.replace('Campanha mantida como identificador estável:', 'Campanha deste ciclo revisado:')
links=links.replace('O complemento de seis posts não muda o identificador do ciclo.', 'Esta campanha e os novos IDs substituem o plano anterior, que não chegou a ser ativado. Os extras não alteram a cobertura das 60 necessidades.')
links=links.replace('Publicar P13–P30 em três dias semanais e ST01–ST20 em dois desses dias.', 'Publicar os 60 posts na ordem intercalada do calendário, em três dias semanais, e uma sequência ST por semana, ajustando a frequência à produção.')
links=links.replace('a origem da demonstração aparece na legenda e no arquivo de produção', 'a origem da demonstração fica no arquivo de produção; a legenda esclarece o contexto quando houver risco de confusão com um relato real')
write(BASE/'apoio/links-e-publicacao.md',links)

extras=(BASE/'postagens/07-extras-para-familias.md').read_text(encoding='utf-8').replace('além dos trinta posts de atração','além das 60 publicações principais')
extras=extras.replace('Produzir conforme dúvidas reais da comunidade e capacidade da equipe.', 'Produzir conforme dúvidas reais da comunidade e capacidade da equipe. São complementos; não entram na cobertura de uma publicação para cada dor e desejo. Evitar colocá-los junto de posts principais muito parecidos.')
write(BASE/'postagens/07-extras-para-familias.md',extras)

examples=(BASE/'postagens/08-exemplos-do-estudio.md').read_text(encoding='utf-8')
examples=re.sub(r'São 11 bases de quatro extensões, distribuídas por 27 posts\. P11, P12 e P28 preservam a história e os relatos reais sem atribuir a essas pessoas um projeto de exemplo\.', 'São 11 bases de quatro extensões, citadas nas fichas deste ciclo. P27 trata de contratação, sem demonstração; P32, P33 e P41 usam apenas os relatos reais. P34 e P35 separam o depoimento e a demonstração da equipe. A ficha de cada post determina se a captura entra na arte, no vídeo ou apenas como exemplo na legenda.', examples)
lines=examples.splitlines()
for i,line in enumerate(lines):
 if line.startswith('| ') and any(line.startswith('| '+p['game']+' |') for p in posts):
  cells=[x.strip() for x in line.strip('|').split('|')]
  cells[2]=', '.join(f'P{p["n"]:02d}' for p in posts if p['game']==cells[0])
  lines[i]='| '+' | '.join(cells)+' |'
examples='\n'.join(lines)
examples=examples.replace('Em P18, separar demonstração do exemplo e tela de aula existente.', 'Em P40 e P44, captar apenas os comandos e a contagem descritos nas fichas.')
examples=examples.replace('como as cartas do P01', 'como os esquemas de regras do Jogo da Memoria')
examples=examples.split('## Relação entre situação, habilidade e jogo')[0]+'''## Relação entre situação, habilidade e jogo

- **P11:** uma aventura grande precisa de uma primeira parte. A criança escolhe uma cena e aprende a construir uma ação antes de acrescentar outras.
- **P13:** uma tarefa com várias etapas pede uma ordem. Na fazenda, plantar prepara o crescimento e a colheita; a sequência precisa funcionar.
- **P36:** mudar tudo dificulta saber o que resolveu. No Quebra-blocos, comparar duas velocidades com o restante igual permite enxergar o efeito da mudança.
- **P38:** escolher envolve explicar um motivo. Duas versões de contraste permitem conversar sobre o que facilita acompanhar a bola.
- **P44:** a contagem ganha sentido quando representa uma ação. Na corrida, uma volta completa altera o placar conforme a regra.
- **P48:** um resultado na tela vem de regras definidas por alguém. No Pong, a criança pode conferir quando um ponto deve ser acrescentado. Isso não comprova aprendizagem de checagem de fontes ou IA.

O jogo serve à explicação. Não trocar apenas o cenário de um argumento repetido nem prometer transferência automática da habilidade para outras situações. A matriz completa de necessidades está em [Cobertura](12-mapa-cobertura.md).
'''
write(BASE/'postagens/08-exemplos-do-estudio.md',examples)
print('Calendário, stories e documentos de apoio atualizados.')
