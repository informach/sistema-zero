import lote01,lote02,lote03,lote04,lote05,lote06,stories,polish
from edit import *

finish()

paths=['postagens/13-guia-de-copy.md','postagens/05-direcao-visual-e-producao.md','README.md','producao/postagens/README.md']
extra={p:(IG/p).read_text(encoding='utf-8') for p in paths}
(OUT/'apoio-antes.json').write_text(json.dumps(extra,ensure_ascii=False,indent=2),encoding='utf-8')

guide=extra[paths[0]]
quotes=guide[guide.index('## 6. Falas reais disponíveis'):guide.index('## 7. Formato de cada ficha')]
suffix='''## 7. Organização e revisão das fichas

Manter ID, necessidade da pesquisa, formato, objetivo, copy completa, legenda e direção visual. Carrosséis usam seções Slide; imagens usam Arte; Reels usam a tabela Tempo, Texto na tela, Fala e Cena. Notas de produção ficam fora das citações públicas.

O histórico de antes da revisão de precisão está registrado em `output/instagram/revisao-forca-2026-10-13/antes.json`. A versão anterior à reescrita dos ganchos continua em `historico/2026-10-13-antes-reescrita-dos-ganchos/`. Esses registros não são fontes para produção atual.

Na revisão, conferir a promessa da capa, o argumento, a mecânica real do exemplo, a fidelidade dos depoimentos, a leitura em voz alta e a imagem pedida. Usar o linter em copy pública extraída; perguntas de conversa e de quiz nos slides internos não são perguntas no gancho. Revisão editorial não equivale a teste de conversão ou validação pedagógica.
'''
(IG/paths[0]).write_text((OUT/'guia-prefixo.md').read_text(encoding='utf-8')+quotes+suffix,encoding='utf-8')

for rel in ['03-postagens.md','README.md','producao/postagens/README.md']:
    p=IG/rel;t=p.read_text(encoding='utf-8')
    t=t.replace('60 telas novas de stories','80 telas de stories').replace('60 telas de stories','80 telas de stories').replace('com 60 telas','com 80 telas')
    if rel=='03-postagens.md':
        t=t.replace('copy reescrita em 13/10/2026','copy reescrita e refinada em 13/10/2026')
        t=re.sub(r'^\*\*Copy e direção completas:\*\*[^\n]*','**Copy e direção completas:** 60 principais e 20 sequências de quatro stories; seis extras permanecem disponíveis. **Mídias anteriores:** P01, P07 e P34 têm artes da versão anterior, que precisam ser refeitas. As outras peças aguardam produção. A ordem do calendário permanece; a revisão atual é de textos. Nenhuma peça foi publicada, agendada ou enviada por mensagem nesta revisão.',t,flags=re.M)
        t=t.replace('a copy das 60 publicações e dos 20 stories foi reescrita.','a copy das 60 publicações e das 20 sequências de stories foi refinada, preservando ganchos fortes e corrigindo argumentos, exemplos e ritmo.')
    elif rel=='README.md':
        t=t.replace('**Revisão: 12/10/2026. Perfil:', '**Revisão de copy do calendário: 13/10/2026. Perfil:',1)
        t=t.replace('O [ManyChat planejado](postagens/06-manychat.md) entrega atividades e apresenta as aulas a quem escolher continuar a conversa.','As [Postagens ManyChat](04-postagens-manychat.md) são uma categoria separada, com conversa solicitada por palavra-chave e percurso próprio até a oferta.')
        t=t.replace('O [mapa de produção](postagens/08-exemplos-do-estudio.md) registra as fontes, as regras e o que precisa ser preparado.','A [vitrine atual](postagens/14-vitrine-de-exemplos.md) e as notas de cada ficha registram as fontes, as regras e o que precisa ser preparado.')
        t=t.replace('As seis extensões opcionais por palavra-chave seguem o [plano de direct](postagens/06-manychat.md).','O calendário comum termina em convite para seguir; as palavras-chave pertencem às [Postagens ManyChat](04-postagens-manychat.md).')
    else:
        t=t.replace('Seis PNGs 1080 × 1350 produzidos;', 'Versão anterior: seis PNGs 1080 × 1350;')
        t=t.replace('Seis PNGs 1080 × 1350; relato', 'Versão anterior: seis PNGs 1080 × 1350; relato')
        t=t.replace('Sete PNGs 1080 × 1350;', 'Versão anterior: sete PNGs 1080 × 1350;')
        t=re.sub(r'^O \*\*P01 atual\*\*[^\n]*','O **P01 atual** abre com “Seu filho já tem uma lista do que mudaria nos jogos.” e usa o turbo do carrinho como exemplo. As peças P01, P07 e P34 devem ser produzidas novamente a partir das fichas atuais. Os arquivos anteriores servem apenas de registro. O calendário comum não usa palavras-chave.',t,flags=re.M)
        t=re.sub(r'^\| ManyChat \|[^\n]*','| ManyChat | Categoria separada, fora deste calendário e desta revisão | [Documento próprio](../../04-postagens-manychat.md) |',t,flags=re.M)
    p.write_text(t,encoding='utf-8')

p=IG/'postagens/05-direcao-visual-e-producao.md';t=p.read_text(encoding='utf-8')
t=t.replace('P01, P34 e P07 produzidos; as demais imagens e os vídeos deste novo ciclo ainda serão produzidos.','P01, P34 e P07 têm artes de uma versão anterior que precisam ser refeitas. Todas as mídias da copy refinada aguardam produção ou adaptação.')
t=t.replace('O [mapa de exemplos](08-exemplos-do-estudio.md) registra 11 bases de quatro extensões, suas regras e adaptações necessárias.','A [vitrine atual](14-vitrine-de-exemplos.md) e as notas das fichas registram as bases, regras e adaptações necessárias. O mapa anterior de 11 exemplos é referência histórica.')
t=re.sub(r'^\*\*P01 atual:\*\*[^\n]*','**P01, mídia anterior:** [seis slides](../producao/postagens/p01-uma-ideia-dele/index.html), preservados como registro. A copy atual tem sete slides, capa “Seu filho já tem uma lista do que mudaria nos jogos.” e comparação da força do turbo. Refazer a montagem e as capturas necessárias a partir da ficha P01; a antiga cena de capa pode ser reaproveitada se corresponder à nova copy.',t,flags=re.M)
t=t.replace('**P34 produzido:**','**P34, mídia anterior a refazer:**').replace('**P07 produzido:**','**P07, mídia anterior a refazer:**')
t=re.sub(r'^Revisão de copy, mídia produzida[^\n]*','Revisão de copy, mídia produzida, agendamento e publicação são estados diferentes. Os textos foram refinados em 13/10. A legibilidade das artes, as capturas comparativas e os cortes dos vídeos da nova versão serão verificados na produção. Nenhuma peça foi publicada nesta revisão.',t,flags=re.M)
p.write_text(t,encoding='utf-8')
print('Documentos de apoio alinhados.')
