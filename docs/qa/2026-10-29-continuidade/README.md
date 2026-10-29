# Continuidade do Arquipélago, lote L01

Base de implementação: `21151df56`, com a correção independente de CI `9436b6bc4`.
Data: 29/10/2026. Apenas playground e Postgres local descartável. Nenhuma escrita remota.

## O que muda

- Salvamento V16: constelações, recordes das duas corridas das Nuvens, página e conclusão do
  Farol e escolha do clima.
- Migração até V14 preserva aparências de até 80 caracteres, sem o filtro destrutivo histórico
  da V15. O migrador histórico e os schemas antigos continuam preservados.
- Álbum, resultado, diário, Íris, clima e luneta leem o mesmo salvamento. Animações e câmera
  continuam transitórias. Nenhum novo campo é gravado a cada quadro.
- Descobertas e estrelas concorrentes usam união; melhor tempo usa mínimo. Clima independente
  da mochila pode ser conciliado; duas escolhas de clima diferentes exigem resolução.
- O editor Lumi aceita referências antigas na geladeira sem mudar os campos da ferramenta V1.

## Provas registradas

| Prova | Resultado |
|---|---|
| Contratos completos | 143 aprovados, 2.034 asserções |
| API com Postgres local e variáveis de medição/minijogos | 292 aprovados, 1.046 asserções, sem falhas |
| Jogo completo, serial | 1.052 aprovados, 1 ignorado, 131.870 asserções, sem falhas |
| Teste de fila de tempo antes ignorado, executado separadamente com PostgreSQL local | 1 aprovado, 3 asserções; 1.053 testes distintos do jogo aprovados ao todo |
| Typecheck com heap de 8 GB | Contratos, API e jogo aprovados |
| Biome dos arquivos TypeScript alterados e novos | 46 arquivos aprovados, sem correções pendentes |
| HTTP V14 → V16 e reabertura | Referência Unicode de 80 caracteres preservada, conquistas reabertas, revisão antiga recusada |
| HTTP acima de 64 KB | 413 e versão anterior intacta |
| Farol no Chrome, computador e celular emulado | Página, pausa, seis fachos, Íris, descarte, erro de carga, reentrada e reabertura aprovados |
| Porta antes da Lenda | Não revela o final |
| Leitura do Farol interrompida, computador e celular emulado | Sair na segunda fala e reabrir mantém página e conclusão falsas |
| Nuvens, computador e celular emulado | Saltos, queda/retorno, início e interrupção do balão, constelação encontrada pela luneta e reabertura aprovados |
| Álbum após reabrir, computador e celular emulado | Nome do percurso, melhor tempo e estrela de chegada visíveis na interface |
| Clima, computador e celular emulado | Chuva rega, nublado troca o céu, regar com sede adianta o crescimento e Nublado continua selecionado ao reabrir |

A prova do Farol usa o transporte de QA para chegar à porta e à Íris. A caminhada da entrada
até a mesa, a leitura, os botões e a sequência são do jogo real. Não demonstra que todo o mapa
foi atravessado com controles físicos. Usa SwiftShader, portanto não mede desempenho de GPU.

Prints aprovados em `farol-r3/`, incluindo `reaberto-computador.png` e `reaberto-celular.png`.
Os JSON `medidas-*` registram antes/depois e geometrias, sem credenciais ou perfis reais.
As provas complementares estão em `farol-interrompido/`, `nuvens/` (computador), `nuvens-r4/`
(celular) e `clima/`. Nas Nuvens, os saltos usam transporte de QA entre plataformas;
os pulos físicos completos não são revalidados neste lote. O balão passa pelas duas primeiras
argolas e para; não é uma volta completa. A luneta usa os eixos do controle e a busca real,
sem inserir a descoberta no salvamento. `nuvens-album/` registra o recorde e a estrela na UI.
A fila HTTP de tempo foi ignorada na suíte sem `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL` e depois
executada sozinha com esse endereço local: aprovada, sem omissão restante nesse conjunto.

## Negativos preservados

- Teste causal inicial da migração: 1 aprovado e 3 falhas antes da V16.
- Farol r1: reabertura funcionou, mas o novo ponto de medição mudou a referência da comparação
  de geometrias. A reabertura foi separada da comparação já existente.
- Farol r2: o novo passo de reabertura deixou o avatar junto à Íris antes de um teste que
  esperava a porta. A ordem do roteiro de teste foi corrigida. Produto não foi alterado para
  contornar os dois negativos. R3 passou inteiro.
- Uma suíte do jogo concorrente com SwiftShader excedeu 5 s na busca de grade dos telhados.
  A conferência serial, sem browser disputando CPU, é registrada separadamente. O limite e
  a regra do teste não foram afrouxados.
- Nuvens móvel r1/r2: o verificador confundia o retrato periódico anterior à queda com a volta
  concluída. O registro r3 quadro a quadro mostrou o novo transporte sendo substituído pelo
  retorno ainda pendente. R4 observa primeiro a posição física, espera uma nova medição e só
  continua quando o cronômetro volta a avançar. Não mudou a física nem a regra da corrida.

## Reprodução local

No pacote `packages/arquipelago`, compilar o verificador desejado com
`bun build playground/<verificador>.ts --target=node --external playwright-core --outfile .cache/verificador.mjs`
e executar `node .cache/verificador.mjs`. Definir `ARQUIPELAGO_PRINTS` com um diretório novo;
`ARQUIPELAGO_CHROMIUM` pode escolher o executável em vez do Chrome instalado. Os três scripts
usam SwiftShader, portas locais temporárias e encerram o navegador e o servidor próprios.

- `verificar-final-farol-browser.ts`: fluxo completo. `ARQUIPELAGO_INTERROMPER=1` executa
  separadamente o negativo de interrupção nas duas telas.
- `verificar-nuvens-aventura-browser.ts`: aventura. `ARQUIPELAGO_TELA=celular` seleciona uma
  tela e `ARQUIPELAGO_PARTE=salvamento` confere somente saltos, reabertura e Álbum.
- `verificar-clima-browser.ts`: horta, três escolhas e reabertura nas duas telas.

Os testes da API usaram somente PostgreSQL 16 local em `127.0.0.1:55487/arquipelago_test`,
com as três variáveis `TEST_DATABASE_URL`, `ARQUIPELAGO_MEDICAO_TEST_DATABASE_URL` e
`ARQUIPELAGO_MINIJOGOS_TEST_DATABASE_URL` apontando para esse banco descartável. O contêiner
foi removido ao terminar. Nenhum `.env` foi alterado.
O complemento de tempo recriou um PostgreSQL descartável nesse endereço, executou
`bun test --cwd packages/arquipelago tests/tempo-api.integration.test.ts` e removeu o contêiner.

Na implantação, atualizar API e consumidores do contrato na mesma onda. Clientes antigos
não conhecem V16; a preservação dos schemas históricos significa leitura de dados antigos,
não suporte de um cliente antigo ao formato futuro. O teste HTTP confirma que uma revisão
atrasada é recusada sem desfazer a conquista atual.

## Limites e fechamento

O teto continua 65.536 bytes UTF-8. A prova de capacidade usa IDs canônicos de até 40 caracteres;
referências antigas maiores são preservadas e submetidas ao teto global, sem truncamento.
Não é garantia de que toda combinação máxima possível de campos caiba, inclusive inventários
artificiais com milhares de chaves.

Revisão completa do diff realizada, incluindo migração, todos os consumidores, conciliação,
tetos, oráculos de teste, descarte e documentação. O registro de evidências fica em
`verificacao.json`. Browser emulado não substitui celular físico.
Este lote não conclui os demais 13 lotes da proposta nem comprova implantação em produção.
