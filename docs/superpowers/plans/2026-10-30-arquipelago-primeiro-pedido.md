# Primeiro pedido da ilha central

Complemento de L02/L03 autorizado pelo programa integral. A proposta coloca a
primeira geladeira no pedido da própria ilha; o código só a concede numa entrega
à Capi no Bosque. O começo deve funcionar antes de abrir outra ilha e sem exigir
um curso que ainda não foi publicado.

## Decisões

- O pedido do Zappy é plantar, regar e colher um alimento na própria horta. Usa
  os canteiros, sementes iniciais, crescimento e interação que já existem. Não
  introduz arte, cronômetro punitivo, moeda nem uma avaliação falsa do Estúdio.
- A primeira colheita manual bem-sucedida entrega o projeto azul da geladeira.
  A colheita inteira e a semente devolvida precisam caber antes de conceder algo.
  Uma tentativa sem espaço ou antes de amadurecer não conclui o pedido.
- A posse do projeto azul já representa a conclusão. Não criar versão de save,
  marca duplicada nem inventar progresso histórico. Quem já tem a geladeira
  conserva a posse e não repete o tutorial. A entrega à Capi continua válida.
- A instrução fica no Diário e tem prioridade no Agora após abrir a porta e
  atender necessidades baixas. Um passo concreto por vez; durante o crescimento
  avisa que é possível explorar e voltar. Não muda os três minutos da alface.
- Os Lumis continuam seguindo o mesmo intérprete e rendimento. Este primeiro
  pedido ensina a interação manual, sem alterar rotinas automatizadas existentes.
- A conquista libera a função; pintar/modelar depende das ferramentas conquistadas,
  comprar aparência usa o catálogo, como nos demais projetos. Não libera blocos.

## Execução

- [x] Regra pura de estágio do pedido e colheita com entrega indivisível.
- [x] HUD/Diário e fala de recompensa, sem painel duplicado.
- [x] Testes: sequência, imaturidade, capacidade, repetição, posse anterior e texto.
- [x] Navegador Kids/adulto: gesto real, guardar e reabrir; três minutos reais no Kids, data adiantada apenas no adulto. Evidências em `docs/qa/2026-10-30-primeiro-pedido/README.md`.
- [ ] Tipagem, lint, revisão e documentação. Sem commit/push intermediário.
