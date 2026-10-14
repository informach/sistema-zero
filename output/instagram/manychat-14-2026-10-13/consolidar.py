from pathlib import Path
import re

root = Path(__file__).resolve().parents[3]
ig = root / 'docs/marketing/kids/comunidade-dos-criadores/instagram'
campaign = ig / 'campanhas/manychat-desafio'
pieces = sorted(campaign.glob('mc[0-9][0-9]-*.md'))
assert len(pieces) == 14
header = '''# Postagens ManyChat: copies para revisão

**Categoria separada do calendário comum · 13/10/2026 · Versão 1 para revisão editorial.** São 14 propostas baseadas nas referências indicadas: 10 carrosséis 4:5 e quatro Reels 9:16. Este documento reúne toda a copy, as legendas e as mensagens. Não foram produzidas imagens ou vídeos novos, publicadas postagens ou ativadas automações.

## Como conferir

Cada peça começa com o link da postagem original e o objetivo da adaptação. A [análise das referências](campanhas/manychat-desafio/analise-referencias.md) separa o conteúdo visual e a legenda de cada referência e explica as escolhas. Os blocos citados são texto público; as linhas de visual, cena e produção são orientações internas para uma etapa posterior.

Os posts mostram possibilidades das nossas ferramentas e a criação de jogos. O Desafio aparece no direct como um primeiro passo guiado. Minecraft e Roblox podem inspirar ideias; o projeto é criado no Sistema Zero. O print do personagem 3D encontrado no funil é do **Molda**; as imagens do Pinta mostram desenho 2D e a passagem da arte ao Estúdio.

O [inventário de imagens existentes](campanhas/manychat-desafio/assets.md) localiza essas provas. O [fluxo curto](campanhas/manychat-desafio/fluxo-curto.md) reúne respostas públicas, dúvidas e configuração futura. Nos Reels, acrescentar legendas fiéis à fala completa; as sobreposições curtas não substituem essas legendas.

As durações são estimativas de roteiro. As datas de publicação serão definidas depois da revisão e da produção. MC07 é sazonal e pede proximidade com férias ou recesso; MC03 pode acompanhar uma retomada de rotina. A ordem abaixo acompanha os links enviados para facilitar a conferência, não define uma agenda de publicação.

## Índice das propostas

| Peça | Palavra | Referência | Copy completa |
| --- | --- | --- | --- |
'''
chunks = []
for p in pieces:
    source = p.read_text(encoding='utf-8')
    ident = p.name[:4].upper()
    code = re.search(r'https://www.instagram.com/p/([^/]+)/', source).group(1)
    word = re.search(r'\*\*Palavra:\*\* ([A-Z]+)', source).group(1)
    header += f'| {ident} | {word} | [Post original](https://www.instagram.com/p/{code}/) | [Revisar {ident}](#{ident.lower()}) |\n'
    source = source.replace('(assets.md)', '(campanhas/manychat-desafio/assets.md)').replace('(fluxo-curto.md)', '(campanhas/manychat-desafio/fluxo-curto.md)')
    source = re.sub(r'^(#{1,5}) ', r'\1# ', source, flags=re.M)
    chunks.append(f'<a id="{ident.lower()}"></a>\n\n{source.strip()}')
target = ig / '04-postagens-manychat.md'
target.write_text(header + '\n' + '\n\n---\n\n'.join(chunks) + '\n', encoding='utf-8')
assert target.read_text(encoding='utf-8').count('## MC') == 14
readme = campaign / 'README.md'
text = readme.read_text(encoding='utf-8')
for p in pieces:
    text = text.replace(f'({p.name})', f'(../../04-postagens-manychat.md#{p.name[:4]})')
text = text.replace('Cada arquivo contém', 'O documento único contém, para cada peça,')
text = text.replace('O personagem de aparência 3D inspirado em Minecraft, indicado pela Helena no Pinta do perfil do Lip, deve entrar nas peças MC08, MC09 e MC10 quando pertinente. Usar a captura real do funil, com sua interface e contexto. Uma imagem do personagem demonstra criação visual; não comprova sozinha um jogo 3D funcionando nem integração com Minecraft.', 'O personagem 3D inspirado em Minecraft indicado pela Helena foi localizado no funil: a captura mostra o Molda. Ele entra nas peças MC08, MC09 e MC10. Usar a captura real, com sua interface e contexto. A imagem demonstra o modelo no editor; não comprova sozinha um jogo funcionando nem integração com Minecraft.')
text = text.replace('Textos e roteiros completos; artes, gravações, automação e publicação são etapas posteriores.', 'Textos e roteiros completos para revisão; artes, gravações, automação e publicação ficam para depois. A fonte única das copies é [Postagens ManyChat](../../04-postagens-manychat.md).')
readme.write_text(text, encoding='utf-8')
for p in pieces:
    assert p.resolve().parent == campaign.resolve()
    p.unlink()
print(f'Consolidadas 14 peças em {target.relative_to(root)}. Rascunhos separados removidos depois da conferência.')
