# Experiências: layout pela largura do painel

Direção aprovada em 23/09/2026: aproveitar o espaço liberado pela divisória da aula, mantendo a opção **Ampliar experiência**.

## Comportamento

- Painel estreito: HUD e cena, depois instrução e controles.
- Painel largo: HUD e cena à esquerda; instrução e controles à direita. A largura relevante é a da experiência, não a da janela.
- A bancada longa rola na própria coluna. A cena continua visível enquanto a criança manipula os controles.
- Janela baixa ou zoom alto: preservar leitura e acesso ao conteúdo, sem comprimir fontes ou cortar controles para forçar duas colunas.
- A ampliação continua sendo um modo de concentração opcional, com retorno pelo botão ou Escape.
- Redimensionar, ampliar e voltar preservam a mesma experiência: seleção, montagem, contadores, descobertas e execução.

## Intenção visual

A criança de 8–13 anos alterna entre vídeo, nave e comandos para observar causa e efeito. O console deve continuar reconhecível durante o arrasto. Preservar a tipografia, os espaçamentos e o relevo atuais; não criar outro tema ou controle de layout. A cena estrelada, o HUD de jogo e as fichas de programação continuam sendo o centro da experiência.

## Implementação proposta

Consultar por CSS a largura do próprio workspace. O contêiner fica na seção que já se amplia, nunca em um ancestral que possa limitar seu posicionamento fixo. Os dois layouts usam os mesmos nós e as mesmas regras de colunas. A largura mínima considera uma bancada de 26rem e um palco legível. A altura do console inline é limitada pela janela; no ampliado, continua preenchendo a área útil.

Não mudar manifesto, avaliação, narração, progresso, persistência da divisória ou conteúdo pedagógico.

## Aceitação

Testar o arrasto e o teclado na divisória real, transições entre layouts, preservação de estado, palpite, janelas baixas, fichas longas e ampliação após redimensionar. Conferir visualmente capturas com o player e o CSS reais.
