# Alças dos menus laterais — desenho aprovado

## Objetivo

Trocar os botões de mostrar/esconder que hoje ficam em cabeçalhos por uma alça visualmente ligada à borda do próprio painel. A alça esquerda usa as cores do menu esquerdo; a direita usa as cores do painel de aulas. Com o painel aberto ela fica junto à sua borda externa. Com ele fechado, permanece na borda correspondente da tela. O conteúdo, os estados iniciais e as regras de abertura dos painéis não mudam.

## Alcance

- Comunidade Kids: menu esquerdo nas aulas, Estúdio, Pensa, Pinta, Molda, avatar e quarto, quando a rota oferece modo foco; lista de aulas à direita nas aulas.
- Comunidade adulta: lista de aulas à direita nas aulas. O app adulto não tem menu esquerdo.
- As versões autônomas das ferramentas e seus playgrounds não pertencem ao shell Kids e conservam seus controles próprios.
- No celular, não se cria um menu esquerdo que não existe. A alça da lista de aulas continua disponível, com a gaveta e o botão interno de fechar existentes.

## Comportamento e aparência

O painel esquerdo já é `sticky` e ocupa a altura da tela; os painéis direitos das aulas são `fixed`. Portanto a alça acompanha a borda estável desses painéis, sem estado nem lógica de rolagem próprios. A animação da alça dura os mesmos 300 ms da lateral, respeitando `prefers-reduced-motion`. A borda interna é reta; só os dois cantos externos são arredondados. O botão tem 44 px de altura e pelo menos 32 px de largura visível. Ícone e texto acessível indicam a ação, não apenas o estado. O foco por teclado fica desenhado dentro do botão para não ser cortado pela borda da tela.

No Kids, o lado esquerdo lê `--menu` e `--menu-texto`, sem duplicar hexadecimais de paleta; o lado direito lê `--card` e `--foreground`. No Adulto, o lado direito usa os tokens equivalentes do seu tema. A alça direita tem uma separação sutil da página clara por borda/sombra, mantendo a superfície branca do painel. A posição vertical é perto do início da navegação, como na imagem enviada, e permanece visível durante a rolagem do conteúdo central.

## Arquitetura

Um componente visual compartilhado, sem estado próprio, recebe `side`, `open`, `label`, `onToggle`, `controlsId`, largura do painel e classes de cor. Ele mantém um único contrato de acessibilidade e de movimento. O `FocusModeProvider` continua dono dos estados Kids. O shell `(app)` Kids monta a alça esquerda onde `navAvailable` for verdadeiro e a direita onde `outlineAvailable` for verdadeiro. O player adulto monta a mesma alça visual com seu estado local da lista de aulas. Os botões antigos saem das barras da aula, do avatar, do quarto e do contrato `hostChrome.menu` fornecido às ferramentas embarcadas; os demais controles das barras permanecem.

A alça fica como irmã do painel, não dentro de um elemento que ganha largura zero ou `translate-x-full` ao fechar. Assim ela nunca desaparece junto com o painel. As posições aberta/fechada usam a mesma largura CSS que o painel, evitando um vão durante a animação. A alça não altera a largura do conteúdo central e não introduz uma calha permanente nas ferramentas de borda a borda.

## Acessibilidade e verificação

O botão permanece no fluxo de Tab, anuncia “Mostrar menu”/“Esconder menu” ou “Mostrar lista de aulas”/“Esconder lista de aulas”, liga-se ao painel com `aria-controls` e expõe o estado com `aria-pressed`, preservando a semântica já testada. Painéis fechados continuam `inert` e `aria-hidden`. Não usar `title` duplicado. Testar ambos os estados, os dois lados, teclado, celular e largura de tablet, `prefers-reduced-motion`, ausência de botões duplicados nas quatro ferramentas, avatar e quarto, e ausência de obstrução dos controles do Estúdio/Blockly, Pinta e Molda. Rodar testes, typecheck e builds de Kids e Adulto antes de integrar em staging.

## Implantação

Implementar em branch/worktree isolado porque outra sessão edita arquivos de aula e ferramentas no worktree principal. Revisar e integrar os commits dessa sessão antes do merge. Não interromper o CI/deploy de materiais que já está em andamento. Depois, revisar, mesclar em `staging`, subir e conferir os serviços Kids e Adulto afetados.
