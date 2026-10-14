from pathlib import Path
import json,shutil
b=Path('docs/marketing/kids/comunidade-dos-criadores/instagram');w=Path('output/instagram/light-copy-2026-10-12')
def write(p,t):p.write_text(t,encoding='utf-8')
p=json.loads((w/'final-posts.json').read_text(encoding='utf-8'))
for x in p:
    if x['id']=='E01':
        x['slides'][4][1]='Na atividade do Estúdio, esperem aparecer Guardado na sua conta. Depois, combinem quando será possível continuar.'
        x['slides'][4][2]='Indicador real Guardado na sua conta no cabeçalho da atividade e anotação do próximo momento.'
        x['caption']=x['caption'].replace('esperem o indicador Salvo','esperem o indicador Guardado na sua conta na atividade')
    if x['id']=='E06':
        x['title']='Antes de sair da aula, confira se o projeto ficou guardado.'
        x['cover']='Antes de sair, confira se o projeto ficou guardado.'
        x['cta']='Esperar Guardado na sua conta e seguir o envio quando a aula pedir.'
        for s in x['scenes']:
            for i in [2,3,4]:s[i]=s[i].replace('Salvo','Guardado na sua conta')
        x['scenes'][0][4]='Chegou a hora de parar. Na atividade do Estúdio, confira se apareceu Guardado na sua conta antes de fechar.'
        x['caption']='Na atividade do Estúdio dentro da aula, espere aparecer Guardado na sua conta antes de fechar. Se houver erro ou o salvamento ainda estiver em andamento, mantenha a página aberta e confira o aviso da tela.\n\nEsse indicador confirma que o projeto da atividade ficou guardado na conta. Quando a aula pedir Enviar meu projeto, siga também essa orientação para realizar a entrega.\n\nAo parar, uma anotação curta sobre o próximo passo pode ajudar a retomar a atividade.'
        x['visual']='Indicador Guardado na sua conta no cabeçalho da atividade e envio mostrado em cena separada.'
        x['note']='Fonte conferida: packages/member-shell/src/lib/lesson-copy-kids.ts e components/lesson-draft-status.tsx. Captar o indicador da atividade, não apenas o Salvo local do editor completo. Não prometer guardar alterações depois de fechar.'
write(w/'final-posts.json',json.dumps(p,ensure_ascii=False,indent=2)+'\n')
f=b/'postagens/06-manychat.md';t=f.read_text(encoding='utf-8').replace('No nosso Estúdio, esperem o indicador Salvo.','Na atividade do Estúdio dentro da aula, esperem Guardado na sua conta.');write(f,t)
write(b/'producao/postagens/README.md','''# Produção das postagens do calendário

Revisão: 12/10/2026. A direção vigente começa no cotidiano dos pais e conduz à criação de jogos. Trinta posts principais, seis extras de acompanhamento e sessenta telas de stories. Fixados ficam separados.

| Peça | Estado | Arquivos |
| --- | --- | --- |
| P01 · O “não consigo” pode estar escondendo uma dúvida | Seis PNGs 1080 × 1350 produzidos; copy e layout conferidos | [Prévia](p01-nao-consigo/index.html), [imagens](p01-nao-consigo/), [legenda](p01-nao-consigo/legenda.txt) |
| P02–P30 | Copy e direção completas; mídia a produzir | [Calendário](../../03-postagens.md) |
| E01–E06 | Seis extras completos; mídia a produzir | [Extras](../../postagens/07-extras-para-familias.md) |
| ST01–ST20 | Sessenta cartelas escritas; mídia a produzir | [Stories](../../postagens/04-stories.md) |
| ManyChat | Seis entregas e ramificações escritas; configuração e teste pendentes | [Sequência](../../postagens/06-manychat.md) |

P01 usa três ilustrações geradas, diagramas próprios e capturas reais. Prompts e montagem estão na pasta. Publicar apenas os seis PNGs numerados; previa.png serve à conferência. A legenda principal não promete entrega automática; a variante PASSO só entra depois do fluxo testado.

O P01 anterior, centrado na chave do Farol, foi substituído. Seu arquivo está no histórico de 12/10. Nenhuma peça foi agendada ou publicada.
''')
target=b/'producao/postagens/p01-nao-consigo/apoio'
shutil.copyfile(w/'prompts-p01.txt',target/'prompts.txt')
shutil.copyfile(w/'prompt-edicao-p01.txt',target/'prompt-edicao.txt')
f=b/'README.md';t=f.read_text(encoding='utf-8')
t=t.replace('| Pesquisa e decisões | [Análise de 11/10](pesquisas/revisao-calendario-30-postagens-2026-10-11.md) |','| Pesquisa e decisões | [50 publicações e análise](pesquisas/kodland-50-publicacoes-2026-10-12.md) |')
write(f,t)
print('Produção organizada e instrução de salvamento conferida com o código atual.')
