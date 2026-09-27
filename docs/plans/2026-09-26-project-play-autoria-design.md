# Autoria de Jogo pronto para jogar

Desenho aprovado pela autora: manifesto e cadastro manual devem oferecer as mesmas configurações. Toda apresentação de curso poderá usar o mesmo bloco, sem programar uma experiência nova para cada jogo.

## Comportamento

- Terceira opção do tipo de atividade: Jogo pronto para jogar. Título, orientação e pistas continuam no formulário existente.
- Carregar um arquivo de projeto do Estúdio, verificar o arquivo antes de substituir o atual e editar uma cópia no Estúdio incorporado do admin. Aplicar ou cancelar essa edição explicitamente. Não depender do Mural nem alterar o projeto inicial da criança.
- Usar a prévia real da atividade para testar. A criança recebe somente o jogo, ampliar/voltar e jogar de novo; não recebe botões extras de jogabilidade.
- Novos blocos usam conclusão por participação: interação real de teclado ou toque/clique dentro do jogo. Carregamento, foco, movimento do mouse e controles externos não contam. Não exigir vitória ou tempo mínimo artificial. Assistir ao vídeo continua sendo um critério separado da seção.
- Conclusão por alvos permanece disponível para jogos Jogo 2D com evento de clique/toque em grupo. O admin permite editar todos os IDs, nomes e retângulos dos alvos e as dimensões lógicas do palco. Não é um detector genérico de vitória: a interface explica o requisito do evento de grupo.
- Manifestos antigos sem `completion` conservam a avaliação por alvos, inclusive o Cadê Todo Mundo?. Nada de mudar a conclusão de aulas existentes silenciosamente.
- `completion: 'participation' | 'targets'` é opcional por compatibilidade. Novos blocos sempre o escrevem. A participação serve aos projetos clássicos do Estúdio, inclusive Jogo 3D, sem exigir a extensão Jogo 2D. Projetos Pro, que precisam de compilação própria, não são aceitos por este jogador.
- O limite atual de 1.500.000 caracteres do snapshot continua explícito e igual nos dois caminhos. Arquivo inválido, grande demais ou de formato não suportado não apaga o projeto anterior.

## Interface e arquitetura

Autora: professora preparando a apresentação de uma aula, sem editar JSON. A interface deve parecer parte do editor atual. Usar os tokens de fundo, texto, borda, primária, erro e sucesso já existentes, tipografia herdada, cartões discretos e espaçamento de 4px. A assinatura é a alternância entre editar a cópia no Estúdio e ensaiar o jogo que a criança realmente verá.

Reutilizar `LearningBuilder`, `StudioEmbed` carregado somente ao abrir a edição, o player real e a prévia de aula. Separar os campos do jogo em `ProjectPlayEditor`, a validação de arquivo em uma função testável e a avaliação da conclusão no core. Preservar a memória de tipo do editor ao trocar entre cena, HTML e jogo.

## Validação

Testar criação manual, troca de tipo sem perda, arquivo válido/inválido, edição aplicada/cancelada, alvos, critérios, rascunho/publicação, projeção pública, participação real versus eventos sintéticos, reinício e compatibilidade. Conferir o formulário e a prévia em navegador. Sem push nem deploy.
