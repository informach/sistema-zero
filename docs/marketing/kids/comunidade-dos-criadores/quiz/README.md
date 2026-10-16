# Quiz da Comunidade: o diagnóstico que leva à oferta certa

Versão vigente: 5 (`comunidade-orientacao-v5`), implementada em 16/10/2026. Entrada:
`/kids/comunidade-dos-criadores/quiz`; resultado: `/kids/comunidade-dos-criadores/resultado`.
A [revisão de copy e a proposta da v5](revisao-copy-2026-10-16.md) explicam o porquê de cada
mudança e registram as decisões da dona.

## A direção (decisões de 16/10/2026)

- **As perguntas seguem o método SPIN** e definem o perfil da família para levar à oferta certa.
  A régua é o comando `lt-quiz` do fluxo criativo (segmentação, situação, problema, implicação
  com calculadora, necessidade com visualização profunda e diagnóstico final).
- **O quiz é a fase antes da oferta.** Qualifica e sobe o nível de consciência da família. Nenhuma
  tela antes do resultado cita a Comunidade, aula, curso, plataforma ou preço, e a criação de jogos
  não aparece como solução. "Jogo" só aparece quando descreve a família.
- **O resultado é muito pessoal e é a ponte até a oferta.** Ele devolve as respostas da família
  com as palavras dela, explica por que aquilo acontece, apresenta a criação de jogos como o que
  muda isso e só então mostra a Comunidade. O botão leva à página do perfil. Preço só na oferta.
- **A manchete diz o motivo de responder:** "Em três minutos, veja como usar o que seu filho já
  gosta de fazer para ele aprender mais". A alternativa, pela dor do tempo de tela, aparece com
  `?manchete=tela` (teste A/B).
- **Filho ou filha** na primeira pergunta: depois dela, todo texto fala "ela" quando é uma menina.
- **Sem a atividade "Experimentem em casa"** no resultado: ela tirava a família da ponte.
- **Uma tela real por perfil** no resultado, a que mostra o mecanismo.

## As perguntas

Dez para todos e uma condicional nos perfis B, C e F: criança e idade (na própria entrada), tempo
de tela, computador, cena de casa, o que ele faz quando trava, a calculadora do tempo de tela
(horas por dia × 365, em faixa), a preocupação, a cena desejada daqui a três meses, o que precisa
estar garantido e a frase-síntese. A condicional confere o que pode impedir a compra: Roblox no B,
atividade só de desenho no C, matéria atrasada no F. Texto completo no
[espelho das perguntas](../copy/quiz-comunidade.md).

## Como o perfil é definido

O perfil soma quatro respostas, uma de cada fase do SPIN: cena de casa (3 pontos), preocupação (2),
cena desejada (2) e frase-síntese (3). Empate: vence a frase-síntese, depois a cena de casa. O
segundo perfil ganha uma frase no resultado e não muda a oferta. A cena desejada não tem opção
neutra, então sempre sai um perfil; com 3 pontos ou menos, o resultado avisa que é o caminho mais
perto.

| Perfil | Página do botão |
| --- | --- |
| A. Tempo de tela | /kids/comunidade-dos-criadores/oferta |
| B. Criação de jogos | /kids/comunidade-dos-criadores/oferta/criacao-de-jogos |
| C. Desenho e personagens | /kids/comunidade-dos-criadores/oferta/expressao-visual |
| D. Programação | /kids/comunidade-dos-criadores/oferta/formacao-tecnologica |
| F. Habilidades escolares | /kids/comunidade-dos-criadores/oferta/habilidades-escolares |

A rota /oferta/continuar fica na jornada de quem já conhece a plataforma e não é destino do quiz.

## O resultado

Título com o problema → "O que você contou" (as respostas) → "Por que isso acontece" (a tese) →
"O que muda isso" (a criação de jogos) → "Onde isso acontece" (a Comunidade, a tela e os relatos)
→ "Antes de seguir" (só com condição) → "O próximo passo" (o botão). "Por que isso acontece" só
afirma a cena de casa quando a família a escolheu. Recados aparece uma vez, só para quem disse que
precisa de alguém a quem recorrer. Texto completo e três exemplos montados no
[espelho dos resultados](../copy/resultados-quiz.md).

## Métricas no /admin

- **Performance:** as perguntas aparecem pelo nome curto. As perguntas extras ficam marcadas e não
  quebram a cadeia de etapas.
- **Performance e Perfis ganham dois filtros:**
  - "Só quem abriu o quiz atual": tira as respostas da v4 e quem foi direto à oferta. Vem ligado
    só na Comunidade (o funil com teste A/B); nos outros funis a visão continua completa.
  - A manchete, para comparar o padrão com a de tela. Escolher uma manchete liga sempre o recorte
    do quiz atual, para o A/B comparar só quem viu uma das duas.
- **Respostas:** os leads da v4 continuam legíveis, com o rótulo "(quiz anterior)".
- **Métricas:** cada versão do quiz tem a sua definição, então as perguntas da v5 aparecem
  separadas.

## Full review (16/10/2026)

Dois revisores (código e copy) e uma leitura própria; todos os achados foram corrigidos. Principais
mudanças depois da implementação:
- "ele" na copy é sempre a criança: o personagem e o enunciado usam o substantivo, para a troca
  para "ela" não errar (o teste reprova).
- Os títulos seguem as respostas: no tempo de tela, a resposta "Boa parte" na calculadora muda o
  título; na escola, o título, o porquê e a solução mudam pela parte que mais trava (ciências usa
  a tela do experimento); "aprendeu a repetir os passos" só aparece com a cena da lição.
- A calculadora entra no argumento do tempo de tela; o título dela repete o tempo por dia.
- O resultado de programação usa a tela do Estúdio: a da Jornada mostra postos "em construção".
- "O próximo passo" fica colado ao botão; nunca dois relatos da mesma pessoa; o segundo perfil
  vem em parágrafo próprio.
- O botão diz "Ver o resultado" exatamente quando a resposta escolhida completa o quiz.
- A caixa de opinião leva às perguntas da v5, e "Responder pensando em outra criança" abre a
  sessão nova no próprio quiz (`#outra-crianca`). Os links de volta ao quiz mantêm a manchete
  que a família viu.
- As telas do resultado abrem ampliadas, como nas ofertas.

Fica para a dona: a tela da Jornada com postos "em construção" ainda aparece nas ofertas A e D, e
André e Débora aparecem no resultado como Aluno e Aluna, sem o contexto dos fundadores.

## Histórico

Os espelhos da v4 e os onze exemplos completos dela estão em
[copy/historico/2026-10-16-quiz-v4](../copy/historico/2026-10-16-quiz-v4/). Revisões anteriores:
[v2](revisao-proposta.md) ([exemplos](exemplos-de-resultado.md)), [v3 para tráfego frio](revisao-trafego-frio.md),
[v4](revisao-argumentacao-personalizada.md). [Pesquisa e estratégia](pesquisa-e-estrategia.md) e
[lógica e validação](logica-e-validacao.md) descrevem as versões anteriores.
