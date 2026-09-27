# Rodapé da aula e menus laterais

## Contexto

A aula tem um rodapé fixo com Anterior, Preciso de ajuda e Próxima seção ou Concluir aula. O formulário de ajuda aparece acima dessa fileira, mas sem separação vertical. No desktop, o rodapé é fixado às duas bordas da janela mesmo quando o menu esquerdo ou a lista de aulas à direita está aberto.

## Decisão aprovada

- Deixar 16 px entre o formulário de ajuda aberto e os controles do rodapé, sem mudar a prévia do Admin.
- No desktop Kids, o rodapé começa no limite direito do menu esquerdo quando ele está aberto e termina no limite esquerdo da lista de aulas quando ela está aberta. Com os dois abertos, ocupa apenas o espaço entre eles.
- Na comunidade adulta, só a lista de aulas à direita afeta o rodapé. No celular, a lista continua como gaveta acima da página e o rodapé conserva a largura da viewport.
- O estado visível dos próprios menus dirige o recuo por seletores de layout. A largura do menu Kids e a largura da lista de aulas têm uma única medida reutilizada pelo painel e pelo rodapé. Nada mede elementos com JavaScript nem altera a identidade visual.
- O recuo deve acompanhar a transição do menu, respeitando preferência por movimento reduzido.

## Limite deste lote

O print da página do curso enviado em 19/09 foi inspecionado em resolução original (1920 × 991). Em `x=100`, as linhas `y=979` a `990`, inclusive a última linha, são todas `#121A30`, a cor do menu. A linha em `x=267` é a divisória **vertical** do menu (`#1B2540`); o conteúdo à direita começa em `x=268` (`#E9EEF6`). A faixa cinza horizontal no pé não aparece nesse estado. O navegador autenticado não estava disponível nesta sessão; a altura do menu não será alterada sem uma reprodução que mostre a faixa.

## Verificação

Testar a abertura e o fechamento independentes dos menus, o formulário com separação da fileira de botões, a preservação da prévia do Admin, e as larguras de celular/tablet/desktop. Rodar testes e typecheck dos pacotes alterados. A inspeção visual da faixa cinza depende do print do ambiente real.
