# Ancestrais de recuperação e metadados legados

## Reproduções

Uma revisão editada a partir de um rascunho preservado declara os tokens dos
ancestrais que substitui. O replay confirmava a filha, mas depois reaplicava o
espelho síncrono do ancestral como uma cópia recuperada desnecessária. O teste
vermelho retornou o projeto atual e uma cópia `recuperado-journal-project-*`.
Outro teste reproduziu o mesmo problema após salvar a filha normalmente.

Sete testes de metadados também falharam antes da correção: a validação legada
e o particionamento descartavam campos raiz desconhecidos. Isso impede reconhecer
um ancestral como substituído com segurança, pois o documento derivado poderia
ter perdido parte do conteúdo.

## Implementação

A identidade de consumo inclui chave de projeto/escritor e token. A confirmação
de uma filha completa reconhece somente os ancestrais exatos que ela declara.
Ancestrais nativos aguardam uma filha que ainda existe apenas no espelho síncrono;
assim não são promovidos antes dela. A limpeza depois de um salvamento confirmado
usa a mesma prova. Escritores independentes não são reconhecidos só porque
reutilizaram um token. Um descendente com blocos incompletos mantém os journals
e espelhos originais de seus ancestrais.

O particionamento guarda metadados raiz desconhecidos e a validação de documentos
legados os conserva antes de salvar. O helper valida somente esses metadados,
sem copiar novamente arquivos, blocos ou materiais grandes. Getters são recusados
sem execução; símbolos de revisão local não entram no documento. As projeções
conhecidas e o marcador local continuam canônicos.

Documentos de formato 3 continuam sujeitos ao schema estrito. Os testes de
particionamento estrutural JS/Python não autorizam campos novos nesse formato;
um documento incompatível continua preservado e explicitamente recusado.

## Evidências

Os testes da revisão filha cobrem confirmação nativa, espelho sem journal nativo
e salvamento já confirmado. Também verificam escritor independente com token
repetido e preservação de ancestrais quando os blocos estão incompletos.
Seleção local: 27 testes, 125 asserções, zero falhas. A regressão completa,
typecheck e homologação no editor são registrados após seus resultados.

Bundle inicial: 367.285 bytes brutos, **119.494 gzip**, dois arquivos. A guarda
passou em 18,90 s com 35 asserções, mantendo o teto de 120.000 e o prazo de 60 s.

## CI anterior

O run [44453735121](https://github.com/informach/sistema-zero/actions/runs/44453735121)
terminou aprovado nos 12 grupos para o commit `5b954982d`: contratos Linux e
Windows, três shards Chromium Linux, Chromium Windows, Firefox, WebKit, Python,
isolamento, executor hospedado e auditoria do runtime. Esse resultado não qualifica
automaticamente os commits posteriores nem conclui a missão global.

Regressão completa nesta branch: **455 testes, 2.433 asserções, 71 arquivos,
zero falhas**, 43,68 s, incluindo Chromium/WebKit nativos com aborto de saída.
Os três caminhos de revisão filha também passaram exigindo o metadado desconhecido
no documento final, antes de reconhecer o ancestral. A seleção de recuperação
permanece com 20 testes/82 asserções aprovados após essa exigência.

Typecheck completo aprovado após corrigir a fixture para construir uma nova
lista de tuplas, respeitando o contrato readonly. Os seis fluxos de saída do
editor passaram em Chromium/WebKit numa execução limitada globalmente a 180 s,
com traces, sem retries: **1,3 min**, saída 0 e fechamento normal dos navegadores
registrado por `DEBUG=pw:browser`. Os limites de cada teste permaneceram iguais.

A primeira execução concluiu as seis verificações, mas o worker WebKit ficou no
encerramento; foi necessário terminar somente esse worker identificado. Embora
o runner tenha depois escrito `6 passed`, essa execução é registrada como
encerramento com intervenção e não como qualificação automática. A repetição
acima encerrou sem intervenção. A causa geral dessa intermitência do teardown
não é declarada resolvida por uma única repetição.
