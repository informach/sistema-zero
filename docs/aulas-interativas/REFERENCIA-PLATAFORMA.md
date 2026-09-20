# Referência da plataforma, medida no código

> Onde cada coisa está na plataforma **hoje**, lido direto do `sistema-zero` em 20/09/2026.
> Serve aos três cursos. Toda fala de aula que nomeia um menu, uma tela ou um botão confere aqui.
>
> A fonte de cada linha está citada. Quando a plataforma mudar, recomece daqui, não de memória.

## 1. O menu da esquerda da Comunidade Kids

Fonte: `packages/community-kids/src/components/kids/nav.ts`

| Item | Rota | Filhos |
|---|---|---|
| **Início** | `/` | — |
| **Carreira** | `/cursos` | — |
| **Criar** | `/criar` | Meus trabalhos `/criar` · **Estúdio** `/estudio` · **Pinta** `/pinta` · Pensa `/pensa` · Molda `/molda` |
| **Comunidade** | `/comunidade` | Nossa turma · Mural dos Criadores · Clube dos Criadores · Ranking |
| **Meu espaço** | `/perfil` | **Meu perfil** `/perfil` · **Meu avatar** `/meu-avatar` · **Meu quarto** `/quarto` |

Três armadilhas de fala:

1. **O item chama Carreira, não Cursos.** A rota é `/cursos`, mas ninguém lê rota.
2. **Estúdio e Pinta são filhos de Criar.** "No menu da esquerda, clica no Pinta" pula um passo:
   primeiro **Criar**, depois **Pinta**.
3. **Dentro de uma aula ou de uma ferramenta, esse menu começa escondido.**

## 2. O menu começa escondido na aula e na ferramenta

Fontes: `packages/community-kids/src/components/kids/focus-mode.tsx`, `focus-mode-toggle.tsx` e
`docs/plans/2026-09-19-aula-imersiva-design.md` (19/09/2026)

Na página de aula e nas galerias de criação embarcadas (Estúdio, Pinta, Pensa, Molda), a barra
esquerda **recolhe sozinha já no primeiro quadro**, e a lista de aulas da direita também. O botão
que traz cada uma de volta se chama **Mostrar menu** e **Mostrar lista de aulas**. Com um editor
aberto, a ferramenta toma a largura inteira. A escolha **não** fica guardada entre visitas: toda vez
que se entra, começa recolhido. Ao voltar para **Criar**, o menu está aberto de novo.

⚠️ **O botão Mostrar menu não está sempre lá.** A régua é
`navAvailable = onFocus && isTablet && !workspaceActive`, então ele some em três situações: abaixo
de 768 px (a barra esquerda só existe a partir do `md`), fora de aula e de galeria de criação, e
**enquanto um projeto está aberto na ferramenta**, porque o editor toma a largura inteira. Fala do
tipo "clica no Mostrar menu para voltar", dita de dentro do Estúdio com o projeto aberto, manda
procurar um botão que não está na tela.

⚠️ **O que isso obriga na fala.** Nenhuma instrução dada de dentro de uma aula pode começar por "no
menu da esquerda": naquele momento não há menu na tela. Três saídas honestas, nesta ordem de
preferência:

1. **O botão da própria seção**, quando o destino é o Estúdio ou o Pinta. O player desenha
   **Abrir meu Estúdio** ou **Abrir meu Pinta** sempre que a seção declara `externalTool`, e o
   link leva `target="_blank"`: **abre em outra aba**, e a fala precisa dizer isso.
2. **O botão do bloco de ação de plataforma**, quando o destino é o avatar, o quarto ou o perfil
   (seção 4 abaixo). Também abre em outra aba.
3. **Mostrar menu**, quando não é nenhum dos dois, que hoje é só a ida à Carreira. A fala manda
   clicar nele antes de nomear o caminho.

## 3. A cor do perfil, que substituiu o tema

Fontes: `packages/core/src/palette/palette.ts`, `packages/member-shell/src/components/palette-picker.tsx`
Commit: `ebcc74d5 feat(platform): persistir paleta por perfil` (17/09/2026)

Em **Meu espaço › Meu perfil** existe uma fileira de caixinhas de cor. São seis, nesta ordem:

**Azul · Turquesa · Verde · Laranja · Rosa · Roxo**

A cor da casa, de todo o ecossistema, é o **Azul**. Quem nunca escolheu vê o azul sem ter escolhido
nada, e isso é diferente de ter escolhido o azul: o seletor grava sempre uma cor concreta.

⚠️ **Não existe mais tema claro e escuro do lado de fora, nem tema Rosa.** Toda fala que mande
"trocar o tema", "deixar no escuro" ou "escolher o tema rosa" está falando de uma tela que saiu.

⚠️ **Dentro do Estúdio continua havendo um Mudar tema**, que é outra coisa: é o claro e escuro da
ferramenta, e mora no grupo **Estúdio** do menu ⋯ (seção 5). Os dois não se confundem na tela, mas
se confundem fácil na fala.

## 4. As três ações de plataforma da aula

Fontes: `packages/core/src/learning/platform-action.ts`,
`packages/member-shell/src/components/section-platform-action.tsx`,
`packages/members/src/application/learning/platform-action.service.ts`

Uma seção pode pedir uma ação fora da aula. São três, e o bloco desenha **um botão que abre o
destino em outra aba**, mais um botão **Verificar minha ação**:

| Ação | Botão | Abre | Passa quando |
|---|---|---|---|
| `customize-avatar` | **Personalizar o avatar** | `/meu-avatar` | o avatar salvo difere do padrão |
| `customize-room` | **Personalizar o quarto** | `/quarto` | tem item, bicho, tema, parede, chão ou luz trocados |
| `change-theme` | **Escolher a minha cor** | `/perfil` | escolheu **alguma** cor, qualquer uma |

A própria plataforma escreve, na seção: "Vá em Meu perfil, escolha a sua cor e volte aqui para eu
conferir!" e, nas outras duas, "Deixe do seu jeito, salve e volte aqui para eu conferir!"

⚠️ Duas coisas que a fala precisa dizer e costuma esquecer: **abre em outra aba**, então tem que
voltar para a aba da aula; e a conferência **não é automática**, tem que apertar Verificar minha ação.

⚠️ A régua do `change-theme` é "escolheu uma cor", não "escolheu a cor X". Nenhuma fala pode mandar
escolher uma cor específica como se fosse condição para passar.

## 5. O menu ⋯ do Estúdio

Fontes: `packages/studio/src/components/layout/topbar/menuLayout.ts` e `core/i18n/pt-BR.ts`
Commit: `d91b5a5a fix(studio): full review do menu ⋯ e dos materiais` (18/09/2026)

O botão se chama **Mais opções** e são seis grupos, nesta ordem:

| Grupo | Itens |
|---|---|
| **Editar** | Desfazer · Refazer. **Só em tela estreita**; em tela larga os dois são botões da barra |
| **O meu jogo** | Salvar · **Trazer o que eu enviei** · **Extensões** · Virar profissional |
| **Materiais** | **Imagens** · **Sons** · **Modelos 3D**, três portas para a mesma janela **Materiais do jogo**, cada uma na sua aba |
| **Mostrar** | Console · Terminal · IA |
| **Levar o jogo** | **Baixar o projeto** · Baixar o código · Baixar para publicar |
| **Estúdio** | **Mudar tema** · Meus projetos |

⚠️ **Não existe grupo Arquivo, Exibição, Conta nem Ajuda.** Eram os nomes antigos e aparecem em
material de três cursos.

⚠️ **"Exportar para o Estúdio" virou "Baixar o projeto"**, no grupo **Levar o jogo**. A linha de
apoio dele diz "um arquivo para abrir este mesmo projeto no Estúdio Completo". Os três "Baixar"
moram juntos de propósito, e cada um tem a sua linha de apoio.

⚠️ **Até 18/09/2026 o som e o modelo 3D moravam atrás da palavra "Imagens".** Fala que mande "abrir
Materiais, Imagens" para pegar um som está descrevendo a tela antiga.

## 6. A lista de projetos do Estúdio

Fonte: `packages/studio/src/core/i18n/pt-BR.ts`

O título grande da tela é **Meus Jogos**. Os botões de cima são **Importar** e **Novo projeto**. O
modal traz o campo **Nome do projeto** e os botões **Cancelar** e **Criar e abrir**. No menu ⋯, o
item que volta para cá se chama **Meus projetos**.

## 7. O Pinta

Fontes: `packages/pinta/src/core/copy.ts`, `components/gallery/NewAssetDialog.tsx`

A galeria se chama **Meus desenhos**, e o cartão da frente é **Criar novo**. O assistente tem
**quatro perguntas**, nesta ordem:

1. **Como você quer desenhar?** Pixel art ou Vetor
2. **O que você quer criar?** Personagem, Cenário de fundo, Peças do cenário ou mapa
3. **Qual o tamanho?**
4. **Qual o nome?** Minúsculas e traços, e o botão final é **Começar a desenhar**

O selo da barra é **Guardado na sua conta**. O desenho enviado ao Estúdio chega em **Meus desenhos**.

## 8. Onde as regras de coluna continuam valendo

Fontes: `packages/member-shell/src/lib/lesson-split.ts`, `docs/plans/2026-09-19-aula-imersiva-design.md`

O desenho imersivo de 19/09/2026 diz, com todas as letras, que **nenhum bloco, cópia, cena, áudio ou
regra de conclusão muda**, e que a seção de dois lados continua usando a área inteira com a divisória
e as regras atuais. A regra das duas colunas do `ESPEC-MANIFESTO.md` segue valendo sem emenda.

O que mudou em volta: a aula ganhou um rodapé fixo com **Anterior**, **Preciso de ajuda** e **Próxima
seção**, e na última seção o avanço dá lugar à ação de concluir. Título da aula, título da seção e
índice saíram do corpo. Fala que mande "rola até embaixo e clica em continuar" merece conferência.
