# Qualificar execução Python por HTTP no ambiente explícito

Este operador usa a API interna do Runtime já implantado. Abre inputs próprios,
transfere arquivos pequenos, solicita inspeção/validação e remove seus inputs e
preview. **Não é somente leitura:** executar o modo run exige autorização
operacional para essas mutações. Implementar/testar o operador não executa a prova
hospedada.

Não implanta Worker ou imagem, altera catálogo, busca credenciais, chama BFF,
abre navegador local ou publica jogos. Nenhum arquivo de projeto é fornecido pela
linha de comando: as três fontes QA limitadas estão no script.

## Preparar entradas e conferir os pinos

Use o checkout e o plano canônico da implantação real. O preflight recalcula o
plano com o verificador existente, incluindo seus artefatos locais; não constrói
nem baixa uma distribuição ausente. Informe todos os argumentos na forma
--nome=valor. Não existem destino padrão, retry ou fallback.

Na raiz do repositório, compile somente o operador QA com Bun 1.3.11 e execute
com Node 24.22.0. Este bundle não é artefato do runtime nem altera seu fingerprint.

~~~powershell
bun --no-env-file build packages/studio-runtime/scripts/qualify-python-execution.ts --target=node --format=esm --outfile=.cache/runtime-execution-operator-NOVO.mjs
node .cache/runtime-execution-operator-NOVO.mjs preflight --environment=staging --base-url=https://sistemazero-studio-runtime-staging.helena-bcc.workers.dev --plan=.cache/python-reference-games/staging-promotion-plan-001-r1.json --plan-sha256=43f7c218d08b00d4a91dd360ffaf53970316d9d3048dd307e59289fc72fd6725 --manifest-sha256=bc5710a137facb82e4f1a24df6e370406217f5fc4707c64861adf381d10d3e80 --distribution-sha256=476d32e78da6b528730b8b0535ad026f64fe4e61c03f20a195a7438bc56ace2c --parent-origin=https://community-kids-staging.up.railway.app --out=.cache/runtime-execution-preflight-NOVO
~~~

Os pinos acima identificam a implantação 476 do plano 43f7. Para outra implantação,
forneça seus próprios pinos externamente conferidos e seu plano correspondente;
não renomeie um hash esperado para aceitar bytes diferentes. A origem do serviço
deve corresponder ao ambiente: `staging` aceita exatamente o Worker acima e
`production` aceita somente `https://sistemazero-studio-runtime.helena-bcc.workers.dev`.
O plano também deve declarar o mesmo ambiente e origem; trocar somente a flag
ou usar o plano de staging para produção é recusado. A chamada programática
também confere o destino antes de qualquer HTTP. Não há herança de qualificação
entre ambientes. O parent deve constar na
configuração final do plano e ser distinto do Runtime. O arquivo do plano deve
ser regular, sem symlink e ter até 2 MB. O diretório pai da saída precisa existir;
a saída final precisa ser nova.

O modo preflight não lê token nem faz fetch. Sua saída é PREFLIGHT_ONLY, jamais
API_PASSED. Depois de conferir versão implantada, origem, namespace e admissão
operacional, o operador pode usar o mesmo comando trocando preflight por run e
escolhendo **outro diretório novo**.

A única credencial é STUDIO_PYTHON_RUNTIME_TOKEN herdada pelo processo.
Provisione-a em RAM com o procedimento operacional autorizado, sem argumento CLI,
echo, arquivo .env ou gravação do ambiente. Node não carrega .env implicitamente;
não acrescente --env-file ao comando. O runner não consulta Railway/Cloudflare
para descobrir credenciais.

## O que a prova observa

Os três casos são seriais, cada input conhecido é retirado antes do próximo:

1. Inspeção compila main.py e helper.py, cujas fontes válidas importam um helper e
   contêm raises inofensivos. Relatório aprovado mostra que esses imports/raises
   não rodaram nesse caso. Não é uma prova universal de isolamento.
2. Fonte com sintaxe inválida produz inspeção failed, diagnóstico e nenhuma fase
   execution no relatório de validação.
3. Turtle usa helper Python e PNG próprio, recebe stdin, Space e clique. Além dos
   contadores do serviço, o relatório deve conter os três marcadores exatos
   emitidos pelos respectivos callbacks. A captura precisa de frameSequence
   positivo. O preview retorna uma URL canônica vinculada ao projeto, revisão,
   manifesto e origem; o GET da captura verifica tipo MIME, orçamento real de
   bytes, IHDR, dimensões, tamanho e SHA pelo Core.

A receita, o relatório e os hashes de cada arquivo são confrontados com a revisão
calculada pelo Core. Metadados públicos da distribuição hospedada devem coincidir
com os pinos externos. Negativas baratas conferem token ausente, manifesto não
aprovado e owner diferente. Não há saturação de quota, teste de interrupção nativa
ou expansão de carga. cancellationQualified continua false; um aborto local não
é evidência de que uma operação remota ocupada foi interrompida.

## Prazos e limpeza

O prazo da fase HTTP inteira é de 300 segundos: até 240 de trabalho e até 60
reservados para cleanup final, sem exceder o teto total. As limpezas entre os
casos também consomem esse tempo. Cada chamada é limitada: até 90 s para inspeção
ou validação, 15 s para admissão/transfers/GET e 10 s por chamada de cleanup.
SIGINT/SIGTERM retiram a espera de trabalho e preservam o orçamento independente
para retirar os recursos próprios conhecidos.

Antes da primeira rede, um diretório exclusivo e receipt.json com RUNNING são
reservados. Um checkpoint precede cada requisição. Se a gravação falha, nenhum
novo POST de trabalho começa; cleanup de recursos já conhecidos ainda é tentado
e a falha permanece no resultado.

A referência completa fica apenas em RAM. Depois que uma resposta de admissão
válida e correlacionada chega, sua limpeza é obrigatória mesmo se o próximo
checkpoint falhar. Uma admissão sem resposta confiável marca
remoteOutcomeUnknown=true. Não há ID inventado, retry ou inferência de limpeza por
TTL. O operador deve investigar externamente esse caso.

Preview solicitado é retirado antes do input, inclusive se a resposta da validação
for perdida. Ambos os POSTs de remoção são aguardados; somente 200 com ok:true
conta como ACK. O input precisa responder 410 na inspeção posterior; preview com
URL previamente validada precisa responder 404. Sem URL conhecida, o recibo
distingue ACK de remoção do preview e ausência de prova GET de retirada.
Falhas de cleanup não impedem a tentativa do próximo recurso conhecido, não são
transformadas em sucesso e não são repetidas automaticamente. Erro primário e
falhas de cleanup são preservados juntos em memória, com fase/tipo sanitizados
no recibo. A CLI nunca imprime mensagens do provider nem exceções completas.

## Interpretar os artefatos

receipt.json contém apenas pinos, hashes, IDs QA públicos, etapas/status HTTP,
resultados filtrados e ACKs de limpeza. Não contém fonte, token, headers,
referência de input, binding contextual ou stdout/stderr integrais.
python-playtest.png é a captura própria limitada; o recibo registra seus
metadados e hash. Proteja a saída operacional e não publique logs de ambiente.

API_PASSED exige os três oráculos e limpeza lógica dos recursos conhecidos, sem
admissão desconhecida. Exit 0 significa somente preflight ou API aprovada.
RUNNING interrompido e FAILED nunca são aceite. Mesmo com API_PASSED:

- overallQualified, physicalCleanupVerified e cancellationQualified ficam false;
- hostedUI, contextualAuthorization, publicGameExecution e performance ficam false;
- esta prova não qualifica Mural/remix, autenticação real de aluno, editor,
  audibilidade de áudio ou jogos completos;
- a inspeção externa deve confrontar versão/namespace e ausência física de
  containers/pendências; ACK da API não substitui esse readback.

## Testes locais inertes

~~~text
bun --no-env-file test packages/studio-runtime/tests/python-execution-qualifier.test.ts
~~~

Os testes passam respostas sintéticas pela fronteira HTTP e pelos verificadores
reais do Core. Cobrem perda de admissão, checkpoint antes/depois de envio, hashes,
receita, callbacks, PNG, limite de stream, aborto e falhas de limpeza. Não executam
Python, Pyodide, navegador, Docker, servidor local ou serviço remoto; não são
recibo de qualificação hospedada.
