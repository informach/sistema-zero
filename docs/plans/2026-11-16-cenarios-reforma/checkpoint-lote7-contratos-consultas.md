# Lote 7.1 — Contratos, consultas e transferência de marcadores

18/11/2026 · base `671e8c4c0`, plano detalhado `73915989c`. **Lote 7 aberto, 7.1 ainda em execução.** Este recorte é de núcleo e persistência. Não entrega a interface Jogo, os helpers do palco ou a iluminação nova no renderer.

## Implementado no recorte

O marcador existente ganhou uma configuração opcional estrita: ponto, início principal/secundário, zona de caixa/esfera/polígono, rota, câmera, luz pontual/foco, régua e referência de escala. Nome, posição, giro, chão, associação, propriedades, grupo e camada continuam no mesmo contrato. Marcadores antigos sem configuração permanecem pontos. Não se infere função pelo nome.

A iluminação existente conserva `hora` e aceita overrides opcionais de sol, ambiente, céu por cor/panorama referenciado, névoa e sombras. Cores, intensidades, alcances, direção, campo de visão, polígonos, controles e resolução de sombra têm limites explícitos. Existe no máximo um início principal, 32 luzes locais e quatro luzes locais com sombra. Nenhum desses campos executa scripts.

Consultas puras resolvem pose, alvo local, volumes, inclusão em zona, início visível e rota. O polígono preserva concavidade e inclui bordas. A rota mede distância 3D e amostra o mesmo relevo em cada ponto; uma raiz livre mantém sua altura, e uma raiz no chão mantém seu deslocamento. A contagem precede a consulta ao campo: até 16.384 amostras por rota e 262.144 no documento. Controles/descritores permanecem imutáveis.

O fragmento existente agora aceita marcadores. Copiar resolve a posição no chão, desliga associações fora da escolha e conserva propriedades. Colar remapeia associação interna, grupo/camada e identidade; câmera/rota/zona conservam controles locais, com uma única translação da raiz. Um conjunto de objetos recusa metadados de jogo de modo explícito. A seleção/clipboard da interface ainda precisam receber essa extensão no lote 7.

Panorama usa a tabela de texturas autorizadas. Remover uma textura em uso é recusado; restaurar a aparência de um objeto não elimina uma textura compartilhada com o céu. O desfazer restaura a iluminação antes de remover imagens que só existiam no estado novo. O fluxo de arquivos por conteúdo e licença continua o existente, sem URL livre ou armazenamento paralelo.

## Evidências locais

- Testes iniciais reproduziram a ausência das novas configurações, a recusa de marcadores em fragmentos e a remoção indevida de imagem compartilhada. Os casos passaram após a implementação.
- A revisão reproduziu a aplicação dupla da altura do campo numa rota com raiz livre. O cálculo agora usa a variação de terreno relativa à raiz, preservando sua pose.
- Um ensaio de orçamento comprovou que uma rota excessiva é recusada antes de qualquer leitura do terreno; o orçamento agregado também é conferido no documento.
- Núcleo: **291 testes / 10.282 asserções**; motor: **126 / 3.784**; oficina: **101 / 652**, todos sem falhas no recorte verificado.
- PostgreSQL real: **41 testes / 365 asserções**. O teste novo grava início, zona, rota, câmera, foco, propriedades e ambiente em um lote; reabre o serviço, repete a operação sem nova revisão, reconstrói o histórico e desfaz/refaz os tipos e valores do JSONB.
- Tipagem do núcleo, motor e oficina conferida. Build da oficina e execução dos quatro workers compilados sem erros. Permanece o aviso conhecido de chunk acima de 500 kB.

Essas provas não são um aceite visual das ferramentas do lote 7, nem homologação de aparelhos físicos, implantação remota ou aprovação artística.

## Próxima frente exclusiva

Continuar 7.1: revisar contratos/limites e vínculos, completar os casos de consultas, autoria/hosts, remoção de associações e regressão do recorte antes de fechá-lo. A seguir, 7.2 instala helpers, seleção, câmeras e inspeção física; 7.3 aplica luz/céu/névoa ao renderer; 7.4 entrega os controles; 7.5 revisa o lote inteiro.

Lotes 0–6 permanecem fechados localmente. Lotes 8–10, composição final da Faísca pela ferramenta, full review, CI, implantação e validação em staging continuam pendentes. Nenhuma abertura aos membros ou publicação em produção foi realizada.
