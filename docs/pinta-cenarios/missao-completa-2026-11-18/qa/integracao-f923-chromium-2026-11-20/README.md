# Integração f923 e foco no Chromium novo — 20/11/2026

Integração de f923972b4 com cbc166020, preservando ambos os históricos. Os cinco
conflitos foram resolvidos com os contratos publicados; somente os três SDKs gerados
autorizados foram regenerados. Os três resultados são idênticos, byte por byte, ao
remoto publicado (conflitos-e-gerados.json). Os 16 gates anteriores desta integração
passaram antes das correções abaixo; a rodada final de 12 gates está separada.

## Causas e correções

A CI 44790132975 falhou nos três shards Chromium: a versão 159 passou a bloquear
foco programático em quadros opacos sem delegação. A reprodução mínima registra
falha sem permissão e sucesso com a permissão nominal, tanto direta quanto aninhada.
O contrato compartilhado delega somente foco aos hosts JS/Pro e à casca interna.
Sandbox, origens, referrer, permissões anteriores e classes visuais são preservados.
Não foi alterado nenhum motor 3D funcional para contornar o erro.

A primeira rodada local ampla passou em 213 de 216 casos. As três falhas restantes
usavam fixtures com iframes próprios, sem a delegação do host real: GLB/HDR e neve
avançada em duas larguras. As fixtures agora recebem a mesma constante compartilhada.
Os erros continuam sendo coletados e os sandboxes preservados. A rodada original
com falhas está em chromium.json, e a repetição dirigida em chromium-regressao.json.
Os 185 cartões passaram na rodada ampla; não somar as repetições como cartões novos.
As outras mudanças durante a revisão foram somente nos testes: campo obrigatório
de origem da mensagem e retirada do prazo extra do novo teste de foco, que passa
com o padrão de 30 segundos. O produto ficou congelado durante as duas rodadas.

A regressão dirigida também repetiu o caso de colar blocos que havia falhado na
CI. O marcador de rascunho insere um aviso e desloca os campos após a visibilidade
inicial; foram observados x=246 antes e x=271 depois. O gesto antigo podia panear
o espaço em vez de agarrar o bloco. A fixture espera a marca e a estabilidade do
hover real, pega o centro do texto e compensa o ponto de pega mantendo o mesmo
deslocamento. Os critérios de encaixe, programa gerado, reabertura e ausência de
erros permanecem. Três repetições sem instrumentação passaram, antes da rodada
final. As tentativas com instrumentação são diagnósticas, não desempenho medido.

Os testes da interface real cobrem prévia direta e casca: a Ponte tem foco antes
do pedido ao jogo, o jogo recebe ArrowUp confiável e a criança volta a editar.
A galeria e os jogos avançados são exercitados com o Chromium 159 fornecido pelo
Playwright, sem substituir pelo Chrome instalado, filtrar erros ou desligar a política.
Referências primárias: [lançamento da política](https://chromestatus.com/feature/5179186249465856),
[contrato de delegação](https://developer.chrome.com/blog/chrome-149-beta#permissions-policy-focus-without-user-activation).

O outro bloqueio da CI era o modo Blocos com 4.750.099 bytes, acima de 4.750.000.
O console JavaScript importava o comando Python mesmo quando esse comando não era
usado. A entrada Python agora carrega apenas para o console Python que a oferece.
O teste mantém as mensagens ao trocar de projeto e não concede execução sem host.
Todos os tetos de bytes, gzip e quantidade de arquivos permanecem os mesmos.
A medição local está em orcamento-console.json; a suíte completa de projetos foi repetida.

## Ambientes e limites

Os logs de componentes incluem os casos internos das fixtures isoladas; os wrappers
não são somados como se fossem outro conjunto funcional. As falhas da CI anterior
e o único rerun diagnóstico do Desktop ficam explícitos em ci-anterior.json.
O primeiro preflight WebKit encontrou somente a ausência do executável da revisão
2388. A revisão exata foi instalada sem remover os navegadores de outros pacotes.
Na execução posterior, os sete casos funcionais passaram. O caso de isolamento
de CPU do WebKit continua ignorado pelo contrato anterior: não é uma prova de
isolamento nesse motor, nem de um Safari/iPad físico. Esse limite está no relatório.
A suíte nativa local completa teve quatro recusas EUNKNOWN do helper da máquina;
não foi tratada como aprovada. A suíte Windows da CI passou no rerun, sem mudança
no produto ou nos prazos. As provas de navegador são desta máquina Windows;
Firefox usa o binário Playwright e o protocolo W3C documentado no lote anterior.
Não são testes com aparelhos físicos adicionais nem com participantes infantis.

A mudança da casca exige novo perfil e nova imagem Linux. O perfil 4de439a6… está
gerado e conferido; a imagem db27 anterior não pode ser usada para essa mudança.
Estes testes locais não implantam Worker, aplicativos, política, Python ou gravador.
A CI geral desta nova fonte e o rollout autenticado continuam sendo etapas seguintes.
O plano da missão continua com seus itens pendentes, incluindo etapa 8 e homologação
integral hospedada. Nenhuma publicação em produção ou PR faz parte deste lote.
