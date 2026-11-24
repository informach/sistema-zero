# Lote 1: reentrada de modelos e transporte de agentes

Esta é uma revisão do lote 1 ainda aberto. Nenhuma ferramenta dos lotes seguintes foi acrescentada nesta passada. A base conferida foi `staging`, `64f2d799c`, sem alterações externas pendentes.

## Reentrada

Foi reproduzida uma corrida no palco real: começar a carregar um modelo, retirá-lo do documento e recolocá-lo antes do primeiro carregamento terminar. A primeira leitura ainda podia assumir a entrada do mesmo hash ou marcá-la como falha. No caso de erro atrasado, a segunda leitura terminava sem conseguir apresentar o modelo.

O palco agora associa a conclusão à identidade da leitura que ainda ocupa a entrada. Resultados substituídos não alteram o estado atual nem exibem erros antigos; geometrias decodificadas por leituras substituídas continuam sendo descartadas. A referência por hash e a conferência de conteúdo foram preservadas.

O ensaio usa o `criarPalco` de produção, Chrome com WebGL e um GLB livre de um triângulo. Controla somente a entrega assíncrona dos bytes pelo contrato público do host; não substitui o renderer nem o decodificador. Verifica separadamente sucesso e falha atrasados. Antes da correção, ambos invadiam a reentrada; depois, ambos são ignorados e o modelo atual apresenta o volume esperado, sem erros. O encerramento repetido do palco também foi exercitado.

- [Antes](evidencias/lote1-reentrada/antes.json).
- [Depois](evidencias/lote1-reentrada/depois.json).
- Reprodução: `node packages/molda-cenarios/playground/oficina/verificar-reentrada.mjs <pasta>`, com o playground da oficina na porta 4541.
- Dez testes do motor, 34 asserções, e sua tipagem passaram após a correção.

## CLI e MCP

O plano exige que os clientes existentes continuem operando sobre a API nova desde o lote 1. Os comandos principais do pacote já apontam para `src/oficina/{cli,mcp}.ts`; as entradas antigas estão explicitamente nomeadas como piloto até a limpeza do lote 10.

Foi conferido no Railway o domínio do gateway de staging. O CLI e o MCP por `stdio` autenticaram a conta de equipe autorizada e consultaram os mesmos dois espaços e as mesmas 18 bibliotecas. O MCP publicou 11 ferramentas, incluindo o contrato de edição em lote. O ensaio remoto foi somente de leitura: não modificou os mundos da equipe. [Resultado](evidencias/lote1-agente/resultado.json).

O script `packages/molda-cenarios-agente/qa/staging.mjs` lê as credenciais do arquivo externo indicado pela usuária e as passa apenas ao ambiente dos subprocessos. Não imprime email, senha, tokens ou respostas completas, e recusa sessões herdadas que substituiriam o acesso indicado. Os oito testes do pacote de agentes passaram, com 40 asserções; incluem validação, renovação e MCP real por `stdio` no transporte local. Isso não constitui a entrega dos comandos de intenção, consultas e captura headless do lote 9.

## Conferência do escopo do lote 1

| Requisito do plano | Evidência e estado |
|---|---|
| Members, dados e autorização | DDL real em Postgres descartável; testes de serviço, HTTP e repositório. [Fundação](revisao-lote0.md), [integridade](revisao-integridade-importacao.md). |
| Gateway e BFF | Rotas e políticas testadas; leitura real pelo gateway nesta passada; envio básico nos dois apps já exercitado. |
| Motor genérico, chão plano, carregar e pôr | Palco Three separado do jogo; importação e colocação reais no Chrome e staging. |
| Mover, girar, tamanho e grade | Nos dois apps, X=2,5 m, giro=45°, escala=1,3 e grade conferidos após recarga. |
| Miniatura | Arquivo produzido e enviado no fluxo real de importação. |
| Quatro telas, Objetos básica e gaveta | Capturas versionadas nas telas e dimensões previstas, mais testes por toque emulado. |
| Rota nos dois apps e equipe | Conta autorizada no adulto e perfil temporário oficial da equipe no Kids. Sem abertura a membros. |
| Mouse, teclado e toque | Ensaios de edição e navegação; toque emulado em 390/1024. Sem alegação de aparelhos físicos. |
| CLI/MCP na API nova | Transporte local e leitura autenticada remota conferidos nesta passada. |
| Reentrada durante carregamento | Corrida reproduzida e corrigida; ensaio do palco real antes/depois acima. |
| Contrato novo completo no staging | **Pendente da implantação pelo CI e da passagem positiva com `CENARIOS_QA_EXIGIR_INTEGRIDADE=1` nos dois apps.** A prova isolada no R2 e o fluxo básico antigo não substituem essa verificação. |

As provas de [dois apps, R2 e toque](revisao-lote1-dois-apps.md) permanecem válidas nos limites registrados. O lote 1 só será fechado depois da implantação e da conferência do contrato novo. O lote 2 não foi retomado.
