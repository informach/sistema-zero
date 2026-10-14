from pathlib import Path
import re

root = Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
main = root / '04-postagens-manychat.md'
s = main.read_text(encoding='utf-8')
s = s.replace('> “Como você descobriu isso?” rende uma conversa diferente de “você já estudou?”.', '> A descoberta de um atalho rende uma boa conversa sobre como seu filho aprende.')
s = s.replace('sem precisar escolher agora uma área para seguir', 'e descobrir quais partes quer explorar mais')
s = s.replace('> “O que você quer ser?” é uma conversa. “Como você resolveu isso?” abre outra.', '> Antes de escolher uma profissão, seu filho já tem decisões para tomar num projeto.')
s = s.replace('o personagem anda e o cenário aparece, mas a vez não passa', 'o cenário aparece e o lançamento funciona, mas a vez não passa')
s = s.replace('no slide 6 vêm de uma aula publicada', 'no slide 6 vêm de uma aula publicada')
main.write_text(s, encoding='utf-8')

(root / 'postagens/15-guia-manychat.md').write_text('''# Postagens ManyChat (MC01 a MC14): direção de copy

**Revisão de 13/10/2026.** As [14 peças completas](../04-postagens-manychat.md) formam uma categoria separada do calendário comum. Esta revisão preserva o interesse e a força dos ganchos, melhora os argumentos e encurta a apresentação no direct. A [vitrine de exemplos](14-vitrine-de-exemplos.md) orienta a variedade visual. O [Guia de copy](13-guia-de-copy.md) traz a direção de linguagem; as diferenças desta campanha estão abaixo.

## O que preservar

Cada referência foi escolhida por uma ideia que interessa ao responsável: vontade de aprender, autonomia, interesses, rotina, futuro ou possibilidades de criação. Essa ideia continua reconhecível. O texto desenvolve o assunto na vida da família antes de mostrar uma aplicação na plataforma.

Manter capas específicas, situações familiares e descobertas que deem vontade de continuar. Os argumentos devem sustentar a força da capa. Uma afirmação sobre memória, atenção, motivação ou talento precisa de evidência; observar interesse por um jogo não permite explicar toda a aprendizagem da criança.

## Como desenvolver a peça

1. Abrir com a ideia da referência, na voz da marca. Preservar os ganchos aprovados e escrever desenvolvimento próprio.
2. Mostrar uma situação reconhecível e desenvolver o que o pai pode perceber ou fazer. A explicação pode ser uma reflexão, uma descoberta ou uma orientação prática. Se for dica, precisa dizer como aplicá-la.
3. Conectar a criação de jogos ao assunto por uma ação da criança: escolher, planejar, montar, testar, comparar ou explicar. Descrever uma regra do jogo só ajuda quando fica claro o que ela faz ao construí-la.
4. Mostrar uma consequência coerente com aquela peça. Pode ser uma escolha que ganhou forma, uma tentativa mais específica, uma conversa em família ou um relato real. Variar o fechamento; a cena de chamar os pais para jogar não é obrigatória.
5. Convidar a conhecer no direct um primeiro projeto guiado. A palavra identifica a entrada. Não prometer arquivo, diagnóstico ou tutorial do jogo mostrado.

Uma nave agir sozinha não comprova autonomia da criança. Uma fazenda ter horários não comprova organização na vida real. Errar durante uma partida não demonstra o processo de criar e testar. Mostrar a decisão e a tentativa de quem programa.

Tutorial, aula e pedido de ajuda fazem parte do aprendizado. Os momentos de dificuldade orientam o apoio; não servem para rotular a criança ou acusar a família. Depoimentos permanecem literais e identificados como experiências daquela pessoa.

## Legendas e Reels

A legenda acrescenta um exemplo, uma observação, uma pergunta para a conversa ou uma aplicação do tema. Evitar recontar todos os slides ou descrever novamente a mesma tela. A última linha mantém o convite e a palavra do post.

Nos Reels, contar as palavras de cada trecho e reservar tempo para observar a demonstração. Os tempos são estimativas de roteiro, a confirmar numa leitura natural antes de gravar. As legendas de acessibilidade acompanham a fala inteira; textos curtos na tela são complementos.

## Possibilidades e primeiro passo

Os posts podem mostrar mundos 3D, desenho, personagens, aventuras e outros exemplos do Estúdio. Eles demonstram possibilidades da plataforma, não um catálogo de cursos disponíveis nem tudo o que acompanha a compra avulsa.

Minecraft e Roblox entram como interesses e inspirações. A criação acontece nas ferramentas do Sistema Zero. O personagem 3D indicado pela Helena é mostrado na captura real do Molda, preservando a interface e sem atribuição de autoria não confirmada. Pinta mostra desenho 2D.

A Chave do Farol aparece no direct como um primeiro projeto guiado. O convite já deixa claro que apresenta um começo de criação de jogos. Para desenho e mundos 3D, ligar esse começo a aprender comandos e testar reações; não prometer desenho livre, modelagem ou reprodução do jogo mostrado no Desafio.

Ficam fora das adaptações: aula grátis, cupons, bolsas, testes de perfil, prazos artificiais, aulas ao vivo e integrações com plataformas que não oferecemos.

## Direct curto

O [fluxo](../campanhas/manychat-desafio/fluxo-curto.md) mantém duas mensagens:

- **DM1:** identifica brevemente a resposta automática, liga o interesse do post ao primeiro projeto e apresenta o botão interno **Ver o primeiro passo**. Evitar repetir a tese inteira do conteúdo.
- **DM2:** nomeia o Desafio e A Chave do Farol, descreve uma ação da criança, informa aulas gravadas no computador e orientação para 9 a 14 anos. Uma frase distingue as possibilidades mostradas do projeto oferecido. Mantém pagamento único, 30 dias após aprovação do pagamento e garantia de 7 dias a partir da compra.
- **Botão de site:** **Conhecer o Desafio**, com a URL e a UTM próprias da peça. A página detalha funcionamento, requisitos, preço e condições.

A Comunidade só aparece na apresentação para explicar a continuidade, quando isso ajuda a alinhar a expectativa. Planos, ferramentas liberadas por avanço e inclusão do Desafio ficam na resposta a quem pedir mais opções; não criar uma segunda venda dentro da DM2.

## Mapa das ideias e palavras

A [análise das referências](../campanhas/manychat-desafio/analise-referencias.md) preserva as observações das publicações e legendas originais. Este quadro registra as adaptações atuais.

| ID | Ideia preservada | Aplicação própria | Palavra |
| --- | --- | --- | --- |
| MC01 | Gostar de aprender além da obrigação de estudar | Objetivo de criação e comparação de pulos na Base da Lua; sem conclusão sobre memória ou física real da Lua | JEITO |
| MC02 | Decisão humana junto da tecnologia | Concerto de março de 2026 e regras para um adversário automático; sem prometer ensino de IA | MAESTRO |
| MC03 | Retomar a rotina depois das férias | Horário, tarefa delimitada e ponto de retomada; programação da fazenda em etapas | RITMO |
| MC04 | Conversar sobre o jogo abre ideias de criação | Opinião sobre uma fase, mudança e teste; percurso do Reino Cogumelo | CRIADOR |
| MC05 | Familiaridade com aplicativos e autonomia | Escolher uma regra para conferir e testar reações da nave, com orientação | AUTONOMIA |
| MC06 | Perceber interesses nas brincadeiras | Experimentar história, desenho e regras em Bichinhos do Quintal; sem classificar talento | SINAIS |
| MC07 | Um projeto para criar nas férias | Comemoração no Boliche na Praça e relato literal da Débora, sem atribuir o exemplo a ela | FERIAS |
| MC08 | Interesse por Roblox e começo do zero | Parkour do Vulcão, Salto nas Nuvens e captura do Molda; ferramentas próprias | PRIMEIRO |
| MC09 | Interesse por Minecraft e construção de mundos | Mundo de Blocos, Mina de Cristais e Molda; comandos explicados como instruções | MUNDO |
| MC10 | Desenhos e histórias que viram criação digital | Pinta, Estúdio e Molda; primeiro convite para programar uma aventura | PERSONAGEM |
| MC11 | Uma família muda parte do uso da tela | História de Helena, Júlio e André; Duelo de Heróis como demonstração separada | TELA |
| MC12 | Preparar para o futuro | Planejar, testar duas respostas e explicar escolhas na Vila das Vocações | FUTURO |
| MC13 | Jogos em projetos escolares | Caso de 2023 com fonte primária; aviso programado no Meu Mundo como exemplo próprio | APRENDER |
| MC14 | Ajudar diante de uma tentativa que falhou | Localizar uma parte, testar a troca de vez e usar recursos de orientação | TENTATIVA |

MC03 e MC07 são sazonais. As fontes de notícias e relatos ficam nas notas de produção. Antes de produzir, conferir este guia, a copy, as notas e o [inventário visual](../campanhas/manychat-desafio/assets.md) juntos.
''', encoding='utf-8')

flow = root / 'campanhas/manychat-desafio/fluxo-curto.md'
t = flow.read_text(encoding='utf-8')
t = t.replace('Os posts MC08, MC09, MC10, MC12 e MC13 mostram possibilidades mais amplas. Suas DMs esclarecem positivamente o projeto guiado oferecido e a continuidade na Comunidade.', 'As 14 peças mostram possibilidades além do primeiro projeto. A DM2 nomeia o projeto incluído e usa uma frase curta para situar o exemplo mostrado. Nas entradas sobre desenho ou mundos 3D, identifica essas possibilidades como continuidade na Comunidade.')
marker = '## Por que há um botão interno'
t = t.replace(marker, '''## Tamanho e função das mensagens

A DM1 faz uma ligação breve com o interesse daquele post e identifica a resposta automática. O botão interno entrega a apresentação prometida. Evitar um resumo completo da publicação antes do toque.

A DM2 apresenta o Desafio, uma ação no projeto A Chave do Farol, aulas gravadas no computador e orientação para 9 a 14 anos. Uma frase situa as possibilidades mais amplas. As condições essenciais ficam claras: pagamento único, acesso por 30 dias após aprovação do pagamento e garantia de 7 dias a partir da compra. O botão leva à página que detalha requisitos, preço, conteúdo e condições.

O fluxo principal apresenta uma oferta. A assinatura, sua inclusão do Desafio e os detalhes das ferramentas ficam em D02 para quem pedir continuidade. Essa resposta permanece completa para evitar compra duplicada de quem já é assinante.

As palavras e UTMs foram mantidas nesta revisão. Não há nova etapa, questionário ou automação ativada. Na produção, conferir a apresentação de cada DM como um único bloco no celular.

''' + marker)
flow.write_text(t, encoding='utf-8')

readme = root / 'campanhas/manychat-desafio/README.md'
t = readme.read_text(encoding='utf-8')
t = t.replace('Seu filho ama Minecraft. Ele passa horas construindo, sempre dentro das regras de outra pessoa.', 'Seu filho ama Minecraft. A próxima invenção dele pode ser um jogo inteiro.')
t = t.replace('No tempo de tela, o que ele faz pesa mais que o relógio.', 'Ele já gosta de jogar. Imagine um jogo criado por ele.')
t = t.replace('cerca de 46 s, com Helena', 'cerca de 50 s, com Helena')
t = t.replace('Reel 9:16, cerca de 50 s | TELA', 'Reel 9:16, cerca de 51 s | TELA')
t = t.replace('Reel 9:16, cerca de 50 s | FUTURO', 'Reel 9:16, cerca de 48 s | FUTURO')
t = t.replace('reescritos em 13/10/2026 para devolver a ideia de cada referência', 'revisados em 13/10/2026 para preservar os ganchos, fortalecer os argumentos, complementar as legendas e encurtar o direct')
t = t.replace('As seis entradas do calendário continuam', 'A DM2 mantém uma apresentação breve do primeiro projeto e das condições essenciais. A continuidade entra numa frase que situa as possibilidades mostradas; detalhes da assinatura ficam na resposta a quem pedir outras opções. As palavras e UTMs foram preservadas.\n\nAs seis entradas do calendário continuam')
readme.write_text(t, encoding='utf-8')

analysis = root / 'campanhas/manychat-desafio/analise-referencias.md'
t = analysis.read_text(encoding='utf-8')
adaptations = {
1: 'objetivo de criação, comparação entre os pulos da Base da Lua e do estilo floresta, observação e escolha. Evitar conclusão sobre memória, teoria de estilos de aprendizagem ou tratar a física do jogo como retrato da Lua. JEITO apresenta um primeiro projeto guiado.',
2: 'manter o concerto documentado de março de 2026 e mostrar uma regra humana por trás do adversário automático da Guerra de Gorilas vs Robô. Não reutilizar o vídeo, afirmar uma limitação científica universal da IA nem anunciar aulas de IA. MAESTRO apresenta um começo de criação de jogos.',
3: 'combinar horário, uma tarefa de construção e o ponto de retomada. Na Fazenda Feliz Profissional, programar e testar o plantio é uma etapa delimitada; o ciclo virtual da fazenda não comprova mudança de hábitos. Aulas gravadas permitem escolher o horário. RITMO apresenta o começo guiado, sem promoção ou material extra.',
4: 'perguntar pela mudança que faria, pela construção da fase e por uma versão própria. Reino Cogumelo mostra uma sequência de obstáculos e abre a discussão sobre testar escolhas. CRIADOR apresenta o primeiro projeto, sem importar aula gratuita.',
5: 'quatro momentos que ajudam a escolher o apoio: compreender passos, decidir uma mudança, isolar um teste e ter espaço para criar. Caça Estelar Profissional permite mostrar o planejamento e teste de duas reações da nave. Tutorial e ajuda são recursos. AUTONOMIA nomeia a intenção, sem promessa de independência imediata.',
6: 'interesses por histórias, mundos, desafios e padrões encontram espaço em Bichinhos do Quintal. A criança pode experimentar todas as partes; testar a tabela de tipos não classifica talento. SINAIS apresenta a atividade sem diagnóstico, seleção ou bolsa.',
7: 'fala da Helena, Boliche na Praça para mostrar uma comemoração programada e relato literal da Débora sobre seu próprio projeto. Não atribuir o boliche à Débora nem importar história de outra família, formato ao vivo ou cupom. FERIAS leva ao primeiro projeto guiado.',
8: 'interesse por Roblox, uma regra de cada vez e testes; Parkour do Vulcão, Salto nas Nuvens e captura real do Molda mostram possibilidades próprias. Não prometer programação dentro do Roblox. PRIMEIRO apresenta uma aventura guiada 2D, com continuidade situada no direct.',
9: 'Mundo de Blocos Profissional, Mina de Cristais e print real do boneco no Molda. Explicar os comandos como instruções; a familiaridade com blocos de construção não equivale a saber programar. Não importar módulos ou integração com Minecraft. MUNDO apresenta o primeiro projeto, com 3D situado como continuidade.',
10: 'Pinta para desenho e animação, arte como cenário no Estúdio e Molda para modelagem. A história ganha escolhas de quem joga. PERSONAGEM convida a um primeiro projeto de programação; não promete desenho livre no Desafio ou conversão automática entre artes.',
11: 'história da Helena e do Júlio com André, reservando parte do tempo para criar. Duelo de Heróis é demonstração atual separada. Sem hierarquia universal entre duração e atividade, depoimento inventado ou resultados escolares garantidos. TELA apresenta o primeiro projeto.',
12: 'decisões presentes: planejar, programar duas respostas e testar cada caminho na Vila das Vocações. O tema da vila não define a futura profissão da criança. Sem quiz, percentuais, medo ou garantia de carreira. FUTURO apresenta a experiência guiada.',
13: 'Schools Reinventing Cities, do Minecraft Education com C40, documentado em 2023: sete cidades e sugestão de 8 a 12 semanas, com fonte primária nas notas da peça. Meu Mundo mostra um aviso programado como exemplo próprio. Sem transportar números não conferidos ou oferecer programação dentro do Minecraft. APRENDER apresenta o primeiro projeto.',
14: 'localizar onde a tentativa falhou. Na Guerra de Gorilas, quem cria testa de propósito um lançamento errado para conferir a passagem de vez. As aulas aparecem separadas, com Uma pista e Verificar esta parte. Não diagnosticar a causa da dificuldade nem prometer confiança garantida. TENTATIVA apresenta o começo por etapas.',
}
parts = re.split(r'(?=^## MC\d+)', t, flags=re.M)
for i in range(1, 15):
    parts[i] = re.sub(r'(?<=\*\*Adaptação:\*\* )[^\n]+', adaptations[i], parts[i], count=1)
t = ''.join(parts)
t = t.replace('Personagens, cenários, jogos de aventura, memória, corrida e mundos 3D variam as demonstrações.', 'Personagens, cenários, aventuras, fazenda, naves, criaturas, boliche e mundos 3D variam as demonstrações.')
t = t.replace('**Próxima etapa:** revisar [as copies reunidas](../../04-postagens-manychat.md), comparando cada objetivo com o link original. Imagens, vídeos e automação só vêm depois.', '**Atualização editorial:** as adaptações acima acompanham a revisão das [copies reunidas](../../04-postagens-manychat.md) em 13/10/2026. As observações das publicações e legendas de referência foram preservadas; não houve uma nova inspeção do Instagram nesta revisão. Imagens, gravações e automação continuam como etapa posterior.')
analysis.write_text(t, encoding='utf-8')

assets = root / 'campanhas/manychat-desafio/assets.md'
t = assets.read_text(encoding='utf-8')
start = t.index('| Peças | Base |')
end = t.index('\n## Padrão visual', start)
t = t[:start] + '''| Peças | Base | O que preparar ou conferir |
| --- | --- | --- |
| MC01 | Base da Lua | Comparar pulo no estilo floresta e Lua numa cópia, sem jetpack; mostrar o bloco e o resultado. A configuração do jogo não representa a gravidade real da Lua. |
| MC02 | Guerra de Gorilas vs Robô | Regra da vez automática, arremesso e passagem de vez. O bloco calcula o lançamento; não atribuir à criança a programação de seu algoritmo interno. Concerto citado com data, sem imagens não licenciadas. |
| MC03 | Fazenda Feliz Profissional | Teste de plantio na terra arada e sem arar; depois, tarefa de rega. Anotação de etapa concluída e próxima etapa. Não anunciar um curso de fazenda. |
| MC04 | Reino Cogumelo | Fase 1-1: espaço inicial, canos crescentes, toque curto e pulo segurado. Relacionar o caminho à escolha de quem monta a fase. |
| MC05 | Caça Estelar Profissional | Dois testes: aproximação e nave atingida. Mostrar a regra da reação investigada. Se houver falha encenada, preparar cópia própria. |
| MC06 | Bichinhos do Quintal | Criaturas, cenário e três combinações da tabela de tipos. Mostrar teste de cada combinação; nenhuma classificação de talento da criança. |
| MC07 | Boliche na Praça | Dez pinos derrubados, mensagem e câmera tremendo. Legenda fiel à fala da Helena e da Débora. O boliche não é atribuído à Débora. A mesma peça pode acompanhar férias de verão ou de julho. |
| MC08 | Parkour do Vulcão / Salto nas Nuvens / Molda | Queda e terceira gema no parkour; percurso no céu e captura real do personagem 3D em imagens separadas. Não anunciar integração com Roblox ou curso desses exemplos. |
| MC09 | Mundo de Blocos Profissional / Mina de Cristais / Molda | Clique cria bloco perto do herói; pedra e cristal têm reações diferentes; personagem 3D mostrado no editor. A ponte imaginada na legenda é uma ideia de criação, não comportamento atribuído a esses exemplos. |
| MC10 | Pinta / Cenário do meu desenho / Molda | Desenho e animação no Pinta; arte importada como cenário numa cópia do exemplo e herói movendo-se à frente; modelagem mostrada em outra imagem. Invisibilidade na legenda é uma ideia para discussão, não uma entrega do Desafio. |
| MC11 | Duelo de Heróis | Cronômetro chega ao fim e compara as vidas. Manter a demonstração separada da foto e do depoimento do André; não apresentar como jogo dele. |
| MC12 | Vila das Vocações | Testar Padeiro e Mecânico e seus dois destinos. Corrigir os acentos apenas na cópia de captação e registrar a adaptação. Sem teste de profissão da criança. |
| MC13 | Meu Mundo | Carrinho entra na zona do lago e dispara o aviso. Corrigir acento na cópia e registrar. As imagens da rua são ilustração própria, separadas do caso escolar de 2023. |
| MC14 | Guerra de Gorilas / aula publicada | Montagem e teste da passagem de vez após erro. Se mostrar falha, preparar cópia. Captura da aula em quadro distinto, com objetivos configurados para exibir Uma pista e Verificar esta parte. |

Guardar registro das adaptações de demonstração no arquivo de produção. Mostrar o resultado funcionando antes de fazer capturas; direção de cena ainda não é evidência de execução. Os projetos de exemplo não são automaticamente cursos ofertados.
''' + t[end:]
assets.write_text(t, encoding='utf-8')
print('Guias, fluxo, índice, análise das referências e inventário visual sincronizados.')
