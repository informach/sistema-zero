# Alça do menu fora dos projetos abertos

## Decisão aprovada

Nas galerias do Estúdio, Pinta e Molda e na lista de planos do Pensa, a alça esquerda continua disponível. Com um projeto aberto para criação, a alça desaparece e o menu esquerdo fica recolhido. A seta da própria ferramenta permanece como saída para a galeria ou lista. Ao voltar, a alça reaparece e o menu recupera o estado anterior daquela visita. Aulas, avatar e quarto mantêm o comportamento atual.

Não usar transparência ou apenas `pointer-events: none`: a alça invisível ainda ocupa a área dos controles, não pode ser descoberta por toque e deixa um controle de teclado sem representação visual. Também não reservar uma calha lateral no editor, pois o objetivo é preservar a área de criação.

## Contrato entre shell e ferramentas

O `FocusModeProvider` do Kids continua dono do estado do menu. Ele recebe um sinal de “projeto aberto” do app ativo. Enquanto esse sinal estiver ativo, `navCollapsed` fica verdadeiro e `navAvailable` fica falso, sem sobrescrever a escolha anterior `navOpen`. Quando o sinal termina, o estado anterior volta. O sinal é restrito à rota atual e limpo quando a ferramenta desmonta ou o perfil muda.

Estúdio comum informa seu próprio `view.name === 'editor'`. Pinta, Molda e Pensa expõem um callback opcional de mudança de tela para o host, sem importar o shell Kids para os pacotes reutilizáveis. O Estúdio Pro, cuja URL é exclusiva de projeto, é identificado diretamente pela rota. As galerias e os editores comuns compartilham URL, então a decisão não pode depender apenas de `pathname`.

## Estados e validação

- Abrir projeto a partir da galeria: recolher o menu e retirar a alça sem cobrir a ferramenta.
- Voltar à galeria: restaurar a alça e o estado prévio do menu, inclusive se estava aberto.
- Abrir projeto por deep link: entrar sem alça quando o editor estiver pronto; telas de erro e carregamento não fingem ser editor.
- Trocar rota, perfil ou desmontar a ferramenta: não deixar o sinal do editor vazar para outra tela.
- Confirmar que os controles de voltar de cada ferramenta continuam alcançáveis por teclado e toque.

Testes cobrem o estado do shell, transições galeria/editor nos quatro apps, Estúdio Pro e a preservação das aulas, avatar e quarto.
