from pathlib import Path
import re

root = Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
p = root / 'apoio/links-e-publicacao.md'
s = p.read_text(encoding='utf-8').replace('**Revisão: 08/10/2026.**', '**Revisão: 11/10/2026.**')
s = s.replace('F12 também pode orientar a escolha do botão da Comunidade na bio.', 'P19, P26 e P30 orientam a escolha do botão da Comunidade na bio.')
s = s.replace('Campanha: **desafio_instagram_ciclo01**.', 'Bio e destaques mantêm a campanha **desafio_instagram_ciclo01**. Os novos stories ST01–ST20 usam **instagram_editorial_30_2026**, conforme a tabela seguinte.')
s = re.sub(r' / S\d\d', '', s)
s = '\n'.join(line for line in s.splitlines() if not line.startswith(('| S10.3 |', '| S12.3 |')))
s = s.replace('Os demais stories não levam link, salvo o que seus roteiros já especificam. A caixa de perguntas S05.3 e a enquete S10.2 têm texto completo no calendário. Não criar resposta automática, link em comentário ou convite de mensagem que ainda não tenha sido planejado.', 'Os links acima pertencem aos destaques permanentes. As antigas sequências S01–S12 foram arquivadas; não reutilizar seus identificadores no novo calendário. Os links de ST01–ST20 estão abaixo. As perguntas, opções das enquetes e falas completas estão no [roteiro dos stories](../postagens/04-stories.md). Não criar resposta automática ou convite de mensagem não previsto.')
stories = (root/'postagens/04-stories.md').read_text(encoding='utf-8')
rows = []
for block in re.split(r'(?=^## ST\d+)', stories, flags=re.M)[1:]:
    sid = re.search(r'## (ST\d+)', block).group(1)
    for label, url in re.findall(r'\[([^\]]+)\]\((https://sistemazero\.com\.br/[^)]+)\)', block):
        rows.append(f'| {sid} | {label} | `{url}` |')
table = '\n\n### Stories do novo calendário\n\nCampanha `instagram_editorial_30_2026`. Cada endereço abaixo também aparece junto à tela correta no roteiro. Não trocar o link da bio por um link de peça.\n\n| Sequência | Sticker | Endereço para copiar |\n| --- | --- | --- |\n' + '\n'.join(rows) + '\n\nAs demais sequências não têm link comercial. Não acrescentar stickers além dos previstos.\n\n'
s = s.replace('**Atribuição da bio:**', table + '**Atribuição da bio:**')
s = s.replace('Reaproveitar capturas mantendo autoria, contexto e rótulo de demonstração.', 'Reaproveitar capturas mantendo autoria e contexto. Nos novos carrosséis, a origem da demonstração aparece na legenda e no arquivo de produção; seguir a [direção visual](../postagens/05-direcao-visual-e-producao.md) nos demais formatos.')
s = s.replace('Usar os três dias semanais do calendário para formar os destaques e publicar os posts.', 'Publicar P01–P30 em três dias semanais e ST01–ST20 em dois desses dias. A formação dos destaques e os três fixados ficam fora dessa contagem.')
s = s.replace('Fica claro o que já vem pronto, o que a criança aprende a fazer e o que ela pode escolher para o jogo ficar do jeito dela.', 'A cena mostra o que a criança aprende a fazer e o que pode escolher para o jogo ficar do jeito dela. Explicar a origem de uma parte pronta quando isso evita atribuir à criança um trabalho que ela não fez; não transformar essa informação no foco da publicação.')
s = s.replace('[Leitura dos resultados](../03-postagens.md#leitura-dos-resultados)', '[Conferência e estado](../03-postagens.md#conferência-e-estado) e na [pesquisa do ciclo](../pesquisas/revisao-calendario-30-postagens-2026-10-11.md)')
s = s.replace('Esta entrega inclui a revisão editorial e a aplicação local dos acessos da página inicial e de Como funciona no código do funil. Não houve agendamento, publicação no Instagram ou disparo de mensagens. A publicação do site depende do fluxo de implantação.', 'Esta revisão atualiza documentos e materiais editoriais locais. Não altera o código do funil, não agenda nem publica posts e não dispara mensagens. Os acessos da página inicial e de Como funciona foram tratados na revisão anterior.')
p.write_text(s+'\n', encoding='utf-8')
print(f'Links atualizados: {len(rows)} stickers novos.')

public = []
ids = []
for p in sorted((root/'postagens').glob('0[1-4]-*.md')):
    text = p.read_text(encoding='utf-8')
    ids += re.findall(r'^## (P\d\d|ST\d\d)\b', text, re.M)
    for line in text.splitlines():
        if line.startswith('> '): public.append(line[2:])
        elif re.match(r'^\| \d', line):
            cols = line.split('|')
            if p.name.startswith('04-'): public.append(cols[2].strip())
            else:
                # Scene tables: time, scene, narration, overlay.
                public += [x.strip() for x in cols[3:-1]]
out = Path('output/instagram/calendario-30-2026-10-11')
out.mkdir(parents=True, exist_ok=True)
(out/'copy-publica.txt').write_text('\n\n'.join(public), encoding='utf-8')
print(f'IDs: {len(ids)}, únicos: {len(set(ids))}.')
