# Contexto, cena e pergunta no palpite

**Decisão aprovada em 18/09/2026:** a criança deve receber o assunto antes de olhar a prévia,
mas a pergunta e as alternativas devem permanecer juntas depois dela. Quando a pergunta cita um
controle, a prévia deve mostrar uma representação estática desse controle, sem antecipar a
interação.

## Problema

O fluxo anterior misturava a explicação e a pergunta no mesmo balão, mostrava a prévia e só então
apresentava as escolhas. A distância fazia a pergunta perder contexto. Na cena de leitor de tela,
o texto citava “Ouvir a tela”, mas esse botão ficava escondido na prévia: a criança não via sobre o
que estava fazendo o palpite.

## Alternativas consideradas

1. **Mover as escolhas antes da prévia.** Aproxima pergunta e resposta, mas tira da criança a
   imagem que deveria ajudá-la a formular a hipótese.
2. **Duplicar a pergunta depois da prévia.** Mantém o apoio visual, mas repete texto e cria dúvida
   sobre qual pergunta responder.
3. **Separar contexto e pergunta, com a prévia no meio.** O contexto prepara o olhar; a prévia
   mostra o estado inicial; a pergunta e as alternativas ficam adjacentes. É a abordagem escolhida.

## Fluxo final

1. O primeiro balão do Zappy explica o assunto da experiência.
2. A prévia estática mostra o estado inicial da cena.
3. Se a cena declara um controle relevante para o palpite, a prévia inclui uma ficha visual, não
   interativa, com o nome do controle e o aviso de que ele será liberado depois do palpite.
4. O segundo balão do Zappy traz apenas a pergunta.
5. As escolhas ficam imediatamente abaixo desse segundo balão, agrupadas semanticamente pela
   pergunta.

## Contratos

- A prévia continua com `role="img"`, sem botão, campo, seletor ou ação de teclado acionável.
- O nome acessível da prévia descreve também a ficha visual quando ela existir.
- A ficha de controle é configurada no catálogo da cena, não inferida de texto editorial.
- As falas pré-geradas são divididas em duas chaves: contexto e pergunta com alternativas. Áudios
  já gerados para a fala única deixam de corresponder e usam a voz do navegador até serem gerados
  novamente no Admin.
- A primeira configuração é a cena `screen-reader`, com “Ouvir a tela”; cenas futuras só ganham a
  ficha quando a previsão realmente citar um controle concreto.

## Verificação

- Teste unitário do core para a configuração do controle na prévia.
- Teste do `member-shell` para ordem visual, agrupamento de pergunta e ausência de interação na
  ficha estática.
- Jornada de integração Kids para confirmar “Ouvir a tela” visível na prévia, ainda sem botão real,
  e disponível somente após o palpite.
- Testes das chaves de fala e do gerador de áudios do Zappy atualizados para as duas falas.
