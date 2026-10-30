# Visitas adultas consentidas, L12

## Implementação

Receber visita começa desligado. Uma pessoa adulta gera um código de 32 caracteres e o
compartilha por escolha própria. A API guarda somente o SHA-256, um por salvamento adulto.
Gerar outro invalida o anterior; desligar apaga o convite. A exclusão do save também o apaga.
Não existe diretório, busca de pessoas, prêmio, limite parental ou alteração do save V18.

O código só vai no corpo de pedidos autenticados. As consultas de estado não o devolvem.
Na tela, ele é conservado apenas até fechar; não vai para URL, save ou armazenamento do
navegador. Resposta perdida deixa a escolha desconhecida até reler. Fechar ou desmontar
invalida pedidos, inclusive quando o adaptador ignora abort.

A visita mostra somente a projeção de casa, horta, objetos completos e quarto. Não há nome
ou id do dono na resposta. Campos extras do quarto e dos seus itens são removidos antes de
compartilhar. O Members é consultado com audience adult, e a autorização é confirmada de novo
depois dessa leitura, para impedir devolver uma casa revogada durante a espera.

Enquanto a visita está aberta, o jogo consulta uma confirmação pequena a cada 15 segundos
visíveis e ao retomar, com prazo de 5 segundos. Recusa ou indisponibilidade devolve a pessoa à
própria casa. Não é revogação por push e não se promete apagar informação já vista.

## Provas

- As primeiras provas usaram `arquipelago_test_visitas_adultas_20261030_r1`. A numeração
  0015 ainda não commitada foi descartada depois que a medição entrou em staging com esse
  número. A migração final de visitas foi gerada como 0016, sem reescrever a 0015 recebida.
- HTTP real com identidade da borda: padrão desligado, save exigido, rotação, revogação,
  concorrência, cascade, sessão Kids, suporte somente de leitura, próprio código e projeção.
- Negativo causal preservado em log local: corpo de 2048 caracteres sem Content-Length
  devolvia 400. Depois da leitura limitada do stream, devolve 413.
- Provas de estado: fechar e desmontar durante pedidos, resposta perdida, confirmação que
  nunca responde, save intacto durante visita, retorno e ausência de caminho adulto no Kids.
- `r1`: interrompida pela proteção de conflito. A primeira versão do teste reiniciava a massa
  online no mesmo contexto que ainda tinha um rascunho local. A proteção foi mantida; o
  operador passou a usar contextos novos para os cenários independentes.
- `r2`: interrompida por um oráculo incorreto: exigia a cópia do serviço falso em localStorage
  antes de ocorrer a primeira gravação normal. O serviço já tinha a massa em memória. O
  operador passou a observar a gravação normal antes de começar a prova de save intacto.
- `r3`: computador 1280 × 800 e celular emulado 390 × 844 passaram em ativação, rotação,
  revogação, ocultar o código ao fechar, ausência do código em localStorage, visita sem
  mudar o save, retorno normal e retorno por revogação na retomada. O menu adulto não
  apareceu no Kids. Sem erro de página ou console. Essa rodada precede a conciliação do Farol;
  as novas provas da composição final serão registradas separadamente.
- `r4-integrado`: repetiu os dois tamanhos e o controle Kids depois de conciliar Farol,
  índice canônico, correções remotas e medição A06. Passou sem erro de página ou console.
  A chegada agora também usa o aviso existente quando o quarto não carrega. Navegador e
  servidor próprios foram encerrados ao terminar.

O mesmo comando de banco usado no CI foi executado em um Postgres 16 exclusivo desta prova,
com `TEST_DATABASE_URL` apontando para localhost, porta 53192, banco arquipelago_test.
Foram 56 testes aprovados, 37 ignorados e nenhuma falha; os oito novos de visitas e os cinco
de fantasmas foram executados. Os ignorados exigem bases/portas de outras integrações.
O contêiner de QA foi parado depois da prova. Um destino não local também foi recusado
antes da conexão. A variável específica de testes continua disponível para bases isoladas,
com fallback para a variável do CI. Não foi necessário editar o workflow.

Na conciliação seguinte, a medição A06 entrou com a migração 0015. A 0016 de visitas foi
gerada sobre esse snapshot. A validação final usa outro Postgres 16 novo, porta 64215,
com banco arquipelago_test e uma base separada para os seis casos da medição. A suíte
completa da API passou com 313 testes, 37 ignorados e zero falhas; inclui as duas migrações,
os convites, os fantasmas e os casos reais da medição. O contêiner também foi parado.

Uma rodada integrada do jogo excedeu 5 segundos em dois testes antigos de geometria, com
5,7 s e 5,3 s, sem falha de asserção. Foram preservados os resultados. Isolados, os 18 casos
dos dois arquivos passaram sem mudança em fontes, asserções ou prazo. A execução completa
seguinte foi serial, sem outra prova pesada desta sessão: 1.317 testes passaram em 90,61 s.
Os dois casos passaram em 1,3 s e 1,7 s. A causa aparente é contenção de recursos na rodada
concorrente, não uma alteração das geometrias, que não mudaram nesta entrega.

## Fechamento da composição

| Pacote | Testes aprovados | Ignorados | Tipagem e check |
| --- | ---: | ---: | --- |
| arquipelago-contracts | 203 | 0 | aprovados |
| arquipelago-api | 313 | 37 | aprovados |
| api-gateway | 315 | 2 | aprovados |
| arquipelago | 1317 | 0 | aprovados |
| member-shell | 2007 | 0 | aprovados |

As suites de gateway e member-shell não tiveram código alterado pela conciliação posterior.
A tipagem e o check do member-shell foram repetidos na composição final. Contratos e API
foram executados novamente sobre a migração 0016. O build final do jogo é `20261030123350`,
com 140 arquivos e 35,90 MB. O `bunx biome ci .` da raiz terminou com zero erros, 170 avisos
e 198 informações, já existentes fora deste lote. O check da API tem um aviso anterior de
optional chaining; o do member-shell tem cinco informações. Não foram desativadas regras.

Os dois ignorados do gateway exigem Redis real. Os 37 da API exigem outras bases/portas
específicas; não incluem as novas visitas, os fantasmas ou os seis casos da medição A06.
Os testes completos dos apps Next e a imagem Docker do Members não foram repetidos nesta
sessão. As correções remotas do smoke foram preservadas; não equivalem a uma nova prova da
imagem. O aceite hospedado e aparelhos físicos continuam em L14.

## Reproduzir

No pacote do jogo, depois de criar a pasta pai de saída:

```powershell
bun build playground/verificar-visitas-adultas-browser.ts --target=node --external playwright-core --outfile .cache/verificar-visitas-adultas-browser.mjs
$env:ARQUIPELAGO_PRINTS='CAMINHO_ABSOLUTO_PARA_TENTATIVA_INEDITA'
node .cache/verificar-visitas-adultas-browser.mjs
```

O verificador usa modelos e jogo reais, plataforma falsa local e SwiftShader. Não é uma
sessão hospedada autenticada nem prova de FPS em aparelho físico. `?publico=adulto&visita-adulta=1`
prepara a casa de exemplo; `visita-adulta=revogar` recusa a próxima confirmação. Esses códigos
de massa não são convites de pessoas reais. Não houve escrita remota nem implantação.
