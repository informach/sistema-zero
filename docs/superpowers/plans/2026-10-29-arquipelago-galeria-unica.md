# L04: propriedade única, aparências e ferramentas

## Decisão e fronteira

A carteira já pertence ao Members, mas a posse das aparências ainda pertence ao serviço do
jogo. A mudança deve levar a autoridade de posse ao Members, preservando as compras anteriores.
O jogo continua conhecendo somente contratos e a porta da plataforma. Nenhuma importação do
pacote do jogo entra no quarto ou no Members.

O quarto já tem fliperama, aquário e planta com modelos próprios. São três correspondências
funcionais a conferir visualmente. Não chamar modelos diferentes de um mesmo arquivo nem
inventar compatibilidade para os outros seis objetos. A posse pode ser única mesmo quando
uma aparência só tem representação no jogo; a UI deve informar os destinos disponíveis.

## Sequência

- [x] Contrato de identidade do item, destinos disponíveis e leitura de posse no Members.
- [x] Decidir e registrar o catálogo/preço canônico dos três equivalentes; não cobrar diferença
      nem retirar compra anterior. Os preços atuais divergem entre quarto e jogo.
- [x] Compra atômica de moeda e posse no Members, com a mesma chave de item nos dois destinos.
- [x] Adoção idempotente das compras anteriores, comprovada pelo registro de débito e pelo
      registro autorizado da compra da equipe, sem confiar no salvamento do navegador.
- [x] Refatorar serviço do jogo para ler posse canônica; tabela antiga serve apenas à adoção e
      à trilha histórica, sem uma segunda autoridade concorrente.
- [ ] Aparências do Pinta/Molda/Estúdio retornam à criação e ao objeto correto, com posse,
      cancelamento, reabertura e ausência de permissão conferidos.
- [x] Testes de compra concorrente nos dois destinos, resposta perdida, adoção sem cobrança,
      separação de perfil/público, suporte e destinos não compatíveis.
- [ ] Conferência visual nos dois públicos e revisão final.

## Limites da migração

Não reescrever IDs de aparências já salvos. Não alterar o formato histórico dos saves.
Não importar modelo do jogo no pacote da plataforma. Não duplicar GLBs para simular uma
integração. Testar migração somente em Postgres local descartável; implantação não está incluída
na prova local. Uma pendência de arte deve citar exatamente objeto, destino e dimensões necessárias.

A implementação local está em revisão. As caixas marcadas descrevem código e provas locais, não migração de ambientes nem implantação.

## Decisões de implementação, 30/10

A identidade compartilhada conserva `fliperama`, `aquario` e `planta` do inventário
do quarto. As seis aparências sem modelo no quarto usam o prefixo `arquipelago:`
no mesmo inventário, mas não entram no catálogo renderizável do quarto. Os IDs
de aparência dos salvamentos continuam intocados. Os preços únicos são os menores
já praticados: 70, 70 e 30 moedas nos três equivalentes. Não há cobrança de diferença
nem remoção de posse antiga. A representação visual pode ser distinta em cada destino.

A compra usa a trava da carteira, a chave canônica `room-buy:<perfil>:<item>` e
entrega o inventário na mesma transação do débito. O token de leitura não pode
comprar: a escrita interna usa somente o token já destinado às moedas. A leitura
e o salvamento consultam o inventário canônico por perfil e público.

A adoção precisa anteceder a ativação da nova autoridade, com as compras antigas já interrompidas e drenadas nos dois destinos: registros antigos pagos e pendentes
com débito confirmado são confrontados com o livro do Members, sem usar o save
como prova de pagamento. Compras antigas de equipe com valor zero exigem o registro
pago confiável do serviço e identidade resolvida. Linhas sem identidade ou sem
comprovação ficam como impedimentos explícitos, nunca como compra nova. A migração
é idempotente, não movimenta saldo e deve ser testada somente em banco descartável
local nesta entrega. O procedimento de implantação deve impedir novas compras na
versão antiga durante a conferência final e o corte, sem regravar salvamentos.


## Conferência local, 30/10

- Os testes com Postgres descartável cobrem compra simultânea pelo quarto e pelo jogo,
  resposta perdida, compra preexistente, adoção paga/pendente/equipe, identidade e
  reutilização indevida da chave histórica. A adoção não muda saldo nem XP.
- O executor operacional confere SHA e formato antes de abrir o banco. A execução
  real nos ambientes continua pendente e exige o procedimento de
  `docs/operations/arquipelago-galeria-unica.md`.
- O Members passa a incluir os contratos na imagem e o operador de adoção entre os
  scripts de operação. O jogo não entra na imagem do Members. O build da imagem
  continua no aceite integrado, sem inferir sucesso pela revisão do Dockerfile.
- Navegador: Kids 1280x720 e adulto 390x844, planta comprada por 30, cancelamento
  sem débito, saldo 50, aplicação e reabertura sem cobrança repetida. Serviço local
  simulado, sem login real. Prints e negativos preservados em
  `docs/qa/2026-10-30-galeria-unica/`.
- As portas de Pinta/Molda/Estúdio existentes foram revisadas: a aparência usa o
  documento autorizado e o molde do objeto; o Estúdio entra no fliperama pelo
  Mural ou por um desafio aprovado, não como textura de móvel. Nove testes de
  autorização/molde e oito testes externos de gravação/retorno passaram. O wrapper
  de diálogo contém oito casos próprios, não contados novamente nesse total.
- Falta a prova integrada de autoria e dos dois destinos com conta real, além da
  revisão da composição final. Não marcar L04 como integralmente homologado.
