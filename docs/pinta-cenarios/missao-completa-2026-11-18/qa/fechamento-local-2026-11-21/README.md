# Checkpoint local do Pinta — 21/11/2026

O trabalho foi interrompido a pedido do usuário. Este lote registra as provas
produzidas antes da interrupção e a integração local solicitada depois dela.
Não representa conclusão da missão nem novo deploy. Os dados autenticados,
exportadores e serviços foram ensaiados na fonte 85d16fcd99efe2a72a8350181542cf475a55db37.

## Ciclo autenticado e publicação

Os seis recursos pertencem somente à homologação em staging. A Vila contém
18 camadas e dois tilesets; a Cabana, duas camadas. O download pela interface
e a leitura da autoridade concordam nos seis hashes. A captura autoral usa
o transporte QA tipado, não uma imagem achatada como documento principal.

A edição real da Cabana mudou somente esse mapa. A atualização preservou
exatamente os arquivos Python, o ID, caminho e receita da imagem estruturada,
e o programa JavaScript. O PNG Python passou de 9abdd867… para 70919156…;
os recibos conservam os hashes completos. A reabertura em nova instância
da aplicação preservou todos os arquivos e recursos Python.

Os dois jogos foram publicados pela interface de staging, sem inscrição em
desafio. Seus links foram executados com teclado real automatizado:

- JavaScript: /jogar/835d9236-62ca-48da-a6eb-0ea68defec5d; colisão, percurso
  Vila → Cabana → Vila, água animada e o personagem atrás do primeiro plano.
- Python: /jogar/f5026544-89f6-4fcd-9c0b-d0cdd0da4b93; colisão precisa,
  mesmo percurso e pixels da Cabana efetivamente atualizada. O runtime
  publicado usa pygame-ce 2.5.7 e Python 3.14.2. A captura final é a imagem
  do próprio canvas; uma captura anterior do elemento dentro do iframe
  incluiu parte do console e não serve como comparação de pixels.

A tentativa RPC107 falhou numa comparação de IR. Não há captura integral
da IR anterior que permita atribuir a diferença somente a metadados.
Os arquivos e blocos permaneceram iguais. RPC114 capturou antes/depois e
preservou o programa integral; RPC116 confirmou a reabertura. A falha 107
fica registrada e não é convertida retrospectivamente em sucesso.

## Serviços de Python e compatibilidade

O catálogo e a política novos foram ativados em staging. Um host ausente
impedia abrir projetos Python novos: foi acrescentado o host da release 6,
preservando os dois anteriores, pelo fluxo canônico de rollout.

O serviço separado de análise Python antigo recusava os novos recursos do
manifesto. Sua imagem foi construída e qualificada em Linux pela CI
[44891720185](https://github.com/informach/sistema-zero/actions/runs/44891720185),
com fontes fixadas em 85d16fcd9, três casos nativos e Docker 29.8.2.
A imagem armazenada conservou o índice OCI, manifest da plataforma e config
verificados. O Worker final é a081b2a9-21f4-4f9b-a0b4-2897825e9ee0;
os namespaces existentes foram preservados e nenhuma migração foi acrescentada.

A primeira tentativa ativou o Worker, mas recusou criar um aplicativo novo
por já existir outro ligado ao namespace. O recibo parcial foi mantido.
A correção fixou explicitamente o nome do aplicativo existente e atualizou
sua imagem. A conferência externa confirmou bundle, versão e aplicativo.

As APIs da release atual e anterior passaram: autenticação negativa,
manifesto forjado, quota, análise, completions, hover, revisão obsoleta,
cancelamento efetivo do alvo e fechamento confirmado dos IDs próprios.
A interface autenticada reconectou a análise e removeu o aviso anterior.
Os recibos do runner mantêm overallQualified=false: não se altera essa
classificação nem se afirma a homologação de Admin, aula ou live inteira.
A observação externa mostrou instâncias inativas; registros de Durable
Objects permanecem e não são interpretados como processos ativos.

## Pacotes externos da mesma edição

Os quatro ZIPs contêm os arquivos originais dos pacotes já exercitados.
Todos os hashes originais foram conferidos novamente antes de arquivar,
e também após descomprimir cada ZIP. Nenhum arquivo do mapa foi reescrito.

- Tiled 1.12.2: quatro conversões nativas JSON/TMX dos dois mapas; comparação
  de cena completa sem diferenças no subconjunto suportado.
- Phaser 3.90.0, Chromium 159: desktop e perfil de toque emulado, com teclado;
  colisão, portas, animação e primeiro plano, sem erros no console.
- Pygame-ce 2.5.8, Python 3.12.10: superfícies reais com SDL dummy e exemplo
  portátil executado por 20 quadros. Esta versão difere do runtime web.
- Godot 4.7.2: importação e execução gráfica OpenGL na RTX 3050, com portas,
  colisão e animação. As capturas finais Godot e Phaser foram inspecionadas.

## Integração local e pendências preservadas

Foram integradas as branches do gravador B6, das regiões internas e da
qualificação Linux. O conflito com a correção 5155bc5e8 da staging preserva
as duas verificações de encerramento e a retenção do arquivo em caso de dúvida.
O workflow pontual de imagem só dispara na branch de QA indicada, não na staging.

O código integrado prepara escrita de nuvem 6, mas essa escrita ainda não foi
implantada ou homologada com produtor real, clientes antigos e rollback.
Os consumidores de regiões, carregamento sob demanda, automapping em várias
camadas e suporte autoral integral a mapas expansíveis, isométricos e hexagonais
continuam pendentes. Nativo público 7 e regiões internas 8 são contratos distintos;
não se anuncia o segundo como formato público disponível na oficina.

Não foram feitos ensaios com crianças ou outros aparelhos físicos. Toda a
automação ocorreu nesta máquina. O usuário pediu pausa, commit e merge local;
não houve push nem publicação em produção neste fechamento. Os processos de
homologação foram encerrados; verificações locais finitas servem apenas ao merge.

## Verificação da integração local

Passaram 2.334 testes do Pinta e 2.774 do diretório src do Core. Os três
casos Pygame ignorados no lote geral foram executados em Python nativo e
passaram; passaram também 72 casos Kids e sete de autoridade/memória do host.
O conflito de processos foi conferido em Windows e Linux: seis aprovados e
dois específicos ignorados no Windows, oito aprovados em Linux. Os 34 testes
focados do Blockly/validação e os sete contratos congelados recebidos da staging
também passaram. Nenhum servidor ou navegador foi reiniciado para estes gates.

Tipos do Pinta, Estúdio e runtime, perfil e lint constam em verificacao/.
A checagem completa de tipos do Estúdio iniciou antes de receber as novas
fixtures congeladas; estas receberam sete ensaios focados depois do merge.
O resultado registra essa diferença de escopo, sem atribuir uma execução
posterior que não ocorreu. Não houve nova CI remota desta integração local.

O lint geral encontrou um erro de ordenação de exports em
`packages/molda-cenarios-core/src/v2/index.ts`, recebido do commit concorrente
1342f120c. Seu blob é idêntico ao da staging e não foi alterado neste trabalho.
O lint das alterações do Pinta passou em 138 arquivos. A falha geral é mantida
no relatório; não se apresenta a verificação global como inteiramente aprovada.
