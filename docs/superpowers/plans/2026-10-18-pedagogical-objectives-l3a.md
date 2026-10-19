# L3A — referências por parte e Testar agora

O checkpoint L2 foi aceito pelo root após rereview independente, qualificado somente no escopo declarado. Este lote altera apenas a leitura e o diagnóstico dos exemplos na autoria. A UI de criação/captura dos exemplos, a retirada do editor global, o lifetime do interpretador e a fila durável continuam no L3B; os testes nativos completos de autoria ficam no L3C. O branch intermediário ainda não está liberável.

## Comportamento

`resolveSectionObjectiveProjects` usa o reader e o resolvedor canônicos do Core, confere continuidade de ambiente e separa ausência de erro. Não lê um gabarito global como fallback: documento antigo exige conversão explícita. O componente memoriza a resolução por conteúdo/parte, para não copiar o registro inteiro a cada resultado de execução.

O relatório mostra projeto inicial, exemplo opcional de entrada da parte e uma solução possível da mesma parte. Todas as ideias de código continuam comparadas ao projeto inicial canônico; o checkpoint não muda a base da contribuição. Cada estado permanece explícito: cumprido, falta, ausência, espera, erro de executor e inconclusivo. Resultado omitido pelo executor é inconclusivo; IR atrasado não comprova estrutura nem semântica.

Um pré-requisito preparado é legítimo. Somente o agregado de todos os objetivos obrigatórios do projeto satisfeitos gera aviso, sem reprovar o inicial e sem alegar cumprimento de vídeo, quiz, entrega ou da parte inteira. Extras não tornam gabarito obrigatório. Uma solução presente que falha em obrigatório continua erro; IR da solução ainda sincronizando também bloqueia a autoria.

O teste captura parte, bloco, autor/contexto/revisão, objetivos e referências. Troca de contexto ou desmontagem aborta o transporte e invalida o resultado antes de qualquer atualização de estado; isso vale mesmo se o transporte resolver uma resposta atrasada. Os projetos e critérios da operação são copiados antes da fila de execução. Inicial, entrada e solução usam no máximo um request de execução em curso por vez, sem criar três jogos paralelos. Os limites do servidor e sua autoridade não foram alterados. Uma mudança real de revisão continua invalidando o contexto.

## Provas e correções durante o lote

RED original preservado em `l3a-red-1.log`; sua fixture de pré-requisito usava um bloco desconectado. A fixture foi conectada a `sz_frame_start`, respeitando a régua real. O segundo RED (`l3a-red-2.log`) reproduziu os seis defeitos esperados: 0/6, oito asserções, 461 ms. O pré-requisito foi efetivamente verdadeiro nesse segundo run, e a falha veio da reprovação indevida da autoria antiga.

Depois da mudança, os seis casos iniciais passaram. A primeira regressão ampla ficou 25/26 porque uma nova expectativa minha assumia que o baseline subtrai também os nós de IR gerados. O avaliador existente subtrai as ideias lidas do código, enquanto a IR tem sua própria leitura estrutural. Corrigiu-se a expectativa para esse contrato, sem alterar o avaliador. Uma prova específica com código escrito verificou o baseline canônico: função nova no inicial vazio passa mesmo se já existir no checkpoint; função herdada do inicial não passa como contribuição nova.

Último gate focado (`l3a-focused-4.log`): 35 aprovados, zero falhas, 144 asserções, 2,21 s, em seis arquivos. Inclui o formulário real em DOM, cancelamento por parte/revisão/objetivos/workspace/autor/bloco/desmontagem, ACK tardio ignorado, sequência dos três projetos, estados ausente/espera/erro/inconclusivo e regressão Python em subprocesso DOM isolado, sem carregar o interpretador para editar critérios. O subprocesso Python é contado pelo wrapper e não constitui execução real de Python/grading.

Biome conferiu os nove arquivos do recorte, com formatação/imports somente. Os testes ainda não qualificam navegador real, backend remoto ou desempenho do interpretador. Admin TSC e rereview independente deste lote permanecem pendentes. Não houve commit, merge, push, mudança de dependência/lock, coalescing ou relaxamento de autorização.

## Próxima etapa

Rereview L3A, remediar achados e executar Admin TSC na janela coordenada. L3B precisa fechar, antes de implementar coalescing, a durabilidade da última intenção e o tratamento de ACK incerto; não se pode descartar uma versão anterior antes de confirmar a substituta na recovery. A UI por parte deve usar workingcopy estável por papel/parte, snapshot imutável independente e revisão contextual verdadeira, sem atribuir autoridade a um campo `runtime` do arquivo. Depois virão provas nativas Admin e pilotos Cadê/Farol, com manifesto/roteiro/gerador sincronizados.

## Fechamento do checkpoint L3A

O rereview independente conferiu os 21 hashes do snapshot (dez fontes/documento e onze evidências), leu implementação e fixtures de DOM/contexto e não encontrou novo bloqueio concreto no recorte. Não executou gates. A checagem real do Admin foi executada depois, na janela coordenada: Node 24.22, compilador local e `tsc --noEmit`, exit 0 em 14,99 s, log sem diagnósticos. Nenhum código de produção mudou após o snapshot revisado; esta seção apenas atualiza o recibo. L3A está qualificado nesse escopo. L3B, Admin nativo e pilotos permanecem pendentes e o branch intermediário continua sem liberação.
