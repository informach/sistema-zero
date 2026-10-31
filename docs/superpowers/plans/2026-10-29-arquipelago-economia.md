# Economia do Arquipélago: autoridade e recompensa inteira

L07 do programa integral. A carteira continua no Members. O jogo não importa serviços da
plataforma e não declara sozinho que ganhou moedas. Nenhuma validação escreve em ambiente remoto.

## Decisões e limites

- A decisão explícita da dona nesta conversa foi 100 moedas por semana. O repositório contém
  150, documentado em 27/10. Alinhar implementação e documentação a 100, sem retirar saldo ou
  alterar eventos passados. Quem já recebeu mais nesta semana apenas aguarda a semana seguinte.
- Segunda-feira à meia-noite de São Paulo inicia a semana. Estornos, compras e idempotência não
  reabrem o teto de ganhos. Kids e adultos seguem a mesma conta, separados por público e dono.
- Principal e extra de desafios já são pagamentos independentes. Cada um cabe no teto. Uma
  recompensa que excede o saldo semanal continua pendente e mantém sua chave ao tentar depois.
- Revisar também as entregas em itens: cesta e pagamento precisam caber inteiros antes de
  consumir pedido, marcar turno ou anunciar recebimento. Não truncar em 999 silenciosamente.
- Para turnos e pedidos remunerados em moedas, a conclusão precisa ter testemunho do serviço,
  com início, regra versionada e conclusão idempotente. Não confiar em um booleano ou no relógio
  enviado pelo cliente. Primeiro inventariar as recompensas atuais e os pontos de entrada;
  implementar contrato e repositório antes de ligar uma chamada à carteira.

## Profissões: decisão de implementação

Padaria, sorveteria e sucos rendem 5 moedas no primeiro turno de cada balcão por dia. Esse valor
baixo permite participar sem substituir os desafios e usa o mesmo teto de 100 de todo o jogo.
Não muda os ingredientes nem a amizade existentes. O serviço cria a sessão UUID, guarda o dia
de São Paulo e a versão do roteiro e recria os seis pedidos. Confere as seis bandejas, nunca
aceita do navegador o prêmio, o dia ou uma declaração de vitória. Não há cronômetro punitivo.
Isso confere as respostas do jogo, não pretende provar que uma pessoa não automatizou os cliques.

`0011_turnos_remunerados` acrescenta uma tabela, sem mudar dados anteriores. Índice único por
pessoa, público, balcão e dia impede duas reservas; crédito usa a própria sessão como chave.
Crédito confirmado não volta a pendente por uma resposta concorrente atrasada. O suporte é só
leitura; o serviço relê a jornada para exigir Vila Doce, com acesso da equipe preservado.

A confirmação ainda sem resposta fica numa pequena fila por perfil, público e balcão no
aparelho, antes de terminar o turno local. Reabrir um balcão retoma essa fila. Depois que o
serviço confirma a conclusão, a pendência de moeda fica no servidor. Ele tenta o pagamento
pendente mais antigo ao abrir outro turno e não insiste em um teto na mesma semana. Uma única
chamada à carteira por abertura evita encadear três timeouts de cinco segundos. Não há
nova versão de salvamento do jogo. O servidor do jogo continua separado da carteira do Members.

O começo do turno precisa de rede. Falha na confirmação conserva a entrega e mostra tentativa
manual. Resposta antiga de um painel fechado não troca o balcão atual. Ingredientes e a cesta
do Bento são indivisíveis: se não couberem, nada é consumido nem marcado como recebido.

## Sequência e provas

- [x] Teto de 100 no Members e referências ativas coerentes.
- [x] Postgres descartável: créditos concorrentes, repetição, conflito de chave, débito que não
      reabre teto, virada de semana de São Paulo, públicos e conta incorreta.
- [x] Recompensas pendentes dos desafios mantidas ao cruzar semanas.
- [x] Ingredientes dos turnos e cestas do Bento: capacidade inteira e sem repetição.
- [ ] Pagamento dos pedidos diários e compra de insumos, ainda não implementados.
- [x] Contrato e autoridade de pagamentos de profissão, rotas e integração HTTP/Postgres local.
- [x] UI de recebimento/pendência, saldo atualizado e testes de profissão nos dois públicos.
- [ ] Revisão final integrada do lote, incluindo as partes ainda abertas.

O arquivo acompanha a execução e não declara L07 concluído. Não fazer commit ou push isolado.

Provas locais até aqui: Members 4 testes/22 asserções; pendências de desafios 45/146;
profissões com Postgres e HTTP real 5/40. Banco descartável na porta 62751, nenhuma escrita
remota. Navegador local: quatro combinações de público/tela em r4, mais celular Kids r5 após corrigir a atualização do saldo do HUD. API, jogo e member-shell passaram na tipagem. Evidências e limites em `docs/qa/2026-10-29-profissoes/README.md`. A revisão final do lote depende das duas partes ainda não implementadas.
