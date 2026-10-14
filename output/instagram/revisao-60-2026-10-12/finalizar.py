from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[3]
BASE=ROOT/'docs/marketing/kids/comunidade-dos-criadores/instagram'
def write(path,text):path.write_text(text.rstrip()+'\n',encoding='utf-8')

guide='''# Direção visual e produção das 60 publicações

**Revisão: 12/10/2026.** Aplicar a P01–P60, aos extras E01–E06 e a ST01–ST20. A copy completa está no [calendário](../03-postagens.md); cada ficha define a cena. As imagens e os vídeos deste novo ciclo ainda serão produzidos.

## Uma imagem que explique alguma coisa

A capa mostra a situação ou o desejo da família antes de mostrar os comandos. No desenvolvimento, cada imagem acrescenta informação: a escolha que estava aberta, a dúvida encontrada, a diferença entre duas tentativas ou a reação do jogo. Não preencher a área da ilustração com um segundo texto repetindo o título.

Manter a identidade azul, branca e amarela do perfil e o texto escuro. Variar enquadramento e composição: conversa de família, objeto em detalhe, sequência desenhada, comparação de versões, relato em vídeo e captura aproximada. Evitar sessenta peças com o mesmo título, parágrafo e imagem pequena embaixo.

| Situação | Referências | O que a imagem precisa mostrar |
| --- | --- | --- |
| Uso de tela e interesse | P01, P03, P20 | O que a criança conta e o que o adulto passa a conhecer, sem imagem de culpa ou proibição |
| Dificuldade e ajuda | P07, P12, P16 | Um ponto concreto para investigar; o adulto escuta antes de operar |
| Ideia que começa pequena | P11, P37 | Uma cena ou sequência escolhida entre outras possibilidades |
| Decisão e comparação | P15, P36, P38 | A mudança e seu efeito, com o restante igual quando houver comparação |
| Rotina e continuidade | P24, P42, P56 | Horário possível, equipamento disponível e anotação para retomar |
| Relato real | P32, P33, P34, P35, P41 | Rosto e palavras da pessoa, com nome e relação corretamente identificados |
| Acompanhamento e conquista | P26, P43, P49, P53, P58 | Uma ação que a criança mostra e alguém interessado em ouvir |
| Escolha de uma atividade | P21, P25, P27, P55 | Critérios e condições que a família pode conferir, sem selo de aprovação inventado |

## Carrosséis e imagens únicas

- **1080 × 1350, 4:5**, PNG em sRGB. Numerar os arquivos pela ordem dos slides.
- Uma ideia por slide. Nas capas, título visível e cena grande. Na segunda tela, começar a entregar o raciocínio; no fim, concluir a ideia ou deixar uma ação pertinente.
- Margens de referência de 64–80 px; título de 64–90 px e corpo de 36–44 px, ajustados à composição. Conferir a leitura numa prévia de 360 px de largura. Não reduzir a fonte para encaixar texto em excesso.
- Aproximar a parte importante do jogo. Captura inteira serve para situar; não ajuda a ler um comando minúsculo.
- Diagramas precisam parecer diagramas. Não desenhar um controle inexistente como se pertencesse ao produto, nem inventar prints de conversa, métricas ou resultados escolares.
- Nas imagens únicas, a cena sustenta a frase: a despesa que precisa ser entendida em P27, a conquista compartilhada em P53, o adulto participando sem tomar o mouse em P58. A legenda desenvolve o argumento.
- No relato de Fernando, P33, a arte usa apenas a fala completa e a identificação previstas. O título da ficha é editorial; não acrescentá-lo de novo à arte.
- Aspas de abertura e fechamento seguem o mesmo estilo. Depoimentos não recebem colchetes e reticências de corte na arte; a origem registra os trechos. Preservar as palavras e o sentido.

## Reels

**1080 × 1920, 9:16**, MP4 H.264 e áudio AAC. O tempo de cada ficha é referência para leitura natural, não obrigação de acelerar a fala. Nos relatos, preservar a cadência do áudio original.

Começar pela ação ou pela fala prevista, sem vinheta longa. Mudar o plano quando muda a informação: situação, detalhe, explicação, resultado. Deixar tempo para perceber o clique e a reação que está sendo explicada. Sobreposição destaca uma ideia curta; legenda sincronizada transcreve a fala, em até duas linhas de cada vez.

Como referência conservadora de composição, manter informação essencial longe dos 250 px superiores, 320 px inferiores e 160 px da direita. Isso orienta a edição, não substitui conferir a prévia real do aplicativo. Capa e primeiro quadro precisam funcionar também em recortes menores.

Usar voz e áudio próprios ou autorizados. Trilha é opcional e fica abaixo da voz. Não sintetizar falas das pessoas dos depoimentos.

## Stories

**1080 × 1920.** São 20 sequências de três cartelas silenciosas, com texto integral e direção. Imagem em movimento pode servir de fundo se não prejudicar a leitura. O conteúdo continua compreensível sem som.

Não há enquete, resposta automática ou sticker comercial obrigatório neste lote. Não acrescentar chamadas improvisadas para preencher a parte inferior da tela. Manter os textos longe dos controles do aplicativo e ler a sequência inteira em tamanho de celular. Stories não aumentam a contagem de 60 publicações por dor e desejo.

## Origem das demonstrações

O [mapa de exemplos](08-exemplos-do-estudio.md) registra 11 bases de quatro extensões, suas regras e adaptações necessárias. Captar o jogo de verdade. Quando a ficha pede outra velocidade, tamanho de área, contraste ou posição de plataforma, preparar e executar essa versão antes de gravar. A captura deve mostrar o resultado descrito.

As bases do Estúdio ilustram possibilidades de criação. Não são automaticamente cursos disponíveis nem projetos das crianças citadas. A galeria completa também não é liberada a todo aluno por padrão. A Chave do Farol permanece nos conteúdos que apresentam o Desafio.

Guardar a autoria da demonstração no arquivo de produção. Nos posts que misturam relato e exemplo, como P34 e P35, a legenda diferencia explicitamente as duas fontes. Não acrescentar o rodapé Demonstração da equipe em toda arte. Os fixados preservam a orientação já aprovada de não usar esse rótulo.

## Cinco relatos usados neste ciclo

| Post | Pessoa e identificação | Fonte e recorte |
| --- | --- | --- |
| P32 | Harle, pai do Jeffrey | AV09, 69,48–77,28 s: iniciativa de procurar a próxima atividade |
| P33 | Fernando, aluno | AV06, 0–8,14 s: alegria de criar e querer ver o resultado |
| P34 | Daniel, pai do Rafael | AV11, 28,58–30,22 s: Daniel conta a frase do filho sobre mudar o jogo |
| P35 | Jeffrey, aluno | AV07, 101,42–109,34 s: expressar ideias pela criação |
| P41 | Flávia, mãe do Fernando | AV10, 56,14–62,14 s: mudança no acompanhamento necessário naquele momento |

Os caminhos dos vídeos, as palavras e os recortes estão em [Fontes dos relatos](../producao/destaques/avaliacoes/fontes-dos-relatos.txt). Usar retrato real e fala literal. P34 não apresenta o áudio como gravação do Rafael: quem fala é Daniel. A experiência de uma família não promete o mesmo resultado a todas.

## Cenas de família e imagens geradas

Usar as referências disponíveis de Helena, Júlio e das crianças quando a ficha pedir essas pessoas. Preservar fisionomia e não apresentar uma cena gerada como registro espontâneo ou prova de aprendizagem. Cenas fictícias representam situações possíveis; não recebem nome de aluno real sem correspondência.

As orientações de origem ficam no registro interno e no texto alternativo adequado à imagem. Não acrescentar a frase Cena ilustrativa como rodapé automático. Não gerar certificados, resultados, depoimentos, telas ou recursos inexistentes. Mídias de concorrentes servem à pesquisa e não entram nas publicações.

## Arquivos e revisão de produção

Guardar os materiais em `instagram/producao/postagens/pXX-assunto/`, com PNGs ou MP4, `legenda.txt`, `texto-alternativo.txt` e `publicacao.txt`. O registro informa versão da copy, fontes, responsáveis pela captação, estado e destino. Sem ZIP por padrão. Alterações no texto durante a edição também precisam voltar à ficha.

**P01 atual:** Seu filho sabe tudo sobre o jogo dos outros. Sua mídia ainda será produzida. A pasta `p01-nao-consigo/` contém versões anteriores, preservadas como históricas e fora da fila de publicação. Não reutilizar o ID do post para presumir que a arte antiga corresponde ao novo roteiro.

Antes de publicar, conferir a leitura em celular, acentos, sequência, transcrição, texto alternativo, identidade das pessoas e ação realmente mostrada. Para os extras, conferir a interface atual de salvamento e ajuda. Para chamadas opcionais de direct, testar o fluxo antes de incluir o convite.

Revisão de copy, mídia produzida, agendamento e publicação são estados diferentes. Os textos desta revisão estão completos; a legibilidade das artes e os cortes dos vídeos só poderão ser validados depois da produção.
'''
write(BASE/'postagens/05-direcao-visual-e-producao.md',guide)

readme=(BASE/'README.md').read_text(encoding='utf-8')
readme=readme.replace('| Ciclo de dez semanas | [03 · Postagens](03-postagens.md) | P01–P30: 14 carrosséis, dez Reels e seis imagens; seis extras E01–E06; 20 sequências de três stories |','| Ciclo de vinte semanas | [03 · Postagens](03-postagens.md) | P01–P60: 30 carrosséis, 18 Reels e 12 imagens; seis extras E01–E06; 20 sequências de três stories |\n| Cobertura da pesquisa | [30 dores e 30 desejos](postagens/12-mapa-cobertura.md) | Uma publicação principal exclusiva por necessidade, com copy e base identificadas |')
readme=readme.replace('Os três fixados F01–F03 ficam fora das 30 publicações P01–P30. Com os seis extras, são 36 posts de calendário; incluindo os três fixados, são 39 peças de feed disponíveis, além dos stories.', 'Os três fixados F01–F03 ficam fora das 60 publicações P01–P60. Com os seis extras, são 66 posts de calendário; os três fixados continuam separados dessa contagem.')
readme=readme.replace('O calendário usa dez semanas relativas: três posts e duas sequências de stories por semana.', 'O calendário sugere vinte semanas relativas: três posts e uma sequência de stories por semana, intercalando dores e desejos.')
readme=readme.replace('sem ocupar vagas dos trinta posts','sem ocupar vagas das 60 publicações principais')
readme=readme.replace('A [análise de 50 publicações](pesquisas/kodland-50-publicacoes-2026-10-12.md) e a [revisão de método de 12/10](pesquisas/light-copy-valor-e-persuasao-2026-10-12.md) fundamentam o calendário atual.', 'A [pesquisa de mercado e avatar](pesquisas/mercado-e-avatar-2026-10-12.md) fundamenta a cobertura das 60 necessidades. A [análise de 50 publicações](pesquisas/kodland-50-publicacoes-2026-10-12.md) e a [revisão de método de 12/10](pesquisas/light-copy-valor-e-persuasao-2026-10-12.md) permanecem como referências, com os limites registrados em cada documento.')
write(BASE/'README.md',readme)

production='''# Produção das postagens do calendário

**Revisão: 12/10/2026.** O novo ciclo tem 60 publicações principais, uma por dor e desejo, seis extras e 60 telas de stories. [Calendário vigente](../../03-postagens.md) · [Cobertura](../../postagens/12-mapa-cobertura.md).

| Material | Estado | Fonte |
| --- | --- | --- |
| P01–P60 | Copy, legenda e direção completas; novas mídias a produzir | [Fichas do ciclo](../../03-postagens.md#copy-completa-para-produzir) |
| E01–E06 | Copy e direção completas; mídia a produzir conforme necessidade | [Extras](../../postagens/07-extras-para-familias.md) |
| ST01–ST20 | 60 cartelas reescritas; imagens a produzir | [Stories](../../postagens/04-stories.md) |
| ManyChat | Seis entregas e ramificações escritas; configuração e teste pendentes | [Plano](../../postagens/06-manychat.md) |
| P01 antigo: resumo escolar | Histórico, fora da fila de publicação. Seus seis PNGs não correspondem ao P01 atual | [Prévia histórica](p01-nao-consigo/index.html) e [arquivos preservados](p01-nao-consigo/) |

O **P01 atual** abre com “Seu filho sabe tudo sobre o jogo dos outros”. O antigo carrossel da tarefa escolar foi substituído nesta revisão. A chamada PASSO agora pertence ao **P13**, cujo texto também foi atualizado. Conferir ID, abertura e versão antes de reutilizar qualquer arquivo antigo.

As mídias históricas continuam disponíveis para consulta. A arte antiga não foi apagada nem declarada pronta para o novo texto. Não reutilizar legendas ou automações antigas apenas porque o nome do arquivo contém P01.

As capturas dos jogos precisam mostrar as ações previstas nas fichas. Os recortes de depoimento usam os vídeos originais com a identificação correta. A composição final segue a [direção visual](../../postagens/05-direcao-visual-e-producao.md).

Nenhum material deste novo ciclo foi agendado ou publicado. Não houve envio de mensagens ou ativação de automação.
'''
write(BASE/'producao/postagens/README.md',production)
old=BASE/'producao/postagens/p01-nao-consigo/publicacao.txt'
text=old.read_text(encoding='utf-8')
notice='HISTÓRICO, FORA DA FILA DE PUBLICAÇÃO — revisão das 60 necessidades, 12/10/2026.\nEstes PNGs e esta legenda são do roteiro anterior. O novo P01 é “Seu filho sabe tudo sobre o jogo dos outros” e ainda precisa de mídia. PASSO agora pertence ao P13. Consulte ../../README.md e o calendário antes de produzir.\n\nINSTRUÇÕES HISTÓRICAS ABAIXO, NÃO VIGENTES:\n\n'
if not text.startswith('HISTÓRICO, FORA'):write(old,notice+text)

history=BASE/'historico/2026-10-12-antes-60-dores-desejos/LEIA-ME.md'
write(history,'# Versão anterior à cobertura das 60 necessidades\n\nCópia preservada em 12/10/2026, antes de reescrever o calendário com uma publicação para cada dor e cada desejo. Conteúdo histórico, fora da fila de produção. A versão vigente está em [03 · Postagens](../../03-postagens.md). O backup preserva documentos; as mídias antigas de P01 continuam na pasta de produção com aviso de versão histórica.')
print('Direção, guia principal e estado de produção atualizados.')
