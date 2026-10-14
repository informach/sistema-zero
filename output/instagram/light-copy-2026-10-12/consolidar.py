from pathlib import Path
import json,re
base=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
def write(p,t):p.write_text(t,encoding='utf-8')
f=base/'apoio/links-e-publicacao.md';t=f.read_text(encoding='utf-8').replace('Revisão: 11/10/2026','Revisão: 12/10/2026')
t=t.replace('P19, P26 e P30 orientam a escolha do botão da Comunidade na bio.','As postagens principais conduzem à criação como atividade. A oferta é apresentada nos destaques, fixados e no direct quando solicitada.')
t=t.replace('Os novos stories ST01–ST20 usam **instagram_editorial_30_2026**, conforme a tabela seguinte.','As conversas opcionais por comentário usam **instagram_editorial_30_2026**. Os novos stories ST01–ST20 não têm sticker comercial neste lote.')
t=t.replace('Os links de ST01–ST20 estão abaixo. As perguntas, opções das enquetes e falas completas estão no [roteiro dos stories](../postagens/04-stories.md). Não criar resposta automática ou convite de mensagem não previsto.','As copies de ST01–ST20 estão no [roteiro dos stories](../postagens/04-stories.md). As seis entradas de direct estão no [plano ManyChat](../postagens/06-manychat.md); escrever as mensagens não ativa a automação.')
start=t.index('### Stories do novo calendário');end=t.index('**Atribuição da bio:**',start)
new='''### Stories e direct do novo calendário

As 60 telas ST01–ST20 entregam orientação e conexão com a criação, sem link comercial. As seis entradas opcionais do ManyChat usam as URLs abaixo somente depois de a pessoa pedir para conhecer as aulas. A abertura e a entrega da atividade usam botões internos, sem endereço externo.

Campanha mantida como identificador estável: `instagram_editorial_30_2026`. Meio: `dm`. O complemento de seis posts não muda o identificador do ciclo. Query antes de fragmento; nenhum dado pessoal em UTM.

| Entrada | Desafio: Ver valor e acesso | Comunidade: Ver cursos e planos |
| --- | --- | --- |
'''
for pid,word in [('p01','passo'),('p06','apoio'),('p08','ideia'),('p16','teste'),('p25','criar'),('p29','rotina')]:
    prefix=f'utm_source=instagram&utm_medium=dm&utm_campaign=instagram_editorial_30_2026&utm_content={pid}_{word}'
    new+=f'| {pid.upper()} / {word.upper()} | `https://sistemazero.com.br/kids/desafio-primeiro-jogo/oferta?{prefix}_desafio` | `https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta?{prefix}_comunidade` |\n'
new+='\nPreservar a entrada ao atravessar os botões O01–O03. Em reentrada por direct, manter a origem da palavra; não atribuir compra apenas por clique. Configuração e verificação remota ainda pendentes.\n\n'
t=t[:start]+new+t[end:]
t=t.replace('Publicar P01–P30 em três dias semanais e ST01–ST20 em dois desses dias.','Publicar P01–P30 em três dias semanais e ST01–ST20 em dois desses dias. Os seis extras E01–E06 podem ampliar o ciclo conforme as dúvidas das famílias.')
t=t.replace('pesquisas/revisao-calendario-30-postagens-2026-10-11.md','pesquisas/light-copy-valor-e-persuasao-2026-10-12.md')
write(f,t)

f=base/'postagens/05-direcao-visual-e-producao.md';t=f.read_text(encoding='utf-8').replace('**11/10/2026.**','**12/10/2026.**').replace('Aplicar às publicações P01–P30 e aos stories ST01–ST20.','Aplicar às publicações P01–P30, aos seis extras E01–E06 e aos stories ST01–ST20.')
start=t.index('| Família visual |');end=t.index('## Carrosséis e imagens únicas',start)
t=t[:start]+'''**Regra de abertura:** nos trinta posts principais, mostrar a situação do pai e do filho antes do jogo. Tarefa no papel, conversa, tentativa, escolha e rotina são cenas centrais. O exemplo digital entra depois que a ideia foi desenvolvida. Não abrir com paleta de blocos, catálogo, farol ou curso apenas porque existe uma captura pronta.

| Cena | Peças de referência | Função da imagem |
| --- | --- | --- |
| Dúvida e ajuda | P01, P06, P16 | Mostrar o ponto de dificuldade e um gesto de apoio; sem dramatizar a criança |
| Escolha e invenção | P05, P08, P10, P12, P22 | Tornar uma ideia e sua mudança visíveis antes de falar de programação |
| Conversa e escuta | P03, P13, P15, P20, P21, P27 | Mostrar quem aponta, quem ouve e o objeto da conversa |
| Rotina e planejamento | P04, P07, P18, P19, P24, P29 | Materiais reais, ordem de uma ação e registro do próximo passo |
| Curiosidade e investigação | P02, P14, P17, P23, P26 | Comparar duas situações ou testar uma regra do cotidiano |
| Tecnologia e futuro | P11, P25, P30 | Partir de um interesse da família e chegar ao ato de construir; sem robôs e profissão prometida |

''' +t[end:]
t=t.replace('P07 é uma atividade visual, P24 mostra uma ideia desenhada','P07 mostra uma orientação cotidiana, P24 mostra uma ideia desenhada')
t=t.replace('Para enquete, as opções indicadas devem permanecer legíveis e corresponder à imagem.','Este lote usa cartelas completas sem enquetes ou stickers comerciais obrigatórios.')
t=t.replace('Quando a tela for vídeo, a fala está inteira no roteiro e deve ser legendada. Quando for cartela, não acrescentar narração que traga outra informação.','As sessenta telas são cartelas. Vídeo pode ser fundo de apoio, mas não acrescentar fala ou informação ausente da copy.')
t=t.replace('Desenhos e grade originais de P07 e P24','Desenhos e brincadeiras originais de P10, P17, P23 e P24')
t=t.replace('recapturar estados específicos de P01 e P04','recapturar os estados pedidos em cada fechamento')
t=t.replace('Para P01, a pasta é `producao/postagens/p01-mudar-a-chave-muda-o-caminho/`.','Para o P01 vigente, a pasta é `producao/postagens/p01-nao-consigo/`. A versão centrada na chave foi substituída e deve ficar fora da fila de publicação.')
t=t.replace('5. Abrir o link final no contexto de publicação. O CTA leva à oferta prometida, não ao quiz de outra campanha.','5. Nas chamadas opcionais por palavra, testar entrega e ramificações antes de publicar o convite. Sem automação ativa, usar a legenda principal completa. Nas mensagens de oferta, conferir o destino publicado.')
t+='\n## P01: origem visual da nova versão\n\nTrês ilustrações editoriais foram geradas pela ferramenta integrada, com personagens fictícios, e combinadas com diagramas próprios e capturas reais. Elas mostram uma situação familiar, não depoimento de aluno. Prompts, fontes e montagem ficam na pasta de produção. Nenhuma fotografia da Kodland foi reutilizada.\n'
write(f,t)

f=base/'pesquisas/light-copy-valor-e-persuasao-2026-10-12.md';t=f.read_text(encoding='utf-8')
t=t.replace('30 publicações próprias, 60 telas de stories e atualização do carrossel P01 já produzido','30 publicações principais, seis extras para famílias, 60 telas de stories, plano de ManyChat e substituição do P01')
start=t.index('## Diagnóstico');end=t.index('## Método consultado',start)
t=t[:start]+'''## Decisão final após a orientação do usuário

O problema era o ponto de partida: as primeiras versões abriam com jogo, comando ou recurso. Mesmo com uma atividade útil no final, ainda exigiam que o pai já estivesse interessado em criar jogos. Essa direção foi substituída.

Agora o feed começa em **dores, desejos, curiosidades e dicas do cotidiano dos pais**. Desenvolve a situação e entrega uma orientação. A programação por meio de criação de jogos aparece depois, como oportunidade concreta de praticar a ação discutida. Curso, acesso e contratação são explicados nos destaques, fixados e no direct solicitado.

As pautas abordam iniciativa, comunicação, raciocínio lógico, resolução de problemas, criatividade, inovação e preparação para construir com tecnologia. O texto mostra o que a criança faz dentro da atividade; não promete que isso se transfere automaticamente para notas, concentração, profissão ou toda situação da vida.

''' +t[end:]
t=t.replace('Mostrar uma mudança e seu efeito; deixar o responsável acompanhar a conclusão. P01 e P16.','Partir de uma situação reconhecível e mostrar a ação que pode ajudar. Só então conectar com criação. P01 e P16.')
t=t.replace('Dar a brincadeira inteira, a resposta do desafio ou as perguntas de observação dentro da peça. P07, P15 e P24.','Dar a orientação ou brincadeira inteira no post; o direct entrega um complemento. P10, P15 e P24.')
t=t.replace('Uma pausa que vira atividade; um jogo que precisa recomeçar; uma seta que muda o destino.','Uma pausa que vira atividade; uma dúvida que ganha nome; uma ideia que vira primeira tentativa.')
t=t.replace('Helena e Júlio mostram como pensam e preparam uma explicação.','Helena e Júlio conversam a partir de situações familiares e contam sua história confirmada.')
start=t.index('A amostra autenticada da Kodland');end=t.index('A busca também localizou',start)
t=t[:start]+'''A [análise de 50 publicações da Kodland](kodland-50-publicacoes-2026-10-12.md) ampliou a amostra anterior. Foram conferidas legendas, todas as telas de 16 carrosséis e três momentos visuais de 34 Reels. Vídeos internos e áudio não foram transcritos integralmente. A análise registra cada URL, cena, gancho, valor, convite e limite. Não acessamos a automação privada da marca nem seus resultados comerciais.

''' +t[end:]
start=t.index('## Mudanças por grupo');end=t.index('## Como avaliar depois de publicar',start)
t=t[:start]+'''## Mudanças aplicadas

- **Dores:** não saber começar, ajudar sem saber a resposta, explicar uma ideia, querer largar uma tentativa e organizar uma rotina possível.
- **Desejos:** iniciativa, escolhas próprias, participação da família, expressão e contato com tecnologia pelo lado de quem constrói.
- **Curiosidades:** como uma regra muda uma brincadeira, como uma contagem registra ações e como uma pequena mudança pode ser investigada.
- **Dicas:** dividir a tarefa, pedir uma opinião específica, registrar onde parou e representar uma ideia com desenhos.
- **Seis extras:** rotina das aulas, participação, observação de compreensão, pausa para fazer, pedido de ajuda e salvamento.

Cada peça faz a conexão com criação no desenvolvimento final. Os stories seguem o mesmo raciocínio. As mídias dos jogos são exemplos da ação, sem ocupar todas as capas.

## Conversa e contratação

O lote principal não termina em chamadas diretas de compra. Seis legendas têm uma extensão opcional por palavra-chave: PASSO, APOIO, IDEIA, TESTE, CRIAR e ROTINA. Antes de configurar e testar o ManyChat, as legendas principais funcionam sozinhas e são a versão publicável.

O [plano de direct](../postagens/06-manychat.md) contém abertura, seis entregas completas, escolha de continuar, apresentação das ofertas ao responsável, apoio, atendimento e encerramento. Entregar a atividade precede qualquer oferta. Não pedimos dados da criança nem inferimos aptidão. O método não virou venda em toda postagem nem sequência automática insistente.

As condições comerciais ficam nas mensagens de oferta e nos espaços permanentes: Desafio com pagamento único e 30 dias desde a aprovação; Comunidade por assinatura, incluindo o Desafio enquanto ativa. Planejar o fluxo não o configura nem autoriza disparos.

''' +t[end:]
t=t.replace('Os identificadores dos stories ajudam a distinguir a origem desses cliques, sem provar causalidade.','Os identificadores das entradas de direct ajudam a distinguir cliques quando configurados, sem provar causalidade.')
t=t.replace('Revisão aplicada aos roteiros, calendário, direção visual, links e P01.','Revisão aplicada aos roteiros, calendário, posicionamento, direção visual e links; novo P01 substitui a versão anterior. Conferir seu estado no controle de produção.')
t=t.replace('As mídias de P02–P30 e ST01–ST20','As mídias de P02–P30, E01–E06 e ST01–ST20')
write(f,t)

f=base/'pesquisas/kodland-50-publicacoes-2026-10-12.md';t=f.read_text(encoding='utf-8')
t=t.replace('Neste lote, cinco convites diretos de oferta no feed, além de três encaminhamentos institucionais. É uma decisão editorial, não uma regra universal.','Neste lote, entregar a orientação no feed e reservar a apresentação comercial aos espaços permanentes e ao direct solicitado.')
start=t.index('## Aplicação editorial verificável');end=t.index('## Registro das 50 publicações',start)
t=t[:start]+'''## Aplicação editorial verificável

A orientação final do usuário governa a adaptação: cotidiano dos pais primeiro; programação e criação de jogos como conclusão. P01 começa no “não consigo”, P06 na dificuldade de ajudar sem saber a resposta, P16 na vontade de abandonar uma tentativa e P30 no desejo de preparar o filho para construir com tecnologia.

As dicas e atividades são completas no feed. Seis palavras-chave solicitam complementos no direct, com venda apenas após escolha da pessoa. Não copiamos a sequência privada da Kodland; ela não foi acessada. Os destaques e fixados permanecem como apresentação do curso.

Os IDs nas notas abaixo indicam afinidades de adaptação, não reprodução da pauta ou abertura do concorrente. A [revisão de método e fontes](light-copy-valor-e-persuasao-2026-10-12.md) explica as decisões; a [copy vigente](../03-postagens.md) é a fonte de produção.

''' +t[end:]
write(f,t)
print('Links, direção e pesquisas consolidados.')
