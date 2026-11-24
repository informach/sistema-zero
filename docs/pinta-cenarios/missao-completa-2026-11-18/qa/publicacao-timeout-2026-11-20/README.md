# Timeout da publicação: conexão real no teste

O conjunto integrado com `39fc593c3` travava no Bun 1.3.11 para Windows no caso
`a slow versions service does not hold the classic public game`. O dublê devolvia
uma promessa pendente, sem IO. `AbortSignal.timeout` usa um temporizador sem
referência: nesse ambiente, a promessa não mantinha o ciclo necessário ao disparo.

A correção usa um servidor HTTP local efêmero e o `fetch` real. O teste continua
exigindo resposta pública 200, em menos de oito segundos, com o mesmo timeout de
15 segundos. O servidor e o `fetch` global são restaurados em `finally`. Nenhum
comportamento do produto ou prazo foi alterado.

Evidências locais nesta máquina:

- Arquivo original completo: travou após 88 casos; execução limitada e encerrada.
- Controle com Bun 1.4.3: 92 aprovados, zero falhas.
- Caso do PNG original isolado: aprovado; a hipótese inicial sobre ele foi refutada.
- Instrumentações temporárias: fontes restauradas exatamente, conforme recibos.
- Com conexão HTTP real, Bun 1.3.11: 92 aprovados, 661 asserções, 5,31 segundos.
- Publicação Python/clássica e autoridade local juntas: 119 aprovados,
  894 asserções, 5,84 segundos.

O log da CI anterior registra separadamente o erro de tipagem no teste de QA
`molda-cenarios-agente/tests/trazer-e-exportar.test.ts`. A resolução já publicada
em `39fc593c3` é preservada na integração; esse log não qualifica a fonte nova.

Os arquivos e hashes estão em `index.json`. Estes são testes locais HTTP/unitários,
sem autenticação em staging. Não substituem a homologação do jogo publicado.
