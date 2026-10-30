# Conteúdo dos desafios por posto

Referência editorial indicada pela dona em 29/10/2026: **Proposta Jornada do Criador, revisão
aprofundada**, revisão de 25/10/2026. Arquivo HTML original com SHA-256
`1ae99c86e1aa7311663f1642fded5a895cc289dd88b2304d4555a503608ab88e`.
Seções lidas: postos, cursos, missões, Poderes, extras, acesso e Maestrias, incluindo o JSON
`proposal-data` do documento interativo. O currículo versionado no repositório fica em
`packages/members/src/infrastructure/config/creator-journey-curriculum.json`.

A comparação encontrou atualizações posteriores no Faísca: autoria local da Ilha do Farol
e do Jardim Secreto e os títulos “O segredo da cabana” e “A ponte apressada”. Elas ficam
preservadas. Os demais postos mantêm as mesmas competências; contagens auxiliares do HTML
não substituem os vínculos e as regras da política publicada.

Esta é a régua de autoria dos desafios do Arquipélago, não uma nova política de promoção.
Podemos preparar conteúdo de cursos futuros. Preparado não significa ensinado, publicado
ou liberado. O Members continua confirmando os blocos efetivamente conquistados de cada pessoa.

## Repertório que o posto ensina

| Posto | Linguagem e ambiente | Conteúdo central | Pode pedir ao aplicar o conteúdo | Não pressupor |
| --- | --- | --- | --- | --- |
| Faísca | Blocos, Jogo 2D e 3D | Evento, ação, informação booleana, se/senão, posição | Coletar algo uma vez, lembrar, decidir com e sem o objeto, reiniciar | Contadores complexos, grupos, prazo, inimigos, câmera programada |
| Construtor | Blocos, Jogo 2D e 3D | Grupos, criação por relógio, contato e retirada, pontos, vidas, estados | Partida com início/fim, acerto único, derrota/vitória e limpeza ao reiniciar | Escudo, tiro triplo, chefão ou arma de Poder opcional |
| Inventor | Blocos, Jogo 2D e 3D | Gravidade, pulo com apoio, colisão, sorteio limitado, ritmo e dificuldade | Pular só no chão, variar obstáculos, limitar velocidade e manter travessia possível | Pulo duplo, atração de moedas, balística e física nova |
| Explorador | Python, Pygame Zero e Raylib 3D | Leitura, nomes, valores, indentação, eventos, clique, estado, sorteio e tempo | Alvo versus vazio, pontos, região válida, fim por tempo, reinício, erro pequeno de código | Classes, dezenas de alvos, shaders, listas ainda não ensinadas ou alvo móvel obrigatório |
| Mestre | Python, Pygame Zero e Raylib 3D | Funções, parâmetros, listas, fases como dados, colisão por eixo | Plataforma, coleta, saída condicionada, troca de fase e depuração em caso pequeno | Herança, empurrão em grade, chão móvel, checkpoint ou escadas de Poder opcional |
| Arquiteto | JavaScript, Canvas e three.js | Ponte entre linguagens, objetos/funções, atualização/desenho, ondas, caminho e alcance | Seguir pontos, selecionar alvo dentro do alcance, interação única, contagem e reinício | Pathfinding, shaders, motor próprio, perseguição ou herança não ensinada |
| Gênio | JavaScript Pro, Canvas e three.js em arquivos | Grade, ocupação, custo, produção, modelo/apresentação, módulos e persistência | Recusar ocupação dupla e saldo insuficiente, produzir, guardar/reabrir, alterar sem quebrar | Terreno procedural, simulação elétrica, rede ou gênero inédito obrigatório |
| Lenda | Repertório conquistado e Maestrias por área | Autoria, integração, testes, revisão e especialização escolhida | Projeto com critérios explícitos e escopo pequeno, aproveitando aprendizagens anteriores | Uma nova linguagem ou biblioteca só por ter chegado ao posto |

## Quando a ilha abre

A ilha abre ao **entrar** no posto, não ao terminar os cursos desse posto. Portanto não é
correto exigir imediatamente todos os conteúdos da linha correspondente. A primeira atividade
de uma ilha reaplica conteúdo anterior. Atividades que usam a matéria nova indicam o curso
em “Aprenda isso em” e só abrem quando os blocos reais estiverem conquistados.

| Ilha | Posto de entrada | Base segura para começar | Ampliação depois de aprender |
| --- | --- | --- | --- |
| Sua ilha | Faísca | Exploração e criação com a orientação inicial | Evento, coleta e decisão após o Farol |
| Bosque | Construtor | Evento, coleta, informação e decisão do Faísca | Grupos, pontos e estados da Nave |
| Vila Doce | Inventor | Grupos, relógio, contato, pontos e estados do Construtor | Pulo, gravidade e obstáculos do Dino |
| Recife | Explorador | Movimento e colisão em blocos já conquistados | Mira em Python após o curso correspondente |
| Pico | Mestre | Clique, tempo e estados em Python do Explorador | Plataforma e dados de fases do Mestre |
| Vale dos Dinos | Arquiteto | Funções, listas e fases em Python do Mestre | Caminhos, ondas e alcance em JavaScript |
| Nuvens | Gênio | Sistemas, caminhos e alcance do Arquiteto | Construção em grade e persistência do Gênio |
| Farol | Lenda | Repertório efetivamente conquistado | Autoria e Maestria escolhida, sem dívida nova |

## Regras de autoria e verificação

1. Os seis quadros de uma ilha formam uma sequência de ações pequenas e um minijogo integrado.
   Não são seis repetições cosméticas da mesma igualdade de bloco.
2. Cada quadro registra intenção, conhecimentos prévios, linguagem, projeto inicial, gabarito,
   negativos, dicas e curso de referência. O projeto inicial já traz cenário e controles que
   não fazem parte do objetivo. O teste avalia apenas a ação deixada para completar.
3. Cor, desenho, nomes livres e valores coerentes não exigem a cópia do gabarito. Movimento,
   limite, condição, consumo único e reinício são conferidos executando casos relevantes.
4. Missões da jornada e desafios do jogo são conteúdos diferentes. Os desafios reaplicam o
   repertório sem conceder posto ou substituir a missão oficial.
5. Poder e extra são opcionais. Um desafio que os usa declara a dependência e não bloqueia os
   demais quadros. Não usar a união de todos os extras como prova de que todo aluno os conhece.
6. Kids e adulto compartilham lógica pedagógica, com metadados, acesso e publicação separados.
   O tratamento de voz e visual deve respeitar cada comunidade.
7. Não inventar UUID de curso ainda inexistente nem acrescentar `blocosManuais` para contornar
   uma falta de ensino. Conteúdo futuro fica validado como artefato e é vinculado ao curso real
   quando ele existir. Ausência de vínculo publicado deve aparecer como pendência editorial.

## Revisão do conteúdo já existente

O [inventário C01b1](repertorio-local.md), gerado de todos os arquivos, identifica cada uma
das 54 atividades e seus dois públicos, objetivos, linguagem, apoio pronto e fontes por
bloco. A [versão estruturada](repertorio-local.json) distingue fontes da trilha e opcionais.
As exceções de lista preparada não comprovam construir a lista ou o laço. Comparar apenas
tipos novos era a regra anterior do Members. Desde C01c, a derivação compara também o
conteúdo, a ordem e a área dos blocos já presentes; apoio intacto e molduras não contam.
Isso ainda não comprova que alterar uma regra foi ensinado: a fonte curricular e a evidência
do executor continuam necessárias.
O inventário é mais abrangente: mostra as fontes de todos os tipos, sem afirmar que todos
sejam bloqueios de acesso. A revisão pedagógica também observa as mudanças de comportamento.

C01b1 desligou todos os pedidos de publicação até a conferência das fontes reais. A revisão
C01b de 30/10 trocou opacidade, clique em grupo, grupo com sprites avulsos e "e" lógico por
blocos da trilha (troca de imagem, desenho condicionado, teclas Espaço/A e Enter/+, se dentro de
se) no Recife, no Pico, no Vale e nas Nuvens. Voltam a pedir publicação os quadros sem nenhum
tipo fora da trilha (teste `publicacao.test.ts`): os seis do Recife e do Pico, os quadros 3 a 5
do Vale e o Jardim com os quadros 1 a 4 das Nuvens, Kids e adulto. Os que dependem de lista e
laço em grupo seguem sem pedido, porque nesses postos a aplicação de listas é em JavaScript
(C02). A importação e a barreira C01a continuam com a equipe. C01a impede publicar cobertura impossível. Os blocos de extras e os apoios sem
fonte continuam visíveis como pendências, sem concessão manual.

A Vila atual retoma eventos, estoque, contagem e estados. Ainda não comprova o conjunto de
pulo com apoio, colisão e dificuldade do Inventor. Os quadros do Recife e do Pico são retomadas
em blocos e os do Vale e das Nuvens não trabalham no ambiente textual nem no Pro. C02 acrescenta
uma aplicação na linguagem de cada posto (seção abaixo), sem retirar as retomadas.

## Desafios na linguagem do posto (C02, 30/10/2026)

O contrato do desafio aceita objetivos Python (perfil do ambiente e entradas), e o Members confere
Python com o mesmo `PythonProjectCheckerService` das aulas, JavaScript em texto pela Ponte (o mesmo
projeto clássico) e JavaScript Pro com o modelo do projeto inicial. Python Pro continua fora. Plano:
[C02](../superpowers/plans/2026-10-30-arquipelago-c02-python-e-texto.md).

| Ilha | Desafio | Linguagem | O que se completa | Pacote |
| --- | --- | --- | --- | --- |
| Recife | Mira de bolhas: resgate dos vagalumes | Python, Pygame Zero | clique dentro e fora, sorteio de toca, relógio e fim da rodada; R no extra | [recife-python](recife/recife-python.manifesto.json) |
| Pico | Subida das fases: o mapa é dado | Python, Pygame Zero | ler a fase (listas), pousar (colisão no eixo y), próxima fase; terceira fase no extra | [pico-python](pico/pico-python.manifesto.json) |
| Vale | Guardião dos ninhos: ondas e alcance | JavaScript em texto (Ponte) | onda como lista de objetos, alcance pela distância, alvo mais adiantado; R no extra | [vale-texto](vale/vale-texto.manifesto.json) |
| Nuvens | Jardim das Nuvens: grade, custo e guardar | JavaScript Pro (Vite e TypeScript) | ocupação, custo, produção, salvar e carregar no modelo; remover no extra | [nuvens-pro](nuvens/nuvens-pro.manifesto.json) |

Cada um tem versão Kids e adulta, é desafio do dia (os seis quadros de cada ilha já estão
ocupados; trocar um quadro é decisão da dona) e vem com `publicar: false`. Inicial, gabarito e
erros causais foram rodados no executor real (Chrome local para o JavaScript clássico; imagem de
produção do studio-runtime para Python e Pro), com o julgamento do core; os números estão no
README de cada ilha.

Lacunas que continuam com a equipe:

- O Estúdio de desafio do jogo abre o JavaScript em texto (na Ponte), mas não abre Python nem
  Pro: o Python precisa de um contexto de autorização de runtime que hoje só existe em aulas,
  salas e autoria, e o Pro de um build. A criança vê um recado; o Admin também não edita esses
  projetos (chegam pelo manifesto).
- Nenhum ambiente publicado tem uma release Python com Pygame Zero. Os projetos do Recife e do Pico
  apontam a release da prova local (`ambiente-python.ts`); antes de importar, troque pela release
  ativa e rode a prova de novo.
- Python e Pro não têm blocos do catálogo do servidor, então não derivam requisitos: abrem pela
  ilha. O Vale em texto deriva blocos da Ponte (JavaScript avançado), que só terão fonte quando os
  cursos do Arquiteto existirem; até lá a barreira C01a recusaria publicar.
- O inventário C01b1 (`repertorio-local`) segue só com os manifestos de blocos.

Esta matriz orienta L03 da entrega integral. As provas existentes do executor continuam
associadas aos projetos intactos. O inventário não substitui esses testes nem declara o
currículo avançado concluído. Gerar de novo com `bun docs/desafios-do-jogo/repertorio-local.ts`.
