# Estúdio Clássico (blocos, JavaScript): proposta de redesenho

Data: 08/11/2026 · Estado: **proposta, aguardando as decisões D1–D8**
Canvas: https://claude.ai/artifact/6azKHuM8CrRLKdpG7FBfED ("Estúdio Clássico — Redesenho")

Pedido: dar ao modo de blocos (clássico, JavaScript, com a Ponte) o mesmo cuidado do redesenho do
Pro de 08/11, para crianças de 9 anos ou mais, com a identidade visual do Kids, cobrindo todas as
telas. O inventário do estado atual veio do código (`packages/studio/src`).

## Regras que não mudam

- A Ponte segue nos dois sentidos; o realce bloco ⇄ linha continua.
- Bloco que a criança já usa não muda de forma. Renderer `zelos` puro.
- Cor = categoria em arco-íris; texto branco nos blocos; texto dos blocos 100% em português.
- Nenhum recurso sai: muda nome e lugar. Trocar de tamanho não remonta Blockly nem a prévia.
- A arte da criança vem do Pinta e do Molda.

## Identidade do Kids aplicada em todas as telas

Paleta do Pen (fundo `#e9eef6`/`#dde5f0`, cartão branco, fio `#d6deea` de 2 px, tinta `#0f1a33`,
ação `#1b5cf3` com degrau `#1343b8`, amarelo `#ffc02e`, menu `#121a30`), temas Padrão e Pink,
Nunito + Baloo 2, cantos 12/16/20/24 px do `tool-chrome.css`, relevo 3D (degrau de 4 px) nos
botões e cartões clicáveis, menu escuro do Kids presente (aberto na galeria, recolhido no editor,
pelo quadrado branco no tablet e no celular), balões e avisos no azul-marinho do menu.

## Revisão a fundo (08/11, mesma data)

Pedido dela: revisar a proposta a fundo para ficar intuitiva, bonita e fácil de entender o que está
acontecendo. Doze correções, já aplicadas no canvas (prancha "Revisão da proposta"):

1. Menu recolhido do Kids + trilho do Estúdio = duas colunas de ícones coladas → o menu do Kids abre
   pelo quadrado branco da barra no editor (como nas outras ferramentas); a cara do Kids fica nas
   cores, fontes e relevo.
2. Três colunas antes dos blocos → só a paleta à esquerda, com "Mais blocos" no pé (as abas Blocos ·
   Materiais · Missão caíram na conferência contra o Blockly, abaixo).
3. Barra de cima com 13 itens → 9; desfazer/refazer vão para a barrinha junto do zoom; o estado do
   jogo mora só no cabeçalho do palco.
4. "Rodar de novo" com o jogo parado → o botão segue o estado (Rodar / Rodar de novo).
5. Paleta com dois modelos diferentes entre pranchas → um só: subcategorias abrem embaixo da
   categoria e viram títulos na gaveta de blocos.
6. As três áreas pareciam iguais → etiquetas com ícone: Começo, Espera, O tempo todo; o jogo novo
   mostra a ordem.
7. Um erro em quatro lugares → caminho único: palco avisa, aba Problemas conta, bloco ganha a marca;
   o balão só abre no toque; o erro não se repete em Mensagens.
8. "Desenho" × "Pintura" confundiam → SVG vira "Figuras"; o ponto de partida vira "Pintura".
9. Palco de 300 px → 360 px e botão "Jogo maior" (meio a meio).
10. "Jogo" num projeto de página → título "Jogo" ou "Página" conforme o projeto.
11. Faltava o modelo do todo → prancha "Como tudo funciona" (blocos → código → jogo → mensagens; as
    três áreas; tabela de cores do estado; um erro do começo ao fim). O passeio usa as mesmas peças.
12. Cores de estado soltas → tabela única: verde rodando, azul preparando, cinza parado, amarelo
    atenção, vermelho parou.

## Conferido contra o Blockly (08/11, mesmo dia)

Pedido dela: a proposta tem de mostrar o que vai ficar de verdade e só o que o Blockly deixa fazer.
As pranchas com blocos viraram **fotos do playground** (`packages/studio`, exemplo "Pegue a moeda")
com a proposta aplicada por CSS, pela API pública do Blockly 12.5.1 e, nas partes React, com as
classes reais do Pro. Prancha nova "O que o Blockly deixa".

| Lugar | Mudança | Como | Esforço |
|---|---|---|---|
| Barra | Rodar de novo / Parar no meio | `ProRunControls` do Pro | já existe no Pro |
| Barra | Um selo só ("Guardado"), Zappy só ícone até 1600 px, olho da prévia no ⋯ | Topbar + limite novo | peça nossa |
| Palco | "Jogo" + estado, Jogo maior, tela cheia, cartão "Opa" | `ProStage`/`ProStageState` | já existe no Pro |
| Gaveta | Mensagens do jogo / Problemas | `ProDock` lendo o Console | já existe no Pro |
| Categorias | "›" no lugar do triângulo, 3º nível mais baixo | CSS `.blocklyToolboxCategory*` | só CSS |
| Categorias | "Mais blocos" no pé da paleta | `ToolboxItem` próprio registrado | com trabalho |
| Áreas | "· roda uma vez" / "· espera acontecer" / "· repete sem parar" + dica | `FieldLabel` com classe + `setTooltip` | API |
| Dicas e balão | Fundo azul-marinho, letra branca | CSS `.blocklyTooltipDiv`, `.blocklyTextBubble` | só CSS |
| Botão direito | Escrever um recado, Encaixes…, Fechar/Desligar o bloco, Perguntar ao Zappy | `ContextMenuRegistry` | API |
| Erro | Sinal vermelho no bloco que parou | `setWarningText` + CSS do ícone | API + CSS |
| Erro | Linha do erro → bloco | `sourceMap` do gerador (o da Ponte) | com trabalho |
| Rascunho | Sinal amarelo no tracejado que já existe | CSS em `.sz-draft-block` | só CSS |
| Apagar | "Solte aqui para apagar" | CSS em `.blocklyToolboxDelete` | só CSS |
| Ponte | Abas Página/Estilo/Programa, "Arrumar código" | texto | só texto |
| Celular | Rodar flutuante, aba "Jogo" | peças do Pro + texto | já existe no Pro |

**Saiu:** painel com abas Blocos/Materiais/Missão (Materiais segue na janela "Materiais do jogo",
Missão na coluna da direita, `PensaMissionLayout`); etiquetas soltas sobre as áreas; "Solte aqui"
dentro de área vazia; selo "Novo para você" em bloco da gaveta e atalhos no topo da gaveta; barra
de zoom própria (ficam zoom e lixeira do Blockly); paleta em ladrilhos e "pedaço só em código"
listrado na Ponte; paleta em folha no celular (fica a faixa horizontal de hoje); "Blocos e código"
escrito no seletor (não cabe; vai para a dica, então **D2 cai**). Correção de desenho: as áreas
têm cor (Ao iniciar `#b95510`, Quando acontecer `#eab308`, Enquanto estiver rodando `#14b8a6`), e
num projeto do Jogo 2D a paleta tem só Programação, Som e Jogo 2D.

**Problemas que as fotos mostraram (já existem):** zoom e lixeira por cima dos blocos; no celular,
faixa branca vazia sob as categorias e o nome do jogo some da barra; Jogo 2D com três níveis de
categoria; dicas de bloco com quebra de linha no meio da frase.

## Segunda revisão e modo escuro (08/11, mesmo dia)

Pedido dela: com a proposta já fiel ao Blockly, revisar de novo e prever o modo escuro. Tudo foi
aplicado no playground e fotografado nos dois modos (pranchas "Segunda revisão", "Modo escuro: o
editor" e "Modo escuro: janelas e cores").

1. O erro em um caminho só (a foto anterior mostrava balão, gaveta e cartão juntos): parou = cartão
   no palco + "1" em Problemas + sinal no bloco; "Mostrar o bloco" faz `centerOnBlock` + `select` +
   `setBubbleVisible`.
2. Área amarela (`sz_frame_events`, `#eab308`) com letra branca, contraste ~2:1: `addClass` no bloco
   e CSS só no texto do cabeçalho (letra `#3a2a00`).
3. Ao abrir, blocos no alto da tela e zoom 1,0 (D8): `setScale` + `scroll` no carregamento.
4. Ícone em toda categoria de cima (🧠 Programação, 🔊 Som, 🎮 Jogo 2D): texto no toolbox.ts.
5. Zoom e lixeira a 80% (o Blockly usa 40%).
6. Dica opaca com fio claro.
7. "Copiar blocos" → "Copiar".
8. Escuro: selo "Guardado" verde-claro (`#8ee6b4`).
9. Escuro: a grade é decidida na injeção; trocar de tema com o editor aberto deixava pontos brancos →
   CSS em `.blocklyGridPattern line` por tema.
10. Escuro: Monaco cinza (`#1e1e1e`) → tema próprio com o fundo `#121a30`.
11. Escuro: balão branco com letra azul-marinho, aviso de apagar em vermelho claro, Rodar flutuante
    em azul-claro com letra azul-marinho (regra do Kids no escuro: `--sz-tool-cta` `#6e9bff`).
12. Celular: faixa vazia de ~40 px sob as categorias, ainda sem causa (não é gaveta nem paleta).

Modo escuro das telas React: as janelas de hoje já ficam escuras pelas receitas `.sz-tool-*` e
`.sz-pro-*`; as telas novas usam as mesmas receitas, sem cor escrita à mão. Tabela de pares claro →
escuro na prancha "Modo escuro: janelas e cores" (fundo `#121a30`, faixa `#263049`, quieto e fio
`#1b2540`, texto branco, suave `#cbd4e8`, ação `#6e9bff` com letra azul-marinho, degrau puxado ao
preto; blocos, categorias, Compartilhar, Pinta e Molda iguais). As fotos mostraram que o botão
principal do Materiais e do Compartilhar sai sem relevo; nas telas novas ele leva o degrau.

## Galeria compartilhada e criar em três estados (08/11, mesmo dia)

Ela lembrou: "Meus jogos" é a MESMA galeria para jogos JavaScript e Python, e criar um jogo tem três
estados. Pranchas "Meus jogos (JavaScript e Python)", "Meus jogos no escuro" e "Criar um jogo novo"
1, 2 e 3 (cada uma com a janela no claro e no escuro).

- Cartão: etiqueta de linguagem (JavaScript/Python) + jeito (Com blocos/Com código); o resumo já
  guarda `programmingLanguage`. Filtro JavaScript · Python ao lado de Com blocos · Com código, só
  quando há jogos nas duas ou o Python está liberado. "Continuar" abre o editor certo. A galeria de
  jogos prontos (`KitGallery`) já troca de linguagem; passa a lembrar a última escolha.
- Criar: (1) nenhuma linguagem marcada, dois cartões grandes, "Criar e abrir" desligado; os recados
  de descoberta do Python (carregando, indisponível, erro + Tentar de novo) viram o estado do cartão;
  com uma linguagem só liberada, abre direto nela. (2) JavaScript: Com blocos / Com código (Pro só se
  liberado); partida Em branco, Jogo 2D, Jogo 3D (se o nível libera). (3) Python: Com blocos (Python
  clássico) / Com código (ambiente pro, se o servidor oferece); partida Em branco, Desenho com a
  tartaruga, Jogo com Pygame Zero; "Ambiente Python 1/2" sai da tela (o primeiro da lista, como hoje).
- ⚠️ Regra dela: **"Em branco" é em branco mesmo**, sem áreas e sem extensão ("quem garante quais
  áreas a criança vai usar?"). Os outros pontos de partida só instalam a extensão
  (`installExtension`), nunca criam áreas. Por isso Página e Pintura saíram (seriam iguais ao Em
  branco). **D5 reescrita** assim.

## Terceira revisão (08/11, mesmo dia)

Cada prancha foi montada como página e conferida (nenhuma passa da borda). Doze ajustes: Palavras
(Ponte fica, D2 caiu); Plano (barra da foto, duas linguagens); "Como tudo funciona" sem botão no
balão do Blockly (o balão só aceita texto; os botões ficam no cartão de Problemas); blocos reais
recortados das fotos no lugar dos desenhados (em Mais blocos, o exemplo vem de `blockly/screenshot.ts`);
Materiais redesenhado como a janela de hoje, com a Biblioteca e sem o inventado "Trazer da equipe";
o menu ⋯ recupera a porta dos Materiais e "Mudar tema"; capa e celular sem a folha da paleta; faixa
vazia do celular "sem causa achada" em todo lugar; Palco igual à foto ("Mostrar o bloco" + "Rodar de
novo"); passeio com o caminho novo do erro; modo escuro em Palco, Gaveta, Mais blocos, Compartilhar,
Missão e Materiais; foto escura de "Meus jogos" refeita a 1440 px.
Fora da proposta, registrado: o editor de blocos do Python (recebe as mesmas peças; pede fotos com o
Python ligado, que o playground não tem).

## Python em blocos (08/11, mesmo dia)

Pedido dela: o Estúdio de blocos do Python está muito diferente do JavaScript. Fotos reais pela
página de teste do Python (`e2e-python-editor`, com o servidor `experiments/studio-python-runtime`;
no Windows ele exige Bun 1.4.3, usado isolado no scratchpad), jogo "Raposa Caça-Moedas (Blocos)".
Pranchas "Python em blocos", "Python: paleta, erro e Ponte" e "Python no escuro e o que dá".

- Barra: Rodar de novo/Parar no meio (a prévia Python já tem `controls="hidden"`, que o Pro usa);
  some a barra "Rodar · Parar · Parado"; palco e gaveta do Pro; Zappy e Compartilhar vêm do host.
- Três linhas de controles (Arquivo; Programa/De cima para baixo/Buscar função/Programa
  completo/Recolher funções/Rascunhos/"Peças fora do Programa não executam."; Buscar blocos) viram
  uma: `main.py ▾` · Ir para [Programa inteiro ▾] · Fechar as funções · Procurar um bloco ·
  Rascunhos N (a frase vira dica). Mesmos comandos de `PythonBlocklyEditor`/`PythonClassicWorkspace`.
- Paleta em coluna (hoje `horizontalLayout: true` mesmo no computador), com ícone, "›" e Mais
  blocos. **D9**: Blocos e Ponte usam o MESMO editor aberto e o Blockly só escolhe faixa/coluna na
  injeção → recomendação: coluna nos dois modos, como o JS; alternativa: faixa na Ponte com
  reabertura a cada troca (medir no Pac-Man, >1000 blocos).
- Bloco da área: "Programa · roda de cima para baixo" (só texto). Erro: mesmo caminho do JS; ligar
  a linha do erro ao bloco usa as posições que a Ponte já tem (com trabalho).
- Ponte: abas com os nomes reais dos arquivos (main.py, README.md); no estreito, Fechar as funções e
  Rascunhos num ⋯. Escuro: o Python já faz `setTheme`; grade segue o tema.
- Console: como no JS, hoje escondido em Blocos/Ponte (`resolveConsoleVisibility`); D4 vale também.

## Quarta revisão e ajustes dela no Python (08/11, mesmo dia)

Revisão "isto vale para o Python?" em todas as pranchas (Criar jogo Python, Como tudo funciona com o
Programa, título "Programa" no palco, passeio, Palavras, Ponte estreita, tablet/celular, cartão do
Python em "O que o Blockly deixa"). Depois, pedidos dela, todos fotografados no Python real:
- **Paleta em coluna também na Ponte** (faixa só no celular). D9 decidida por ela.
- **Procurar um bloco dentro da paleta**: a categoria `search` do JS registrada no Python (testada:
  "ator" → 29 blocos). Some o campo "Buscar blocos".
- **Áreas do projeto** com o bloco `sz_py_program` (segundo Programa recusado, como `enforceUniqueProjectAreas`).
- **Só os .py nas abas** de Blocos e Ponte (README.md, NOTICE.md, LICENSE, requirements.txt ficam no
  projeto, aparecem no Pro e no Baixar o código).
- **Cabeçalho dos blocos** no molde do cabeçalho do palco (`.sz-pro-stage__head`): tile Py + main.py
  · Ir para: Programa inteiro · Fechar as funções · Rascunhos N; abaixo de ~760 px só ícones.
- **Ícone**: Rodar de novo = setas em círculo; play só no Rodar (vale para o JS; fotos refeitas).
- **Cor dos valores**: literal (texto, número, tupla, booleano) dentro de bloco de extensão pinta-se
  com tom 22% mais escuro da cor do bloco de fora (`setColour`), como as tomadas do Jogo 2D.
- **Responsividade**: fotos do Python a 1024 e 390 px, claro e escuro. Parado, o palco mostra
  "Aperte Rodar para ver seu jogo".

## Levantamento: o que muda nas aulas já gravadas (08/11)

Gravados: Cadê Todo Mundo (3 aulas) e A Chave do Farol (Desafio, 4 aulas). As partes de montagem
são gravadas pelo robô do EdiAula no `palco-gravacao`, lendo os gestos do **Na tela**, no tempo da
voz do ElevenLabs. Voz e tela são separadas: regravar a tela não exige voz nova se a fala continuar
certa.

- **Partes com o Estúdio na tela:** Cadê 4 (aula 1: 1; aula 2: 3), Desafio 11 (Dia 1: 2; Dia 2: 3;
  Dia 3: 6). Experiências, abertura, livro e certificado não mostram o Estúdio.
- **Falas que citam o Estúdio e quebrariam:**
  - Desafio Dia 2 e Dia 3: "clique em **Atualizar**, o botão com uma seta redonda, logo acima do
    jogo" (10 vezes na voz; o robô faz `[clicar "Atualizar o preview"]` 10 vezes).
  - Cadê aula 1: "espere aparecer **Salvo**".
  - Cadê aula 2 e Desafio Dia 3 (Compartilhar): "Resumo do projeto", "Gerar capa", "**Publicar**",
    "**Copiar link de jogar**", "Fechar" (a proposta mudou para "Publicar no Mural" e "Copiar o link").
  - O resto da fala (categorias, nomes de blocos, áreas, lixeira, prévia) não muda.
- **O que o robô procura** (manter na implementação): `iframe[title="Pré-visualização"]`, botão
  "Atualizar o preview", categorias pelo nome sem emoji, bloco pelo começo do texto (o "· roda uma
  vez" depois não atrapalha), `.blocklyTrash`, `.blocklyToolbox`, menu "Organizar blocos",
  `.blocklyDropDownDiv`, `input.blocklyHtmlInput`, os botões do Compartilhar e `[aria-label^="Baixar"]`.
- **Com três âncoras mantidas, nenhuma fala quebra:** (1) botão **Atualizar** com seta redonda no
  cabeçalho do palco, logo acima do jogo (o Pro já tem: `run.reload` = "Atualizar"), com o nome
  acessível "Atualizar o preview"; (2) o selo único diz **Salvo** (não "Guardado"; o e2e
  `smoke.spec.ts` também procura "Salvo"); (3) o Compartilhar mantém "Resumo do projeto", "Gerar
  capa", "Publicar", "Copiar link de jogar", "Fechar". Aí os vídeos ficam só com a cara antiga.
- **Regravar a tela (opcional, recomendado em lote):** as 15 partes, com a mesma voz e o mesmo
  plano (Verificar plano antes). Junta com as 3 regravações que a moldura nova já pede
  (`video-a1-toque` do Cadê; `video-d1-quadro` e `video-d1-limite` do Desafio). A edição
  (`[na edição: ...]`, trocas Dedé/Debinha) precisa ser reaplicada no EdiAula.
- **Roteiros ainda não gravados:** com as três âncoras, nenhum texto muda ("Salvo" em 10 roteiros,
  "Mais opções/três pontinhos", "Áreas do projeto", "lixeira", "menu ⋯ → Imagens" seguem valendo).
- **Fora das aulas:** "Como fazer" Kids, 13 tutoriais do Estúdio com 44 prints, mais os do Pinta e
  Molda que mostram o Estúdio; adulto, 11 tutoriais do Estúdio (o Estúdio é o mesmo componente na
  comunidade adulta). Refazer prints e alguns textos (prévia, salvar, materiais, achar blocos).
  Os PDFs do passo a passo desenham os blocos pelas definições, sem foto do Estúdio: não mudam.

## Princípios

1. **Um botão manda**: Rodar (ou Rodar de novo) e Parar no meio da barra (saem da barra da prévia).
2. **Palavras de criança** (tabela completa na prancha "Palavras de criança").
3. **Cada coisa num lugar**: paleta à esquerda com Mais blocos no pé; jogo à direita; mensagens e
   problemas embaixo; a barra cabe a 1440 px; o menu ⋯ fica com o que se usa pouco.
4. **O erro aparece onde ela olha**: um caminho só (palco → aba Problemas → marca no bloco → balão
   no toque).
5. **A Ponte ensina**: abas Página/Estilo/Programa, realce na cor da categoria, pílula de sincronia.
6. **Três tamanhos** (largo, tablet, celular) com abas embaixo, Rodar flutuante e folhas.

## Vocabulário (principais trocas)

Reproduzir/Atualizar → Rodar/Rodar de novo · Preview/Pré-visualização → Jogo · Console → Mensagens
do jogo · log/warn/error → Mensagem/Atenção/Problema · Formatar código → Arrumar código ·
index.html/style.css/script.js → Página/Estilo/Programa · Limpar + Organizar blocos → Organizar
blocos · Colapsar/Expandir → Fechar/Abrir o bloco · Desabilitar → Desligar · Entradas
incorporadas/externas → Encaixes na mesma linha/um embaixo do outro · Código avançado → Pedaço só em
código · Extensões → Mais blocos · Instalar/Remover → Pôr no meu jogo/Tirar do jogo · asset/fatiar/
tiles sólidos → material/recortar em peças/peças firmes · Exportar para publicação → Pôr na
internet (com um adulto) · Salvo/Alterações não salvas/Salvar → pílula única "Guardado" ·
"Sistema Zero Studio" → Estúdio.

## Decisões pendentes (recomendação entre parênteses)

- **D1** O jogo continua atualizando sozinho? (sim; Rodar de novo recomeça, Parar congela)
- **D2** ~~"Ponte" vira "Blocos e código" no seletor?~~ Caiu: não cabe na barra; o nome longo vai para a dica.
- **D3** Categorias com nome em português e sigla pequena? (sim: Página · HTML, Estilo · CSS,
  Figuras · SVG, Pintura · Canvas, Cena 3D, Código avançado; cores iguais)
- **D4** Gaveta sempre à vista, fechada em 40 px com contadores? (sim)
- **D5** "Criar um jogo novo" com ponto de partida só de extensão (JS: Em branco, Jogo 2D, Jogo 3D; Python: Em branco, Turtle, Pygame Zero), depois da escolha da linguagem? (sim; Em branco sem áreas)
- **D6** Passeio de quatro balões no primeiro jogo de blocos? (sim, com Pular)
- **D7** Texto dos blocos "… no console" passa a "… nas mensagens"? (sim; só texto)
- **D8** Zoom inicial 0,9 → 1,0? (sim; sem mexer na letra nem na forma)
- **D9** ~~Paleta do Python em coluna também na Ponte?~~ Decidida por ela: coluna no computador, faixa só no celular.

## Telas (uma prancha cada no canvas)

- **Meus jogos**: Criar um jogo novo em destaque, "Continuar de onde parei", filtros Com blocos/Com
  código, cartão com relevo e "Mexido há 2 horas", lista vazia com pontos de partida.
- **Criar um jogo novo**: Com blocos / Com código (só com o Pro liberado), ponto de partida (D5),
  nome com "Sortear um nome".
- **Editor (largo)**: ver "Conferido contra o Blockly" (foto real na prancha Editor).
- **Paleta**: subcategorias como atalhos no topo da gaveta de blocos, selo "Novo para você", busca
  agrupada e sem resultado (com Zappy), dica do bloco com "No código".
- **Área de montagem**: "Solte aqui" nas áreas vazias, bloco desligado/fechado legíveis, menus do
  botão direito reescritos (com "Perguntar ao Zappy sobre este bloco"), avisos no canto em vez de
  `window.alert`, paleta vira alvo de apagar ao arrastar.
- **Palco**: cabeçalho com estado, controles na tela e tela cheia; cartões Rodando, Preparando
  (passos), Parado, Opa (erro com Mostrar o bloco), Ficou grande, Travado.
- **Gaveta**: Mensagens do jogo (filtros, mensagens repetidas agrupadas, "O que o computador
  disse") e Problemas (erro de execução, erro de digitação da Ponte, material faltando, rascunho,
  pedaços só em código).
- **Blocos e código**: paleta em ladrilhos, realce na cor da categoria, abas com ladrilho, pílula de
  sincronia, pedaço só em código listrado, palco que se esconde.
- **Materiais** (a janela "Materiais do jogo" de hoje, revista): abas com contagem, Trazer do Pinta em destaque, miniaturas
  com fundo xadrez, seletor de imagem do bloco com miniaturas; aba 3D com Trazer do Molda.
- **Mais blocos** (era Extensões): vitrine de cartões com bloco de exemplo, "usa o teclado, o mouse
  e o som", estados instalado/conflito/não conquistado, confirmação de tirar com contagem.
- **Compartilhar e menu ⋯**: janela com prévia do cartão do Mural, menu ⋯ com linha de apoio por
  item, Pôr na internet com "Para o adulto", Virar profissional.
- **Missão e Zappy**: missão do Pensa na coluna da direita, como hoje, Zappy
  com o contexto do bloco/erro, passeio de quatro balões, tela de ferramentas a conquistar.
- **Tablet**: Rodar/Parar só no ícone, paleta fixa, blocos e jogo lado a lado, gaveta começa fechada.
- **Celular**: abas Blocos · Jogo · Mensagens, paleta na faixa horizontal do Blockly, Rodar
  flutuante, Parar sob o jogo, janelas em folhas.

## Etapas depois das decisões

1. Base (vocabulário `run.*` no clássico, ícones das categorias, estado de execução lido pela barra
   e pelo palco). 2. Barra de cima. 3. Palco. 4. Gaveta. 5. Paleta e área (CSS e API do Blockly). 6. Blocos e
código. 7. Janelas e lista. 8. Tablet, celular e acabamento (testes e conferência no navegador em
1440/1024/390 px, dentro do Kids, temas Padrão e Pink).
