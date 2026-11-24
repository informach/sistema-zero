# LG04 — Pinta, Estúdio, conta e Mural

Em qualificação em homologação. Produção ainda não recebeu esta entrega. O [plano de execução](../plans/2026-11-24-lg04-pinta-estudio-conta-mural.md) contém o percurso e os critérios de aceite.

## Comportamento da entrega

O cenário regional levado do Pinta permanece completo dentro do projeto do Estúdio: desenho, lugares, peças e colisões. O projeto usa seus próprios bytes ao reabrir ou jogar, inclusive quando a biblioteca do aparelho contém outra revisão. A captura da miniatura conserva o perfil de origem.

O salvamento na conta usa reservas e objetos selados já existentes. A confirmação identifica a revisão efetivamente enviada. Repetir uma confirmação perdida devolve o mesmo recibo; uma edição concorrente ou uma exclusão não concede permissão para sobrescrever ou recriar a versão remota.

A publicação recebe o documento conferido e remove os vínculos privados da biblioteca. O aceite hospedado ainda deve comprovar primeira publicação, atualização do mesmo post/link e jogo sem a biblioteca do autor.

## Achados corrigidos durante a qualificação

- A conversão Classic → Pro e a exportação Classic ainda passavam pela porta legada de materiais. Agora usam o cenário admitido; a compilação Pro adapta somente a cópia intacta do motor compatível, preservando a árvore autoral.
- A validação nova aplicava o teto regional a folhas de sprites antigas e recusava algumas imagens comuns do acervo. A leitura de metadados legados conserva sua política de dimensões, sem rasterização, e mantém CRC, limites de bytes e descompressão. A admissão regional conserva seus limites completos.
- Trocar de perfil cancelava a gravação final do perfil anterior ao consultar a autoridade local. O salvamento captura seu banco e pode terminar nele; a troca continua cancelando o trabalho de interface.
- A confirmação de exclusão da biblioteca não capturava a revisão exibida. Ela passa a guardar perfil, hash e data da revisão; uma atualização em outra aba recusa a confirmação antiga.
- Uma exclusão durante o primeiro envio poderia deixar uma tentativa antiga livre para recriar o projeto. O cliente agora passa pela exclusão autoritativa mesmo sem uma primeira confirmação local.
- Em homologação, a confirmação do Pinta recebia HTTP 400 depois de upload e verificação aprovados. O adaptador HTTP entregava um stream de zero bytes, e o BFF recusava a mera presença do stream. Commit e cancelamento passam a conferir os bytes efetivos; qualquer corpo não vazio continua recusado.
- O botão real “Jogar meu mapa” ainda exigia os campos legados `tilemap`/`scene` e recusava o PNG regional antes de chamar o host. A interface passa a reconhecer o marcador regional, mantendo a admissão integral no destino. A prova pelo botão reproduziu três falhas nos navegadores antes da correção; a rodada seguinte aprovou os 18 cenários. Esse percurso foi acrescentado ao CI obrigatório.

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
| Tipos após a correção do botão regional | Pinta, member-shell e Estúdio aprovados; conferências dos SDKs e perfil da imagem aprovadas |

As provas com serviços reais usam banco e bucket exclusivos de QA, com listeners de loopback e processos encerrados pelo próprio teste. A sessão injetada nessa prova não substitui o aceite infantil autenticado em homologação.

Uma rodada anterior de navegador passou em 15 cenários de Chromium, Chrome e Edge. A rodada final precisa ser repetida após os ajustes de exportação/conversão. Builds, CI obrigatório, imagem e percurso hospedado ainda estão em conferência; as linhas acima não representam aprovação desses gates. O CI inclui uma prova de compilação regional Pro na imagem Linux real, sem rede, conferindo o perfil da imagem e o PNG byte a byte.

Essa prova de imagem passou na primeira candidata. A qualificação adicional de staging encontrou os carregadores 3D derivados das dependências compartilhadas desatualizados; a conferência local reproduziu a divergência. Os dois SDKs e o contrato derivado do contêiner foram regenerados com Bun 1.3.11 e passaram nos testes acima. O perfil passou para `98ec9667f1a3b893503d9427317dda4b1fb3c0cbfa665ad9c11c8837df05a8a3`; a nova imagem e seu CI ainda precisam concluir a qualificação. Os limites, os três imports Three compartilhados e as licenças existentes foram preservados.

## Limitações e liberação

- O percurso regional exige um motor 2D compatível. Pro conserva a autorização do perfil e o limite HTTP de compilação existente; o motor convertido deve corresponder à cópia compatível.
- O teto continua Pinta nativo 8/nuvem 7 e PNG 5/cena 4. Regras e projeções do nativo 9/nuvem 8 acompanham a LG05.
- A publicação/execução Python depende das capacidades do catálogo autorizado; sua distribuição acompanha a LG08.
- A biblioteca pessoal, o documento na conta e o histórico local têm contratos próprios. Esta entrega não anuncia sincronização do histórico local de aplicações Pro entre aparelhos.
- Aulas legadas conservam seus checkpoints e sua recusa explícita de importação regional. O percurso regional é qualificado no Estúdio livre.
- A publicação real de teste no Mural será solicitada para o projeto concreto preparado em homologação, se puder notificar outras pessoas. A autorização anterior de envio da LG02 ao professor se refere àquele envio.

## Integração e retorno

Preservar os commits concorrentes de aulas em staging. A candidata de produção parte de main e não incorpora o currículo da outra sessão. A entrega exige CI e plano aprovados, integração também em staging e recibos das fontes efetivamente implantadas.

O retorno operacional deve preservar os objetos selados e as autoridades locais. Um leitor incompatível recusa o projeto antes de obter permissão de escrita; não converter referências regionais para o formato legado como forma de retorno.

## Qualificação hospedada em andamento

- Candidata `6606c563b03f3473579a0585c2c9bff8283b1514`: os 13 jobs de validação do [CI da PR](https://github.com/informach/sistema-zero/actions/runs/45488604088), o plano Railway e a prova de dez mil blocos passaram. A correção posterior do botão exige nova rodada sobre seu próprio commit.
- Integração em staging `6a0fde4bb7a65baade7dc19b36caec460cc7d750`: [CI e implantação normal aprovados](https://github.com/informach/sistema-zero/actions/runs/45488644607), preservando os commits de aulas da outra sessão.
- Imagem qualificada `sha256:a65cc06c02251211a1154b2cb96a54b68bc6f195a05d7e07fbbc6973a6c09236`, perfil `98ec9667f1a3b893503d9427317dda4b1fb3c0cbfa665ad9c11c8837df05a8a3`: cinco suítes de imagem aprovadas, mais quatro provas Python sem promover catálogo. Guardas de aulas: cinco provas de navegador e quatro verificações do Farol, incluindo negativos intencionais, aprovadas.
- Worker de homologação `cfc0f196-0e93-4648-b308-9fd5b7b847bc`: os dois executores existentes ficaram prontos com a imagem qualificada, sem alterar seus limites ou catálogo. Prova autenticada pelo Members `6a0fde4`: compilação e verificação responderam 200 com o perfil esperado.
- Sessão infantil real de homologação: backup nativo 8 próprio importado pela interface; commit causal do Pinta respondeu 200 e a galeria mostrou o cenário guardado na conta. Importação pelo Estúdio recusou corretamente projeto sem motor; após instalação normal do Jogo 2D, o cenário entrou no projeto próprio de QA. Reabertura em contexto sem dados locais e publicação/atualização ainda estão em aceite.
- Projeto próprio `01M87ZFYJ5S4ZT64YR0MBCX2FK`: quatro confirmações seladas 200, com revisão e recibo. Um novo contexto, recebendo somente os cookies de autenticação, recuperou o projeto e seu PNG regional pela conta; a interface mostrou `qa-lg04-ilhas` nos materiais e permitiu baixar o projeto. Nenhum IndexedDB, biblioteca ou cache foi copiado entre esses contextos. Isso prova duas sessões isoladas no mesmo computador; não representa teste em um segundo aparelho físico.
