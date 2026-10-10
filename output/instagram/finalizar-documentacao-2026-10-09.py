import json, re
from pathlib import Path

base=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
work=Path('output/instagram')
avwork=work/'avaliacoes/2026-10-09'
av=json.loads((avwork/'manifesto.json').read_text(encoding='utf-8'))
alwork=work/'alunos/2026-10-09'
al=json.loads((alwork/'manifesto.json').read_text(encoding='utf-8'))
order=' → '.join(s['id'] for s in av['stories'])
section=f'''## Avaliações

**Função:** reunir relatos de crianças, adultos e responsáveis sobre suas experiências. A seleção atual reúne oito pessoas em dez cartelas de relatos. As cinco crianças alternam com os responsáveis. Daniel, pai do Rafael, aparece em duas telas sobre organização e criatividade; Harle, pai do Jeffrey, fala de responsabilidade; Flávia, mãe do Fernando, aparece em duas telas sobre independência e uso da tela para criar. As relações familiares foram identificadas pelo usuário. Cada cartela traz uma ideia principal e o trecho que a sustenta, com espaço para leitura.

**Produção — 09/10/2026:** doze stories, em ordem: {order}. A primeira imagem reúne os oito rostos; a última convida a conhecer o Farol. Os IDs do roteiro permanecem estáveis, e os nomes dos arquivos de 01 a 12 indicam a ordem de publicação. [PNGs e orientações](producao/destaques/avaliacoes/). As fotos dos responsáveis foram extraídas dos vídeos enviados pelo usuário, preservando sua aparência. As referências de Fernando e Jeffrey também foram fornecidas pelo usuário.

**Falas e contexto:** os relatos de Rafael, Débora e André foram localizados no histórico Git c3c142e8f^, arquivo packages/funnel/src/components/funnel/oferta/DesafioOfertaBody.astro, seção DEPOIMENTOS. O usuário confirmou que as três crianças também testaram o Farol e reafirmaram suas falas. Os cinco novos vídeos foram transcritos, e os trechos selecionados passaram por uma segunda transcrição. Os arquivos, segundos de cada recorte e imagens de origem estão em [Fontes dos relatos](producao/destaques/avaliacoes/fontes-dos-relatos.txt). A pontuação foi ajustada para leitura. Conforme orientação do usuário, os recortes são apresentados sem reticências ou colchetes nas cartelas, preservando as palavras e o sentido. Os segundos de cada recorte permanecem no arquivo de fontes. As aspas de abertura e fechamento recebem o mesmo estilo gráfico, fora do texto. Nos relatos dos responsáveis, a linha abaixo do vínculo identifica o tema; ela é editorial e fica fora das aspas. Os vídeos não confirmam especificamente uma experiência com o Farol. A percepção dos pais sobre lógica, matemática, criatividade e responsabilidade permanece atribuída aos próprios filhos.

**Identificação:** nome, Aluno/Aluna ou relação do responsável com a criança, e contexto do relato. André e Débora aparecem como alunos, conforme orientação do usuário. Os resultados são experiências de quem fala. Não acrescentar estrelas, nota média, idade, compra comprovada ou resultado típico. “No último dia” é parte da fala de Débora, não uma promessa de conclusão em prazo fixo. Os títulos dos arquivos de vídeo são referências internas; não viram chamadas nem promessas de resultado.
'''
for s in av['stories']:
    if s['type']=='intro':
        section+=f"\n### {s['id']} · Apresentação dos relatos\n\n**Cartela. Título:** {s['title'].replace('<br>',' ')}\n\n**Cena:** montagem com os rostos de Rafael, Daniel, Débora, Jeffrey, Harle, André, Fernando e Flávia. O texto não fixa nomes nem quantidade, para continuar válido com novos relatos.\n\n> {' '.join(s['paragraphs'])}\n"
    elif s['type']=='quote':
        section+=f"\n### {s['id']} · {s['name']}\n\n**Cartela. Identificação completa:** {s['name']} · {s['role']} · {s['context'].replace('<br>',' ')}\n\n> “{s['quote']}”\n"
    else:
        section+=f"\n### {s['id']} · Conhecer o projeto\n\n**Cartela. Título:** {s['title'].replace('<br>',' ')} **Sticker:** {s['sticker']['label']} → L0, origem av05.\n\n> {s['paragraphs'][0]}\n"
f=base/'01-destaques.md'
d=f.read_text(encoding='utf-8')
d=d[:d.index('## Avaliações')]+section+'\n'+d[d.index('## Sobre nós'):]
d=d.replace('**Revisão: 08/10/2026.**','**Revisão: 09/10/2026.**').replace('**53 telas na seleção inicial**','**59 telas na seleção inicial**')
d=d.replace('**59 telas na seleção inicial**','**61 telas na seleção inicial**')
d=d.replace('A abertura usa a cena do casal já produzida, e o convite mostra o jogo.', 'A abertura reúne as fotos dos cinco alunos, e o convite mostra o jogo.')
d=d.replace('**Vídeo do casal. Sobreposição:** Alunos na Comunidade dos Criadores.', '**Cartela com as fotos de Rafael, Jeffrey, Débora, André e Fernando. Título:** Alunos na Comunidade dos Criadores.')
f.write_text(d,encoding='utf-8')

f=base/'03-postagens.md';d=f.read_text(encoding='utf-8')
d=d.replace('Manter as falas e os cortes sinalizados por […], com os temas e contextos do guia.', 'Manter as falas, os temas e os contextos do guia. Não colocar reticências ou colchetes nas cartelas; consultar os recortes no arquivo de fontes. As duas aspas recebem o mesmo estilo gráfico.')
d=d.replace('12 posts: sete Reels e cinco carrosséis','12 posts: cinco Reels e sete carrosséis').replace('com 62 telas**: 53','com 68 telas**: 59')
d=d.replace('F01 · O primeiro jogo do seu filho | Reel; apresentar projeto e método','F01 · O primeiro jogo do seu filho | Carrossel 4:5; apresentar projeto e método')
d=d.replace('F02 · Alunos em atividade | Reel; participação real nas atividades | S04 · Avaliações, cinco telas','F02 · Alunos em atividade | Carrossel 4:5; imagens provisórias dos cinco alunos | S04 · Avaliações, dez telas')
d=d.replace('S08 · Alunos e Nave Contra Asteroides, sete telas neste lote','S08 · Alunos e Nave Contra Asteroides, nove telas neste lote')
d=d.replace('Esses dias têm quatro, oito e sete telas, respectivamente; os demais têm três a cinco.', 'Esses dias têm quatro, nove e sete telas, respectivamente; Avaliações tem dez telas. As demais sequências mantêm as quantidades indicadas no calendário.')
d=d.replace(' F02B é uma alternativa completa em Fixados, usada no lugar de F02 somente se a equipe adiar a montagem dos vídeos de alunos.', ' F01, F02 e F03 são os três carrosséis 4:5; F02 inclui os cinco alunos. A antiga alternativa F02B permanece apenas no histórico de produção.')
d=d.replace('**Cinco stories, em ordem:** AV01 → AV02 → AV03 → AV04 → AV05. **Copy integral:** [Avaliações](01-destaques.md#avaliações). **Salvar:** Avaliações. **Link:** AV05, L0. Manter os nomes, a identificação como aluno ou aluna e o Desafio do Primeiro Jogo junto dos relatos.', f'**Dez stories, em ordem:** {order}. **Copy integral:** [Avaliações](01-destaques.md#avaliações). **Salvar:** Avaliações. **Link:** AV05, L0, no arquivo 10. São cinco crianças e três responsáveis, com foto, nome, participação e contexto próprios. A abertura reúne os oito rostos. Manter as falas literais e os contextos do guia; os novos vídeos não são identificados como relatos específicos do Farol.')
d=d.replace('**Sete stories neste lote, em dois blocos completos:** AL01 → AL02 → AL04 → AL05 → AL06; depois PJ05 → PJ06. AL03 (Jeffrey) fica para uma próxima inclusão, conforme orientação do responsável em 09/10/2026.', '**Nove stories neste lote, em dois blocos completos:** AL01 → AL02 → AL03 → AL04 → AL05 → AL07 → AL06; depois PJ05 → PJ06.')
d=d.replace('**Salvar:** AL01, AL02, AL04, AL05 e AL06 em Alunos;', '**Salvar:** AL01, AL02, AL03, AL04, AL05, AL07 e AL06 em Alunos;')
d=d.replace('imagens provisórias de Rafael, Débora e André, geradas', 'imagens provisórias de Rafael, Jeffrey, Débora, André e Fernando, geradas')
d=d.replace('A abertura não enumera os participantes, e novos registros', 'A abertura reúne as cinco fotos, sem enumerar participantes na copy, e novos registros')
d=d.replace('com 68 telas**: 59','com 70 telas**: 61').replace('S04 · Avaliações, dez telas','S04 · Avaliações, doze telas').replace('Avaliações tem dez telas','Avaliações tem doze telas')
d=re.sub(r'\*\*Dez stories, em ordem:\*\*[^\n]+', f'**Doze stories, em ordem:** {order}. **Copy integral:** [Avaliações](01-destaques.md#avaliações). **Salvar:** Avaliações. **Link:** AV05, L0, no arquivo 12. As cinco crianças alternam com cinco cartelas de responsáveis: duas de Daniel, uma de Harle e duas de Flávia. Os relatos mostram organização, criatividade, responsabilidade, independência e uso da tela para criar. A abertura reúne oito pessoas. Manter as falas, os temas e os contextos do guia. Não colocar reticências ou colchetes nas cartelas; consultar os recortes no arquivo de fontes. As duas aspas recebem o mesmo estilo gráfico.', d)
f.write_text(d,encoding='utf-8')

f=base/'README.md';d=f.read_text(encoding='utf-8')
d=d.replace('F01, F02 e F03, com capas, roteiros completos e legendas; alternativa integral de F02 com demonstração da equipe','F01, F02 e F03 em carrosséis 4:5, com 24 PNGs, copy completa, legendas e texto alternativo')
a=d.index('Alunos é um destaque vivo de crianças em atividade.')
b=d.index('\n\n## Direção de escrita',a)
d=d[:a]+'''Alunos é um destaque vivo de crianças em atividade. A produção atual tem sete stories: abertura com as cinco fotos, cenas provisórias de Rafael, Jeffrey, Débora, André e Fernando e convite final. Os [PNGs e as cinco molduras para vídeos](producao/destaques/alunos/) estão prontos. As cenas foram geradas com as referências das crianças a pedido do responsável e serão trocadas pelos vídeos. A abertura não fixa nomes ou quantidade no texto; novos registros entram conforme forem selecionados. Cada criança tem sua identificação e uma legenda correspondente à ação: aprender, explorar, personalizar, testar ou mostrar o que fez.

Avaliações reúne oito pessoas em doze stories, alternando as cinco crianças com cinco cartelas dos responsáveis. Daniel, pai do Rafael, fala de organização e criatividade; Harle, pai do Jeffrey, de responsabilidade; Flávia, mãe do Fernando, de independência e uso da tela para criar. Daniel e Flávia têm duas telas cada, com um tema por tela. A abertura mostra os oito rostos. Os [PNGs, fontes das falas e orientações](producao/destaques/avaliacoes/) incluem os retratos dos responsáveis extraídos dos vídeos. Nas cartelas, usar nome, Aluno/Aluna ou relação do responsável com a criança, e o tema ou contexto confirmado. As cartelas usam aspas de abertura e fechamento com o mesmo estilo gráfico e não exibem reticências ou colchetes. Os recortes ficam documentados no arquivo de fontes. A copy completa está no guia 01.

Os [três fixados](producao/fixados/) somam 24 imagens de 1080 × 1350: oito em F01, sete em F02 e nove em F03. Cada pasta inclui a legenda completa, o texto alternativo de cada slide e as instruções de publicação.''' +d[b:]
f.write_text(d,encoding='utf-8')

f=base/'apoio/links-e-publicacao.md';d=f.read_text(encoding='utf-8')
d=d.replace('Preservar os cortes indicados por […].', 'Apresentar as falas sem reticências ou colchetes nas cartelas; manter os recortes no arquivo de fontes.')
d=d.replace('Os três relatos escritos estão transcritos nos guias; o usuário autorizou o uso, confirmou o teste do Farol pelas crianças e identificou Débora e André como seus filhos. Nas cartelas de Avaliações, a identificação segue a orientação atual: nome, aluno ou aluna e contexto do relato.', 'Os oito relatos estão transcritos no guia de Avaliações, com origem dos cinco novos vídeos em producao/destaques/avaliacoes/fontes-dos-relatos.txt. O usuário confirmou o teste do Farol por Rafael, Débora e André. Fernando, Jeffrey e os três responsáveis aparecem com contexto de criação de jogos ou aulas, sem atribuição específica ao Farol. Identificar nome, Aluno/Aluna ou relação do responsável com a criança, e contexto do relato.')
d=d.replace('Se a equipe usar a alternativa F02B, fixá-la no lugar de F02, mantendo três fixados. ', 'Os três são carrosséis 4:5, com 24 imagens no total. ')
d=d.replace('aprender, explorar, personalizar e testar.', 'aprender, explorar, personalizar, testar e mostrar o que fez.')
d=d.replace('Os oito relatos estão transcritos no guia de Avaliações', 'Os relatos de oito pessoas estão distribuídos em dez cartelas no guia de Avaliações')
d=d.replace('Fernando, Jeffrey e os três responsáveis aparecem com contexto de criação de jogos ou aulas, sem atribuição específica ao Farol.', 'Fernando e Jeffrey falam sobre criar jogos. As cinco cartelas dos responsáveis abordam organização, criatividade, responsabilidade, independência e uso da tela para criar. Os temas são percepções sobre os próprios filhos, sem atribuição específica ao Farol. Apresentar as falas sem reticências ou colchetes nas cartelas; manter os recortes no arquivo de fontes.')
f.write_text(d,encoding='utf-8')

source_lines=['AVALIAÇÕES · FONTES DOS RELATOS','', 'Rafael, Débora e André: falas já presentes na oferta e confirmadas pelo usuário para o Desafio do Primeiro Jogo. Fonte histórica: c3c142e8f^, packages/funnel/src/components/funnel/oferta/DesafioOfertaBody.astro, seção DEPOIMENTOS. Retratos: packages/funnel/public/img/desafio-primeiro-jogo/depo-{rafael,debora,andre}.webp.','', 'Os segundos abaixo localizam os trechos escolhidos. Ajustes: maiúscula inicial, pontuação e aspas de uma fala dentro de outra. As cartelas omitem os marcadores de corte por orientação do usuário. Os recortes abaixo registram os segundos de cada parte utilizada. As palavras e o sentido foram preservados; não foram inseridos resultados. Os temas abaixo dos nomes são editoriais, fora das aspas. Transcrição completa: faster-whisper small; conferência dos trechos: medium, com marcação de palavras. Arquivos de trabalho: output/instagram/avaliacoes/2026-10-09/fontes.']
frames={'daniel':'daniel-12s.png (00:12)','harle':'harle-60s.png (01:00)','flavia':'flavia-60s.png (01:00)'}
for s in av['stories']:
    if 'sourceFile' not in s: continue
    source_lines+=['',f"{s['id']} · {s['name']} · {s['role']}",f"Vídeo: {s['sourceFile']}",f"Trecho: {s['sourceStart']:.2f}s–{s['sourceEnd']:.2f}s",f"Fala: {s['quote']}",f"Retrato: {frames.get(s['photo'], 'foto de referência fornecida pelo usuário: '+s['photo']+'.png')}"]
    if s.get('sourceTranscript'): source_lines.append('Conferência: fontes/'+s['sourceTranscript'])
    for part in s.get('quoteParts',[]): source_lines.append(f"Recorte {part['start']:.2f}s–{part['end']:.2f}s: {part['text']}")
source_lines+=['','Daniel: organização e raciocínio em AV08; criatividade, com a ideia de mudar o jogo, em AV11. Harle: iniciativa de acompanhar as atividades e responsabilidade com as coisas dele, em AV09. Flávia: independência em AV10; uso da tela para criar em AV12. Os cinco trechos dos responsáveis alternam com os cinco relatos infantis. Cada fala se refere à experiência daquela família. Os títulos dos vídeos não foram usados como promessa da Comunidade.']
(avwork/'fontes-dos-relatos.txt').write_text('\n'.join(source_lines)+'\n',encoding='utf-8')
(avwork/'README.md').write_text('''# Avaliações · produção de 09/10/2026

Doze PNGs em `finais-beneficios`, 1080 × 1920. Dez cartelas de relatos entre abertura e convite, alternando cinco crianças e cinco trechos dos responsáveis. Daniel tem duas cartelas, sobre organização e criatividade; Harle fala de responsabilidade; Flávia tem duas, sobre independência e uso da tela para criar. A abertura reúne os oito retratos. Cópias finais em `docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/avaliacoes`.

Os cinco novos vídeos foram transcritos com faster-whisper small e os trechos selecionados conferidos com medium. O manifesto e `fontes-dos-relatos.txt` registram fontes e segundos de cada recorte. `fontes/` guarda WAVs, transcrições completas, trechos conferidos e quadros extraídos. Pontuação ajustada para leitura; as cartelas não exibem reticências ou colchetes, conforme orientação do usuário. As palavras e o sentido foram mantidos, e cada recorte permanece registrado com os segundos de origem. As aspas de abertura e fechamento usam o mesmo estilo gráfico. Os relatos não foram reescritos para seguir a voz comercial. As versões anteriores da seleção ficam em `historico/antes-beneficios` e `finais-ampliados`.

Os retratos dos responsáveis são quadros dos próprios vídeos, diagramados com recorte circular. Não houve geração de rostos ou depoimentos. Fernando e Jeffrey usam as fotos fornecidas pelo usuário; Rafael, Débora e André usam as fotos identificadas na oferta.

`novos-relatos.json` contém os trechos atuais, com temas, fontes e recortes. `ampliar-avaliacoes.py` prepara `montar-stories.mjs`, que monta HTML/CSS e manifesto; `renderizar-e-conferir.mjs` exporta PNGs e verifica copy, margens, formato, oito rostos na abertura, espaço para cada citação e alternância entre crianças e responsáveis. `conferencia-beneficios.png` reúne a sequência. `publicacao.txt` indica o sticker da imagem 12.
''',encoding='utf-8')
(alwork/'README.md').write_text('''# Alunos · produção de 09/10/2026

Lote vigente: sete stories completos em `finais-ampliados`, 1080 × 1920. Ordem: AL01 → AL02 Rafael → AL03 Jeffrey → AL04 Débora → AL05 André → AL07 Fernando → AL06. Os arquivos de 01 a 07 indicam a ordem; os IDs do roteiro permanecem estáveis. A abertura reúne as cinco fotos e não fixa nomes ou quantidade na copy.

As cinco cenas de atividade são provisórias, geradas com as referências das crianças por solicitação do responsável, para receber vídeos depois. Não são registros documentais das aulas. A geração usou a ferramenta integrada image_gen. Prompts e referências: `prompts-cenas.json`, `prompts-fernando-jeffrey.json` e `prompt-ajuste-tela-debora.json`. A cena vigente da Débora termina em `-v2.png` e mostra uma captura do Farol personalizado. A abertura usa fotos reais; AL06 mostra a captura do jogo como demonstração da equipe.

`montar-stories.mjs` lê a copy do guia e o destino do sticker. `renderizar-e-conferir.mjs` exporta sete telas e cinco molduras e verifica copy, margens, imagens, identificação e transparência. As molduras vigentes estão em `molduras-ampliadas`, entregues na subpasta `molduras`. A janela mede 976 × 970, x 52, y 480, com raio 32. Conferir a ação e a legenda ao inserir cada vídeo.

A entrega está em `docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/alunos`. `publicacao.txt` contém a ordem, as legendas e o link do sticker da imagem 07. A conferência vigente é `conferencia-ampliada.png`; outras pastas de finais são versões anteriores. `verificar-entrega.mjs` confere dimensões, quantidade e hashes dos arquivos entregues.
''',encoding='utf-8')
(work/'fixados/2026-10-09/README.md').write_text('''# Fixados · produção de 09/10/2026

Três carrosséis 4:5: F01 com oito slides, F02 com sete e F03 com nove. Total: 24 PNGs de 1080 × 1350, em `finais/`. Entrega em `docs/marketing/kids/comunidade-dos-criadores/instagram/producao/fixados`, com legenda, texto alternativo e instruções em cada subpasta.

`planejamento.json` guarda a copy completa e as referências; `preparar-documentos.mjs` mantém o guia 02, manifesto e textos de publicação. `montar-carrosseis.mjs` monta HTML/CSS; `renderizar-e-conferir.mjs` exporta e verifica 24 slides, copy, dimensões, margens, imagens e leitura. As três imagens `conferencia-F0*.png` mostram as sequências.

F01 usa capturas do produto. Conforme orientação do usuário, os três fixados não exibem o rótulo Demonstração da equipe. O slide 7 de F01 mostra a personalização com uma captura real do cenário noturno, personagem robô e outro farol; o convite passou ao slide 8. F02 usa as cenas provisórias dos cinco alunos, já geradas a partir de referências; a legenda informa essa origem. Prompts de Fernando e Jeffrey: `../../alunos/2026-10-09/prompts-fernando-jeffrey.json`. Trocar pelas mídias reais posteriormente e conferir a ação com cada legenda.

F03 tem imagens nos nove slides, sem cartelas repetindo a copy. A capa mostra Débora descobrindo o Farol no notebook, com o título aprovado “Como seu filho pode começar a criar jogos.” As nove cenas estão em `cenas-como-comecar-v2/`, geradas com a ferramenta integrada image_gen a partir das referências de André, Débora, Helena e Júlio. As telas foram compostas a partir das capturas do jogo e da interface; não são novas capturas nem registros reais das atividades. Prompts da capa: `prompt-capa-debora.json` e `prompt-capa-debora-ajuste.json`; demais cenas: `prompts-como-comecar-v2.json` e `prompts-ajustes-como-comecar-v3.json`. Nos slides 3, 5 e 6, usar os arquivos com sufixo `-v3`. Nos slides 2 a 9, a copy aprovada foi preservada. A capa anterior está em `historico/antes-capa-debora/`; a versão com cartelas está em `historico/antes-cenas-como-comecar/`. As imagens de publicação anteriores ficam no arquivo de entregas.

A versão anterior em Reels e a alternativa F02B estão preservadas em `02-fixados-antes-carrosseis.md`; não fazem parte da entrega atual. Condições comerciais conferidas nas fontes locais de oferta e termos; não houve confirmação remota do site. A publicação no Instagram fica com a equipe.
''',encoding='utf-8')
print(json.dumps({'stories_no_guia':len(re.findall(r'^### (?:CF|PJ|AL|DU|AV|SN)\d+', (base/'01-destaques.md').read_text(encoding='utf-8'),re.M)), 'avaliacoes':len(av['stories']), 'alunos':len(al['stories'])}))
