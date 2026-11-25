# LG04 — Pinta, Estúdio, conta e Mural

Em qualificação em homologação. Produção ainda não recebeu esta entrega. O [plano de execução](../plans/2026-11-24-lg04-pinta-estudio-conta-mural.md) contém o percurso e os critérios de aceite.

## Aceite hospedado de 25/11 e correção adicional

A candidata `5dab9c309` passou nos 13 jobs do CI, no plano Railway e na prova de dez mil blocos. A integração `f34107fa1` concluiu o CI e a implantação normal dos seis serviços afetados, preservando os conteúdos concorrentes de staging.

Na sessão infantil de homologação, a primeira abertura fria do Estúdio passou sem recuperação; o link de edição abriu automaticamente o mapa do Pinta vindo da conta. A atualização explícita do cenário conservou projeto, material, nome, arquivos e blocos. Outra sessão sem IndexedDB, biblioteca ou cache recuperou o PNG atualizado byte a byte e o mesmo IR autoral. Na reabertura, os identificadores gerados do Blockly não são byte-idênticos; essa comparação permanece separada da preservação autoral. O mapa nativo recuperou as três peças esperadas. “Jogar meu mapa” abriu diretamente outro projeto com blocos, execução e movimento pelas setas. São contextos isolados no mesmo computador, sem teste em um segundo aparelho físico.

A autorização específica para publicar, atualizar o mesmo post/link e remover o único projeto próprio “LG04 — Ilhas de teste”, somente em homologação, foi recebida em 25/11. A primeira publicação respondeu 200, apareceu uma única vez no Mural e rodou com movimento em uma sessão anônima, sem cookies e sem IndexedDB.

Depois de uma nova edição real no Pinta, o projeto guardou o cenário atualizado mantendo seus arquivos e blocos exatamente iguais. A atualização da publicação respondeu 502; o histórico confirmou que somente a versão anterior continuava ativa. A reprodução com as funções de produção e R2 nativo local mostrou `Invalid ETag in if-match header`: o ETag bruto era enviado como cabeçalho HTTP sem as aspas exigidas. A gravação inicial não usa esse cabeçalho e passava; atualizar, restaurar ou retirar uma reserva existente atingiam a condição incorreta.

Corrigidos os dois pontos de escrita condicional, conservando o CAS. Uma regressão nova executa o código de produção em workerd/R2 nativos: criação, segunda versão no mesmo link, confirmação repetida, escritor antigo recusado, desativação, restauração e retirada idempotente. Reprodução: 500 antes da correção; depois, 28 testes focados/210 expectativas aprovados. A nova fonte, seu perfil e sua imagem precisam de qualificação própria antes de repetir a atualização hospedada. O post de QA ainda será removido ao terminar; produção permanece sem LG04.

A suíte completa do executor após a correção terminou com 441 aprovados, 56 condicionais pulados, zero falhas e 4.688 expectativas. A nova prova compila sua fixture num processo próprio: duas compilações no mesmo processo da suíte Windows impediam a prova de compressão de ler os pontos de entrada do core/Zod, embora ambas passassem isoladas. A rodada completa com a compilação isolada aprovou também essa prova preexistente.

## Comportamento da entrega

O cenário regional levado do Pinta permanece completo dentro do projeto do Estúdio: desenho, lugares, peças e colisões. O projeto usa seus próprios bytes ao reabrir ou jogar, inclusive quando a biblioteca do aparelho contém outra revisão. A captura da miniatura conserva o perfil de origem.

O salvamento na conta usa reservas e objetos selados já existentes. A confirmação identifica a revisão efetivamente enviada. Repetir uma confirmação perdida devolve o mesmo recibo; uma edição concorrente ou uma exclusão não concede permissão para sobrescrever ou recriar a versão remota.

A publicação recebe o documento conferido e remove os vínculos privados da biblioteca. O aceite hospedado ainda deve comprovar primeira publicação, atualização do mesmo post/link e jogo sem a biblioteca do autor.

## Achados corrigidos durante a qualificação

- A criação do jogo consultava o perfil global depois de admitir o PNG. Uma troca durante essa espera podia gravar no perfil seguinte. O construtor captura o armazenamento antes da espera; o host cancela a geração anterior na troca de perfil ou acesso, inclusive A → B → A. Três provas com IndexedDB e PNG reais cobrem esses casos; a reprodução anterior gravava no perfil errado.
- A biblioteca pessoal é local: num aparelho vazio, editar no Pinta não religa sozinho a cópia já guardada no jogo. A janela “Trazer do Pinta” mostrava apenas “já no projeto” e impedia uma atualização explícita. O cenário regional existente agora oferece “Atualizar cenário”, usando a mesma admissão integral e preservando ID, nome, programa e blocos. Reprodução: um teste falhou antes; depois, os 56 testes da janela/360 expectativas passaram. Abertura de desenhos continua sem importação automática. O percurso hospedado deve ser repetido após a implantação.
- O link “Editar no Pinta” em contexto sem desenhos locais podia ficar na galeria, embora o cenário chegasse da conta. O índice focal devolvia vazio antes de avisar a busca, enquanto decodificava o inventário completo. A fila agora anuncia e reserva essa leitura antes de devolver o índice; leituras repetidas compartilham a operação, e uma falha encerra o aviso. Reprodução hospedada e regressão vermelha confirmadas; depois, oito provas da conta regional/57 expectativas e 81 provas do espelho/459 expectativas passaram. A correção não altera os formatos aceitos. Precisa de novo CI e repetição hospedada.
- “Jogar meu mapa” criava o jogo completo, mas levava à galeria. O adaptador do produto agora abre o projeto criado por seu ID. A prova de navegador chama esse mesmo adaptador, confere a navegação e reabre os bytes persistidos. Trinta cenários passaram nos cinco navegadores após a correção.
- Num contexto vazio autenticado normalmente, o link do jogo e a descida da galeria restauravam a mesma cópia em paralelo: a autoridade local recusava a segunda escrita, mostrando recuperação na primeira abertura. A reprodução hospedada capturou `ProjectWriteConflict`; uma prova com o coordenador real, IndexedDB, blocos e PNG reproduziu a falha. As duas entradas compartilham somente a escrita em andamento de conteúdo admitido idêntico e mesma revisão. Dois testes passaram/12 expectativas; conteúdo diferente continua sujeito à recusa nativa, sem sobrescrever o vencedor. A repetição hospedada depende da nova implantação.
- A conversão Classic → Pro e a exportação Classic ainda passavam pela porta legada de materiais. Agora usam o cenário admitido; a compilação Pro adapta somente a cópia intacta do motor compatível, preservando a árvore autoral.
- A validação nova aplicava o teto regional a folhas de sprites antigas e recusava algumas imagens comuns do acervo. A leitura de metadados legados conserva sua política de dimensões, sem rasterização, e mantém CRC, limites de bytes e descompressão. A admissão regional conserva seus limites completos.
- Trocar de perfil cancelava a gravação final do perfil anterior ao consultar a autoridade local. O salvamento captura seu banco e pode terminar nele; a troca continua cancelando o trabalho de interface.
- A confirmação de exclusão da biblioteca não capturava a revisão exibida. Ela passa a guardar perfil, hash e data da revisão; uma atualização em outra aba recusa a confirmação antiga.
- Uma exclusão durante o primeiro envio poderia deixar uma tentativa antiga livre para recriar o projeto. O cliente agora passa pela exclusão autoritativa mesmo sem uma primeira confirmação local.
- Em homologação, a confirmação do Pinta recebia HTTP 400 depois de upload e verificação aprovados. O adaptador HTTP entregava um stream de zero bytes, e o BFF recusava a mera presença do stream. Commit e cancelamento passam a conferir os bytes efetivos; qualquer corpo não vazio continua recusado.
- O botão real “Jogar meu mapa” ainda exigia os campos legados `tilemap`/`scene` e recusava o PNG regional antes de chamar o host. A interface passa a reconhecer o marcador regional, mantendo a admissão integral no destino. A prova pelo botão reproduziu três falhas nos navegadores antes da correção; a rodada seguinte aprovou os 18 cenários. Esse percurso foi acrescentado ao CI obrigatório.
- Na janela de publicação, digitar durante a consulta do post podia perder título/resumo quando a resposta tardia ou o rascunho automático chegavam. O diálogo acompanha a edição manual por abertura: a consulta conserva os campos tocados, e a geração automática não substitui um resumo já escrito. Pedir um novo resumo explicitamente continua disponível. Reprodução focada: duas falhas; após a correção, 19 testes/91 expectativas aprovados, incluindo o conteúdo efetivamente enviado ao publicar/atualizar.

## Evidências locais

| Prova | Resultado observado |
| --- | --- |
| Core completo | 3.311 aprovados, zero falhas; 213.939 expectativas |
| Member-shell completo, antes da correção adicional do corpo vazio do Pinta | 2.785 aprovados, um condicional pulado, zero falhas; 18.250 expectativas |
| Runtime completo, com dependências próprias instaladas pelo lockfile | 440 aprovados, 56 condicionais pulados, zero falhas; 4.683 expectativas |
| BFF + Gateway HMAC + PostgreSQL + MinIO reais | Um cenário, 18 expectativas aprovadas; confirmação perdida, conflito, corrupção e exclusão |
| Autoridade SQL, leitura antiga e coleta de objetos | Cinco aprovados, zero falhas; 63 expectativas em banco exclusivo e recém-criado |
| Biblioteca, histórico, reabertura e confirmação pela interface | 18 aprovados, zero falhas; 114 expectativas, mais 73 casos isolados de persistência |
| Commit/cancelamento do Pinta com stream vazio | Reprodução: duas falhas; após correção: 25 testes aprovados, zero falhas; 146 expectativas |
| Tipos | Estúdio, member-shell, Pinta, Members, core e runtime aprovados |
| Arquivos gerados | Cópias Pro, runtime regional, integração Phaser e perfil da imagem aprovados |
| Suíte oficial completa do Estúdio | 1.006 arquivos em 182 processos, zero falhas; 783 segundos |
| SDKs 3D regenerados e contratos do compilador | 112 testes 3D aprovados, dois TODOs preexistentes, zero falhas; mais dois contratos canônicos aprovados |
| Pinta completo após a correção do botão regional | 3.037 aprovados, 18 condicionais pulados, zero falhas; 37.194 expectativas |
| Navegadores após a correção do botão regional | 18 aprovados em Chrome, Edge e Chromium; rodada final de 58,3 segundos |
| Ponte regional com o CSS real do Pinta e canvas limitado à janela | 30 aprovados: 18 em Chrome/Edge/Chromium, seis em Firefox e seis em WebKit; sem erros de página |
| Tipos após a correção do botão regional | Pinta, member-shell e Estúdio aprovados; conferências dos SDKs e perfil da imagem aprovadas |
| Últimos ajustes de abertura, perfil e projetos | 276 testes aprovados, zero falhas; 6.881 expectativas na suíte de projetos, incluindo restauração nativa concorrente |
| Nuvem e reabertura após a coordenação das escritas | 52 testes aprovados, zero falhas; 225 expectativas |
| Atualização explícita do cenário pela janela real | 56 testes aprovados, zero falhas; 360 expectativas |

As provas com serviços reais usam banco e bucket exclusivos de QA, com listeners de loopback e processos encerrados pelo próprio teste. A sessão injetada nessa prova não substitui o aceite infantil autenticado em homologação.

A rodada regional final cobre exportação, importação, execução Classic/Pro, atualização do mesmo programa, botão real do Pinta e reabertura do PNG completo. Na ampliação para Firefox, a página de provas sem Tailwind deixava a área de desenho crescer com o papel inteiro; corrigida a composição da fixture para compilar e carregar o CSS real do Pinta antes de montar o editor. Acrescentadas as verificações das dimensões do canvas. O pintor do produto já limitava o desenho ao viewport e não foi alterado. Essas provas locais não substituem o CI obrigatório e o aceite hospedado.

O CI inclui compilação regional Pro na imagem Linux real, sem rede, conferindo o perfil e o PNG byte a byte. A qualificação adicional encontrou os carregadores 3D derivados desatualizados; os dois SDKs e o contrato do contêiner foram regenerados com Bun 1.3.11. A imagem com perfil `98ec9667f1a3b893503d9427317dda4b1fb3c0cbfa665ad9c11c8837df05a8a3` passou nas cinco suítes reais e está pronta nos dois pools de staging. Os limites, os três imports Three compartilhados e as licenças foram preservados. Os ajustes posteriores da interface/QA não modificam os arquivos do runtime ou do core usados nessa imagem.

## Limitações e liberação

- O percurso regional exige um motor 2D compatível. Pro conserva a autorização do perfil e o limite HTTP de compilação existente; o motor convertido deve corresponder à cópia compatível.
- O teto continua Pinta nativo 8/nuvem 7 e PNG 5/cena 4. Regras e projeções do nativo 9/nuvem 8 acompanham a LG05.
- A publicação/execução Python depende das capacidades do catálogo autorizado; sua distribuição acompanha a LG08.
- A biblioteca pessoal, o documento na conta e o histórico local têm contratos próprios. Esta entrega não anuncia sincronização do histórico local de aplicações Pro entre aparelhos.
- Aulas legadas conservam seus checkpoints e sua recusa explícita de importação regional. O percurso regional é qualificado no Estúdio livre.
- A publicação de QA em homologação foi autorizada especificamente e iniciada. A atualização do mesmo post/link e a remoção final aguardam a qualificação da correção R2 descrita acima. A autorização não inclui posts de teste em produção.

## Integração e retorno

Preservar os commits concorrentes de aulas em staging. A candidata de produção parte de main e não incorpora o currículo da outra sessão. A entrega exige CI e plano aprovados, integração também em staging e recibos das fontes efetivamente implantadas.

O retorno operacional deve preservar os objetos selados e as autoridades locais. Um leitor incompatível recusa o projeto antes de obter permissão de escrita; não converter referências regionais para o formato legado como forma de retorno.

## Qualificação hospedada em andamento

- A integração `2a0c99e444219dc59cad202f3aab6afc2c4c8f39` completou os 13 jobs e a [implantação normal de staging](https://github.com/informach/sistema-zero/actions/runs/45515065112). Members, Auth, Kids, Comunidade, Admin e Palco ficaram prontos na fonte esperada; as chamadas autenticadas de compilação e verificação responderam 200 com o perfil 98ec9667. A rodada posterior de QA foi cancelada antes da implantação ao encontrar os novos achados acima; a nova candidata deve passar em seu próprio CI.
- Pela sessão infantil real, o botão criou um jogo completo; os blocos e a execução com as setas foram conferidos. O projeto próprio recebeu confirmações seladas e foi exportado antes e depois da restauração em contexto sem IndexedDB. O PNG permaneceu byte a byte; a primeira abertura precisou de nova tentativa, motivando a correção concorrente acima. A comparação textual do programa também precisa distinguir os identificadores regenerados dos blocos do conteúdo autoral; não equivale ainda ao aceite final da nova candidata.
- A revisão automática externa da PR 289 foi pulada por limite de arquivos/créditos. Seu check bem-sucedido não representa aprovação de código. Sem alteração de cobrança ou filtros para contornar esse limite.
- Candidata `6606c563b03f3473579a0585c2c9bff8283b1514`: os 13 jobs de validação do [CI da PR](https://github.com/informach/sistema-zero/actions/runs/45488604088), o plano Railway e a prova de dez mil blocos passaram. A correção posterior do botão exige nova rodada sobre seu próprio commit.
- Integração em staging `6a0fde4bb7a65baade7dc19b36caec460cc7d750`: [CI e implantação normal aprovados](https://github.com/informach/sistema-zero/actions/runs/45488644607), preservando os commits de aulas da outra sessão.
- Imagem qualificada `sha256:a65cc06c02251211a1154b2cb96a54b68bc6f195a05d7e07fbbc6973a6c09236`, perfil `98ec9667f1a3b893503d9427317dda4b1fb3c0cbfa665ad9c11c8837df05a8a3`: cinco suítes de imagem aprovadas, mais quatro provas Python sem promover catálogo. Guardas de aulas: cinco provas de navegador e quatro verificações do Farol, incluindo negativos intencionais, aprovadas.
- Worker de homologação `cfc0f196-0e93-4648-b308-9fd5b7b847bc`: os dois executores existentes ficaram prontos com a imagem qualificada, sem alterar seus limites ou catálogo. Prova autenticada pelo Members `6a0fde4`: compilação e verificação responderam 200 com o perfil esperado.
- Sessão infantil real de homologação: backup nativo 8 próprio importado pela interface; commit causal do Pinta respondeu 200 e a galeria mostrou o cenário guardado na conta. Importação pelo Estúdio recusou corretamente projeto sem motor; após instalação normal do Jogo 2D, o cenário entrou no projeto próprio de QA. Reabertura em contexto sem dados locais e publicação/atualização ainda estão em aceite.
- Projeto próprio `01M87ZFYJ5S4ZT64YR0MBCX2FK`: quatro confirmações seladas 200, com revisão e recibo. Um novo contexto, recebendo somente os cookies de autenticação, recuperou o projeto e seu PNG regional pela conta; a interface mostrou `qa-lg04-ilhas` nos materiais e permitiu baixar o projeto. Nenhum IndexedDB, biblioteca ou cache foi copiado entre esses contextos. Isso prova duas sessões isoladas no mesmo computador; não representa teste em um segundo aparelho físico.
