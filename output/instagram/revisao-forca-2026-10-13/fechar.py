from edit import *

slide('P01',3,'Neste mundo para dirigir, feito no nosso Estúdio, o turbo aumenta a velocidade do carrinho.\n\nQuem cria escolhe a força desse impulso e testa como fica dirigir pelo caminho.')
slide('P34',6,'Enfraquecer o fogo também muda a escolha de quem joga: ele perde parte da vantagem contra a planta.\n\nUma mudança pequena precisa ser testada pelos dois lados.')
slide('P37',3,'Desenhe três quadros:\n\nonde o herói começa;\no que encontra no caminho;\nonde precisa chegar.\n\nEssa sequência ajuda a escolher o que construir primeiro.')
slide('P40',5,'Nesta corrida do nosso Estúdio, completar a volta significa passar pelos cinco anéis na ordem.\n\nQuem cria monta essa sequência para o jogo reconhecer o percurso.')
slide('P40',6,'Pular o terceiro anel não adianta: o quarto só conta depois dele.\n\nO próximo anel pulsa na pista. É a indicação de aonde o jogador precisa ir.')

for name in NAMES:
    t=heads[name]+''.join(b for key,b in chunks.items() if owners[key]==name)
    t=t.replace('uma explicação sustentada e uma regra de jogo de verdade e o convite para seguir só no final','uma explicação sustentada, uma regra real de jogo e o convite para seguir só no final')
    (IG/'postagens'/name).write_text(t,encoding='utf-8')

# Corrigir um estado antigo no índice de produção, sem alterar nenhuma mídia.
p=IG/'producao/postagens/README.md';t=p.read_text(encoding='utf-8')
t=t.replace('## Arquivos prontos','## Arquivos da versão anterior')
t=t.replace('**Ordem dos carrosséis produzidos:**','**Ordem dos carrosséis produzidos na versão anterior:**')
p.write_text(t,encoding='utf-8')
print('Acabamento editorial aplicado.')
