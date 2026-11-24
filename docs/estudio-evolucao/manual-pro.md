# Manual do Estúdio Pro

Para quem programa com código: crianças e adolescentes que já passaram dos blocos, famílias e a
equipe. Vale para o **Pro em JavaScript** (projetos Vite, com JavaScript ou TypeScript) e para o
**Python Pro**. Os nomes entre aspas são os que aparecem na tela. Escrito em 21/11/2026 a partir do
código da staging (`packages/studio`); o Estúdio de produção pode estar numa versão anterior.

O Estúdio com blocos tem o manual próprio: [`manual-classico.md`](manual-classico.md).

## 1. Como chegar ao Pro

- **Projeto novo:** "Novo projeto", escolha a linguagem e, em "Como você quer criar?", **"Com
  código"** ("Escreva o código, com arquivos, materiais e o Zappy."). O "Ponto de partida" traz os
  modelos do Pro, entre eles os de JavaScript, TypeScript, Three.js e React.
- **Vindo dos blocos:** no Estúdio Clássico, menu ⋯ → "O meu jogo" → **"Virar profissional"**.
  Antes de converter, o Estúdio guarda uma cópia completa do jogo em Blocos na lista de projetos.
  A conversão não volta: o projeto Pro não vira blocos de novo, e o código fica como você escrever.

Na lista "Meus Jogos", o cartão de um Pro que veio de blocos mostra, logo abaixo do nome, **"Feito a
partir de …"** com o nome da cópia em blocos. Se a cópia foi apagada, a linha não aparece.

Quando o navegador não consegue rodar o modo Código, o palco diz "Este navegador não roda o modo
Código" e sugere abrir o projeto no computador, no Chrome ou no Edge; no celular ou no tablet os
projetos de blocos continuam disponíveis.

## 2. A tela

| Parte | Onde fica | O que tem |
|---|---|---|
| Barra de cima | no alto | Voltar à lista, nome do projeto, "Salvo", "Rodar", "Rodar de novo" e "Parar" no meio, "Zappy", "Desfazer", "Refazer", o ⋯ ("Mais opções") e "Compartilhar" |
| Trilho "Explorar o projeto" | à esquerda | "Arquivos", "Procurar", "Materiais" e "Guias" |
| Editor | no centro | As abas dos arquivos abertos e o código |
| Palco | à direita | O jogo ("Jogo"), a página ("Página") ou o programa ("Programa") |
| Gaveta | embaixo | Mensagens, Problemas e as ferramentas (seção 8) |

**"Arrumação da tela"** escolhe entre "Lado a lado", "Só o código" e "Só o jogo" ("Só o programa"
no Python). No tablet a gaveta abre fechada; no celular a tela vira as abas "Código" e "Saída", e o
Rodar vira um botão flutuante.

O menu ⋯ do Pro tem quase os mesmos grupos do Clássico, com estas diferenças:
- "Mais blocos" só aparece no Python Pro (é por ali que se instala Turtle, Pygame Zero, pygame-ce ou
  Raylib);
- entra **"Atalhos do teclado"** no grupo "Estúdio";
- entra **"Abrir a versão em blocos"** quando o projeto veio de "Virar profissional" (seção 11);
- "Virar profissional" e "Mostrar o jogo" não aparecem (o projeto já é profissional, e o jogo fica
  na "Arrumação da tela");
- em "Mostrar" entra o "Terminal" no Pro em JavaScript, quando a página o libera.

Os materiais moram no trilho, não no menu.

## 3. Arquivos e a seção Configuração

O painel **"Arquivos"** mostra a árvore do projeto em duas partes:

- **"Você mexe aqui"**: o código do jogo. Cada arquivo diz o que é: "Onde o jogo começa", "Código do
  jogo", "Como o jogo fica: cores e tamanhos", "A página que segura o jogo", "Dados do jogo".
- **"Configuração"**, com a dica "Só mexa se um guia pedir.": os arquivos que dizem como o jogo é
  montado, como o `package.json` ("A lista de peças do jogo") e o `vite.config` ("Como o jogo é
  montado"). Ao abrir um deles, o editor avisa: "Este arquivo diz como o jogo é montado. Só mexa
  nele se um guia pedir."

**Criar:** "Novo" abre "Criar um arquivo": "O que você quer criar?" (código JavaScript, código
TypeScript, código Python, estilo CSS, página HTML, texto ou pasta), "Nome", "Onde guardar" e "Vai
ficar assim: …". A terminação entra sozinha; use letras sem acentos, números, ponto, hífen ou
sublinhado. "Criar" confirma.

**Opções de um arquivo** (o botão ao lado do nome): "Mudar o nome" (escreva o caminho completo
para mudar de pasta; Enter confere, Esc desiste), "Copiar o caminho", "Novo arquivo aqui" e
"Apagar…". Trocar nome, mover e apagar passam pela janela "Conferir mudança nos arquivos", com
"Aplicar mudança", e entram no Histórico do projeto (seção 10).

## 4. O editor

O editor é o Monaco, o mesmo do VS Code, com as palavras do Estúdio.

**Na faixa de cima do editor:**

- as abas dos arquivos abertos (uma aba em itálico é temporária; dê dois cliques para fixá-la);
- **"Arrumar código"** (Shift+Alt+F): formata o arquivo aberto;
- **"Tamanho da letra"**;
- **"Mais"**, com:
  - "Mapa do arquivo" (Ctrl+Shift+O): as funções e classes do arquivo, com busca ("Buscar no mapa
    do arquivo");
  - "Ir para um arquivo" (Ctrl+P): digite parte do caminho, ↑ ↓ escolhe, Enter abre, Esc volta;
  - "Procurar neste arquivo" (Ctrl+F);
  - "Onde isto é usado" (Shift+F12): todos os lugares que usam o nome sob o cursor;
  - "Trocar nome em todo lugar" (F2): "Nome de agora", "Nome novo" e "Conferir referências" antes
    de aplicar;
  - "Mostrar espaços", "Mostrar na lista de arquivos", "Deixar esta aba aberta" (só quando a aba
    aberta é temporária) e "Fechar as outras abas";
  - "Histórico do projeto" (seção 10);
  - "Todas as ações…" (Ctrl+Shift+P).

**"Todas as ações"** pergunta "O que você quer fazer?" e reúne tudo: "Ir para um arquivo",
"Encontrar no código do projeto", "Mapa do arquivo", "Arrumar código", **"Organizar as
importações"** (arruma e tira as importações que sobram no arquivo aberto, num passo só de
desfazer; vale nos arquivos de JavaScript e TypeScript), "Trazer materiais", "Onde isto é usado",
"Trocar nome em todo lugar", **"Histórico do projeto"**, "Voltar para onde eu estava", as ações do
Zappy (seção 13) e "Inserir exemplo: …" (funções pequenas para conferir e ligar ao seu jogo).

**Limites que o editor explica:**

- "Trocar nome em todo lugar" recusa uma troca que mexeria em mais de 24 arquivos, para a
  recuperação caber inteira.
- A lista de Problemas mostra até 100 problemas de código: "Arrume alguns para ver os próximos."
- O projeto segue as cotas do compilador: até 80 arquivos de código, 256 mil caracteres por arquivo
  e 1,5 milhão no total ([`pro-em-escala.md`](pro-em-escala.md)). Quando a página declara as
  cotas, o editor recusa a mudança que passaria delas.

**Atalhos:** menu ⋯ → "Atalhos do teclado". Além dos de cima: "Desfazer" (Ctrl+Z), "Refazer"
(Ctrl+Y; ⇧⌘Z no Mac), "Transformar a linha em comentário" (Ctrl+/) e, no Python, "Testar a linha de
Python" (Ctrl+Enter). No Mac e no iPad, Ctrl vira ⌘. Os atalhos valem com o cursor dentro do código.

## 5. Procurar

O painel **"Procurar"** tem duas buscas: **"Nome do arquivo"** ("Encontrar um arquivo") e **"Dentro
do código"** ("Encontrar no código do projeto", Ctrl+Shift+F). Cada resultado mostra o arquivo e a
linha. A busca acha o texto exatamente como está escrito: caminhos montados pelo código podem não
aparecer. Com muitos resultados, ela mostra os primeiros e pede para refinar.

## 6. A prévia e o Rodar

- **"Rodar"** monta e roda o jogo; com ele rodando, o botão vira **"Rodar de novo"**; **"Parar"**
  encerra. Parado, o palco diz "Aperte Rodar para ver seu jogo" e "Tudo o que você mudou no código
  já está guardado.", com o botão "Rodar o jogo".
- Na primeira vez pode aparecer **"Preparando a oficina"** ("A primeira vez demora um pouco mais."),
  com os passos "Ligando o motor", "Separando as peças", "Montando o jogo" e "Abrindo o jogo".
- Enquanto um jogo novo é montado, a versão anterior fica na tela ("Montando as mudanças. A última
  versão continua na tela."). Quando o código mudou e o palco mostra a versão anterior, aparece
  "Código mudou".
- Se o jogo não abrir: "Opa, o jogo não conseguiu abrir", com "Tentar de novo" e "Ver o que
  aconteceu".

**Onde o jogo roda.** O Estúdio escolhe sozinho, pela capacidade real
([`pro-execucao.md`](pro-execucao.md)):

| Execução | Quando | Como |
|---|---|---|
| **Leve** | A página entrega o compilador do servidor e o projeto cabe no navegador | O próprio navegador monta o projeto igual ao Vite, sem ida ao servidor |
| **Hospedada** | A página entrega o compilador e o projeto não cabe na leve | O servidor roda o Vite num contêiner isolado e devolve o jogo |
| **Completa** | A página não entrega o compilador do servidor | O WebContainer roda o Node no navegador, com `npm install`, `npm run dev`, terminal e recarga a quente |

Vai ao servidor (hospedada) todo projeto com biblioteca no `package.json`, com materiais (imagens,
sons, modelos), com JSX ou TSX, com `vite.config` diferente do modelo e outros casos listados em
[`pro-execucao.md`](pro-execucao.md). Os modelos "JavaScript" e "TypeScript" cabem na leve; os de
Three.js e React vão ao servidor.

Em todas as três, o código do projeto roda num quadro isolado, nunca na página do Estúdio.

## 7. O terminal

O terminal só existe no Pro em JavaScript; no Python não há terminal. A aba "Terminal"
("avançado") da gaveta aparece quando a página o libera, ou pelo menu ⋯ → "Mostrar" → "Terminal".
Ele só funciona de verdade na execução completa (WebContainer, que precisa do isolamento COOP e
COEP da página); sem isso a aba diz "O terminal real não está disponível aqui ainda."

- Na primeira vez: "O terminal é a janela dos programadores", com "Abrir o terminal" e "O que dá
  para fazer nele?".
- **"Comandos úteis"**: "Ver os arquivos", "Ver as peças do jogo", "Ver as bibliotecas", "Instalar
  uma biblioteca" (só escreve `npm install ` para você completar), "Limpar a tela" e "Parar o que
  está rodando".
- "Travou? Reiniciar terminal" reinicia o terminal.
- **Não rode `npm run dev` no terminal**: "O jogo já roda pelo botão Rodar: aqui não precisa de npm
  run dev."

Uma biblioteca instalada pelo terminal entra no `package.json` do projeto (na seção
"Configuração"), o editor passa a conhecê-la e ela continua lá depois de recarregar a página
(ensaio com `nanoid`, [`pro-em-escala.md`](pro-em-escala.md)).

Em quais páginas da plataforma o Pro usa hoje a execução completa: não confirmado. O documento
[`pro-execucao.md`](pro-execucao.md) diz que só o playground de desenvolvimento; o host do Estúdio
Completo (`packages/member-shell/src/components/creator/studio-pro-client.tsx`) não passa o
compilador do servidor ao editor, o que indica a execução completa ali.

## 8. A gaveta

| Aba | Pro em JavaScript | Python Pro |
|---|---|---|
| "Mensagens do jogo" / "Mensagens do programa" | o que o jogo escreve com `console.log` | o que o programa escreve com `print` |
| "Problemas" | sim | sim |
| "Investigar" | o caminho até o erro | não |
| "Desempenho" | quadros por segundo e tempo de cada quadro | não |
| "Meus testes" | quando a página entrega o executor do servidor | não |
| "Terminal" | na execução completa | não |
| "Experimentar comandos" | não | testar linhas de Python |

**"Problemas"** lista os erros e avisos do código ("{arquivo} · linha {n}") e o erro que parou o
jogo ("O jogo parou com um problema"). Cada um tem "Ir para a linha", "Pedir uma dica ao Zappy" e
"O que o computador disse". Enquanto a análise roda, aparece "Lendo o código…"; quando algumas
linhas mudaram, "Algumas linhas mudaram; esperando a análise nova." Os problemas de uma versão
antiga do código nunca aparecem.

**"Investigar"**, no Pro, mostra **o caminho até o erro** que parou o jogo: cada passo que é um
arquivo do projeto, com o arquivo, a linha, o texto da linha e "Ir para a linha". As bibliotecas e
o navegador ficam de fora. Sem erro, a aba diz: "Quando o jogo parar com um erro, o caminho até ele
aparece aqui, com o arquivo e a linha de cada passo." Pausar e ver valores não existem no Pro nesta
versão.

**"Meus testes"**, no Pro, roda no servidor (o mesmo executor do "Verificar projeto"):

- **"Testar o jogo"**: os passos "Apertar a tecla", "Segurar a tecla" e "Esperar"; no fim, confere
  "o texto na tela", "as mensagens do jogo" ou, nos jogos prontos, "o estado do jogo" (a fase, os
  pontos, a meta ou a vida).
- **"Testar uma função"**: escolha uma `export function` de um arquivo da pasta `src` e escreva os
  casos, um por linha, como no JavaScript (`2, 3 -> 5`), até 8 casos.

O resultado diz, por exemplo, "1 de 1 teste passou. Rodou no servidor em 6 segundos." Cada teste
pode durar até 15 segundos, e os testes nunca mexem no projeto.

## 9. Desempenho

Aperte **"Medir o desempenho"** na aba "Desempenho". O Pro mostra "Quadros por segundo" (o jogo
pede 60; abaixo de 30 ele parece travado) e "Tempo de cada quadro" (para ficar liso, cada quadro
cabe em 16 ms), com a marca "medido", e as barras dos últimos segundos. "Memória do jogo" fica
"indisponível", porque o navegador não informa. A medida para quando você fecha a gaveta ou aperta
"Parar de medir". Medir não recomeça o jogo no Pro.

## 10. Histórico do projeto

Abra pelo menu **"Mais"** do editor → **"Histórico do projeto"** (ou por **"Todas as ações"**). O texto do alto explica: "As versões
ficam guardadas neste computador. Voltar para uma versão guarda antes a de agora, então nada se
perde."

- **Quando o Estúdio guarda uma versão:** ao Rodar (no máximo uma versão de Rodar a cada 2
  minutos), antes de cada operação com arquivos e antes de cada mudança do Zappy. Versão igual à
  anterior não é guardada.
- **Cada linha** tem a hora e o que aconteceu ("Você rodou o jogo", "Antes de o Zappy mudar o
  código", "Antes de: …") e quantos arquivos mudaram.
- **"Ver mudanças"** compara a versão (à esquerda) com o projeto de agora (à direita), um arquivo
  por vez ("Arquivo para comparar").
- **"Voltar para esta versão"** guarda a de agora e volta. Uma volta que mexe em mais de 24
  arquivos é recusada; nesse caso, volte antes a uma versão mais recente.
- **Operações com arquivos** (trocar nome, mover, apagar, materiais) aparecem na mesma lista, com
  **"Recuperar"**.

O histórico fica só neste computador: ficam as últimas 50 versões, ou até 20 MB por projeto, e as
mais antigas saem primeiro. Os materiais (imagens, sons, modelos) não entram nas versões. Nas aulas e
em páginas sem armazenamento local (como o Admin) a janela mostra só as operações com arquivos, com o
"Recuperar"; versões não são guardadas, e o texto do alto diz isso. O histórico sai junto quando o
projeto é apagado. O Histórico do projeto não é o Git, e o Pro não tem Git
([`git-no-pro-avaliacao.md`](git-no-pro-avaliacao.md)); quem quiser Git usa a exportação (seção 12)
e roda `git init` na pasta.

## 11. Abrir a versão em blocos

Num Pro que veio de "Virar profissional", o menu ⋯ → "O meu jogo" tem **"Abrir a versão em
blocos"**. O Estúdio grava o que estiver pendente e abre a cópia em blocos guardada na conversão.
Se a cópia foi apagada, o item fica desligado com a dica "A versão em blocos foi apagada". O item
só aparece quando a página sabe abrir outro projeto (no jogo do Arquipélago, por exemplo, ele não
aparece).

A cópia em blocos é a de antes da conversão: o que você mudar no Pro não volta para ela.

Limitação conhecida: o item diz "A versão em blocos foi apagada" quando a cópia não está neste
computador. Isso pode acontecer num computador novo, se o Pro for aberto direto pelo endereço antes
de a lista descer da conta ([`historico-do-projeto.md`](historico-do-projeto.md)).

## 12. Levar o projeto para fora do Estúdio

No menu ⋯, grupo "Levar o jogo" ([`exportacao.md`](exportacao.md)):

| Item | O que vem | Para quê |
|---|---|---|
| "Baixar o projeto" | `.szproject.json` com o projeto inteiro | abrir em outro Estúdio com "Importar" |
| "Baixar o código" | ZIP com a árvore do projeto, os materiais em `public/` e o `LEIA-ME.txt` | continuar no VS Code ou em outro editor |
| "Baixar para publicar" | ZIP pronto para um servidor (com `Dockerfile` e `railway.json`) | pôr no ar por conta própria |

**Continuar no computador com o "Baixar o código" (Pro em JavaScript):**

1. Descompacte o ZIP e abra a pasta no VS Code (Arquivo > Abrir Pasta). Abra o terminal.
2. Use uma versão do Node.js compatível com o projeto (o LEIA-ME diz qual, quando o `package.json`
   declara).
3. Instale as dependências. O LEIA-ME diz o comando certo para o seu projeto:
   - **`npm ci`** quando o ZIP leva o `package-lock.json`. É o caso dos 14 modelos do Pro e de todo
     projeto cujas bibliotecas estão no grafo aprovado: instala exatamente as versões registradas;
   - **`npm install`** quando o projeto tem uma biblioteca fora do grafo aprovado, declara outro
     gerenciador de pacotes ou usa campos do `package.json` que a trava não descreve (por exemplo
     `peerDependencies` ou `overrides`; lista em [`exportacao.md`](exportacao.md)). Nesse caso,
     guarde o `package-lock.json` que a primeira instalação criar, para repetir as mesmas versões.
4. `npm run dev` inicia o jogo; abra no navegador o endereço que o terminal mostrar.
5. `npm run build` gera a versão final.

Não abra o `index.html` com dois cliques: o TypeScript, as importações e os materiais dependem do
servidor do projeto. Na pasta `public/`, o `studio-assets/manifest.json` relaciona os IDs, os
caminhos e os créditos dos materiais. O ZIP não leva a conversa com o Zappy, as credenciais da
plataforma nem o estado do editor.

**Python Pro:** o ZIP leva os arquivos `.py` e os materiais. Com o Pygame Zero, leva o que é
preciso para rodar no computador (o `pygame-ce` e o `pgzero`), nunca o adaptador do navegador.

A exportação do Pro foi conferida fora do Estúdio: os 14 modelos e um projeto com biblioteca fora
do grafo, instalados numa pasta limpa e construídos duas vezes, deram o mesmo build byte a byte no
Linux e no Windows ([`exportacao.md`](exportacao.md)).

## 13. O Zappy no Pro

O botão "Zappy" da barra abre o painel do assistente virtual. No Kids, o topo avisa: "O Zappy é um
assistente virtual, não uma pessoa da equipe." Pelo editor e por "Todas as ações":

- **"Explicar trecho com Zappy"** e **"Investigar trecho com Zappy"**: o Zappy recebe o trecho
  selecionado e explica;
- **"Pedir mudança nestas linhas"** (Ctrl+Alt+K): abre o Zappy no modo de construir junto. A
  proposta dele aparece para você conferir ("Destacar diferenças" no painel, e "Ampliar
  comparação" abre a janela "Ver mudanças · <arquivo>") e só entra no código com "Aplicar
  alterações"; "Descartar proposta" desiste (`packages/studio/src/components/tutor/ProBuilderPanel.tsx`);
- **"Pedir uma dica ao Zappy"**, em cada problema da aba "Problemas".

Antes de uma mudança do Zappy entrar no código, o Estúdio guarda a versão de agora no Histórico do
projeto ("Antes de o Zappy mudar o código"). O Zappy não muda o código sem um pedido seu.

Com a aba "Desempenho" ligada, uma pergunta ao Zappy leva junto os números que a aba mostra, e ele é
orientado a usar só esses números, sem inventar medidas. Ele não liga a aba sozinho
([`zappy-e-as-abas.md`](zappy-e-as-abas.md)).

## Para a equipe: de onde vêm os nomes deste manual

- Textos do Pro: `packages/studio/src/core/i18n/pro/pt-BR.ts`; barra, menu e mensagens comuns:
  `packages/studio/src/core/i18n/shared/pt-BR.ts`; terminal: as chaves `terminal.*` do mesmo arquivo.
- Grupos do menu ⋯: `packages/studio/src/components/layout/topbar/menuLayout.ts`.
- Menu "Mais" do editor: `packages/studio/src/modes/pro/workspace/ProEditorStrip.tsx`; "Todas as
  ações": `packages/studio/src/modes/pro/workspace/ProCodeTools.tsx`; atalhos:
  `packages/studio/src/components/layout/topbar/ProShortcutsDialog.tsx`.
- Gaveta: `packages/studio/src/modes/pro/workspace/ProDock.tsx`; Investigar, Desempenho e Meus
  testes: `packages/studio/src/components/devtools/`.
- Histórico do projeto: `packages/studio/src/modes/pro/workspace/ProOperationReview.tsx` e
  [`historico-do-projeto.md`](historico-do-projeto.md).
- LEIA-ME do ZIP: `packages/studio/src/export/proSourceInstructions.ts`.
