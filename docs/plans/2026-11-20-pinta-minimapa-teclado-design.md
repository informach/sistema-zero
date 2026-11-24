# Navegação pelo minimapa existente

O minimapa já mostra o mapa, seu orçamento e a janela visível, com navegação
por clique/toque. A auditoria encontrou uma lacuna: não há ações de setas e a
ativação de um botão pelo teclado usa coordenadas de clique iguais a zero,
saltando indevidamente para o canto. Reutilizar integralmente esse painel,
seus estilos, cores, cache, controle `jumpTo` e indicador de viewport.

Alternativas: adaptar o botão existente (recomendado); acrescentar outro
controle de navegação (duplicaria função); criar um novo minimapa (descartado,
porque o componente já existe e tem testes de cor, orçamento e rolagem).

Setas movem meia janela visível; PageUp/Down movem uma janela vertical;
Home/End levam aos extremos. Enter/Espaço conservam o centro atual, sem
inventar coordenadas do ponteiro. Ler a geometria real do palco a cada ação
para não perder teclas repetidas antes do próximo render. Sem palco, usar o
centro do mapa. Limitar o destino às células existentes. Consumir somente as
teclas de navegação tratadas e oferecer instrução curta para leitor de tela.

Não alterar o documento, armazenamento, histórico, seleção, ferramentas de
pintura ou identidade visual. Não presumir que isso implementa streaming ou
projeções. Validar o problema antes da correção, repetir testes unitários e
nativos com foco, teclado, clique/toque e viewport, preservando os casos
existentes. Executar diretamente, conforme autorização do usuário para
continuar sem aprovação entre etapas, sem delegação.
