# Rollback publicado do gravador 6

O ciclo B → A → B foi executado com login em um frontend temporário no ambiente
Railway de staging, usando o backend e o R2 reais de staging. O serviço foi criado
somente nesse ambiente e removido ao final. Community e Kids conservaram os
deployments da outra sessão, ambos na fonte `0a881cf007d1`.

As fontes foram B `ab39a593bae1` e A `a8209d3ad6d6`, qualificadas pelos CIs completos
44901287656 e 44903058759. O upload partiu de worktree separado, com arquivos
rastreados limpos e árvore Git registrada. O filtro de transporte reproduziu o
Dockerignore publicado; nenhum arquivo funcional foi modificado para o ensaio.
Os diretórios de Pinta, contratos de criações, host, frontends e backend na
staging principal são idênticos à fonte B qualificada, conforme o índice.

## Resultado observado

1. B restaurou os seis documentos da homologação em IndexedDB independente,
   conservando todos os hashes nativos. Uma borracha real alterou a casa 5 da
   Vila; reserva em formato 6, PUT no R2 e confirmação retornaram 200. A revisão
   de nuvem avançou de 2 para 3.
2. A abriu o documento completo. Outra borracha real alterou a casa 6. A edição
   ficou na autoridade local, sem tentativa HTTP de modificar esse mapa e sem
   rebaixar a nuvem, que permaneceu em formato 6/revisão 3. Um realm novo leu a
   mesma edição local.
3. B foi restaurado e sincronizou automaticamente a edição feita em A. Reserva
   com base 3/formato 6, PUT e confirmação retornaram 200; revisão final 4.
   O documento nativo permaneceu exatamente igual ao que A havia conservado.
4. Outro contexto autenticado, sem o IndexedDB anterior, recuperou os mesmos
   seis documentos. O download real da Vila no R2 passou pelo parser público
   sem avisos e produziu o hash nativo
   `15c3393cbbc9861df0c80036e98130bcb5ebe545369a77347fb58cf149b6e296`.
5. Arquivos, IR e blocos armazenados do projeto JavaScript mantiveram seus
   hashes; o hash composto continuou `635ecbae5d37…`. O Estúdio não foi aberto
   para atualizar a cena durante este ensaio.

## Isolamento, falhas e limpeza

As duas tentativas anteriores nos frontends compartilhados abortaram com zero
deployments solicitados ao detectar publicações concorrentes. A primeira
tentativa de upload do serviço temporário recebeu 413 por incluir material
editorial grande. A consulta ao provedor não encontrou deployment; o transporte
seguinte utilizou o filtro suportado pelo CLI, com manifesto registrado.

O novo domínio exigiu login próprio. Depois do login, o ticket e o download no
servidor retornavam 200, mas o navegador falhava por CORS. Uma regra temporária,
restrita ao domínio exato do ensaio, foi acrescentada ao bucket `testes-ugc`.
As regras existentes foram preservadas. No encerramento, a configuração voltou
ao mesmo conteúdo anterior e a ausência do serviço em staging foi confirmada.
Sem alterações em produção, volumes ou publicações compartilhadas.

Os recibos 034–040 preservam esses diagnósticos. O campo chamado `bucket` na
sondagem 040 continha o prefixo de objeto `creations`; o bucket correto é o
`testes-ugc` do hostname e dos recibos Cloudflare. Credenciais, cookies e URLs
assinadas não foram arquivados. A captura de tela de autenticação não foi usada.

As referências consultadas foram as documentações oficiais de
[upload no Railway](https://docs.railway.com/cli/up) e
[CORS em URLs assinadas do R2](https://developers.cloudflare.com/r2/buckets/cors/).

## Alcance da homologação

Este relatório fecha o rollback publicado do gravador 6. As recusas de formatos
4/5, CAS e recuperação offline da aba antiga estão no relatório anterior
`../gravador6-autenticado-2026-11-21/`; a issue 026 conserva sua reprodução
histórica de cliente que perde campos desconhecidos.

O leitor A deste ciclo conhece o nativo 7 e declara escrita de nuvem 4. Não é
uma nova reprodução de leitura truncada de schema antigo. Os contextos separados
simulam armazenamentos independentes nesta única máquina. Não houve teste com
crianças ou outro aparelho físico.

O serviço temporário validou persistência e rollback. Não validou Python nesse
domínio, nova atualização/publicação do jogo ou o formato 8. Esses fluxos continuam
nas etapas seguintes; as provas de motores anteriores não se tornam provas do
documento final apenas por este resultado.
