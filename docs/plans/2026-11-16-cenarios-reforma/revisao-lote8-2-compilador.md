# Lote 8.2 — Compilador, junção estática e revisão local

18/11/2026 · `staging` · base `14d783d1b`.

**8.2 implementado, testado e revisado no escopo local. Lote 8 continua aberto; próximo recorte 8.3.** Não houve implantação ou validação remota. Os destinos finais ainda não estão entregues pela interface.

Este registro complementa o [primeiro pacote integrado](checkpoint-lote8-integracao.md) e os checkpoints de superfícies, atores, solo e água. A compilação usa os geradores existentes; os destinos não receberão uma segunda implementação de terreno, caminhos ou assentamento.

## Junção opcional com identidade preservada

`compilarCenario` aceita `juncaoEstatica: { tamanhoDaRegiao?: number }`. O padrão é 64 m, com faixa permitida de 16–512 m. O subpath `motor/compilar` também expõe `juntarEstaticosDoPacote`: recebe somente o pacote compilado e não consulta o Palco.

A junção reúne instâncias por região, material carregado e layout de atributos. Usa transformação/divisão de geometria já existentes e `mergeGeometries` do Three instalado. Materiais diferentes continuam separados; não há atlas automático nem equivalência presumida por nome. Peças transparentes mantêm a ordenação por objeto. Atores, skins, morphs, clipes e lâminas com efeito ficam fora da junção.

O manifesto conserva entidades, âncoras, organização, propriedades, colisões, marcadores, alturas, receitas e licenças. Os nós reunidos registram **faixas de triângulos por malha e entidade**. O núcleo oferece busca por faixa; o conferidor verifica identidade, intervalos, cobertura, quantidade e nomes das malhas reais do GLB. Não basta manter a âncora e perder a identificação da superfície clicada.

O teste de 2.800 caixas ultrapassa 65.000 vértices: todas as faces/entidades permanecem nas partes, com no máximo 65.000 vértices por parte. Outro teste confere posições, winding de reflexo e UVs por canto. O canal transitório de origem é removido antes da gravação. Layout incompatível ou memória insuficiente provocam erro explícito; nenhum canal é apagado para forçar a junção.

Os arquivos substituídos deixam o inventário se não houver outra referência. As colisões continuam independentes e idênticas. A operação não altera a entrada; falha/cancelamento descarta o resultado parcial. Repetir a junção em uma cena já reunida mantém o manifesto.

## Prova integrada ampliada

O script `playground/oficina/verificar-compilacao-integrada.mjs` agora executa quatro combinações com `CENARIOS_QA_TERRENO=1` e/ou `CENARIOS_QA_JUNCAO=1`.

A fixture de catálogo contém relevo, recorte, buraco, pintura com pesos variáveis/textura real, panorama 2:1, trilha, piso `caminho_terra_reto` do Reino conformado ao relevo, ponte do Adventure Land, contato geométrico medido e objeto apoiado na parte `modelo/0`, lago do Reino com margens físicas, Cute Characters espelhado com quatro clipes e conjunto girado. A raiz da montagem usa escala uniforme conforme o contrato; a peça interna tem escala por eixo.

| Ensaio | Arquivos | Bytes | Nós / malhas | Colisões | GLBs no Khronos |
|---|---:|---:|---:|---:|---:|
| Plano | 6 | 12.208 | 5 / 5 | 3 | 6 |
| Plano unido | 6 | 13.516 | 4 / 4 | 3 | 6 |
| Catálogo | 27 | 8.692.217 | 20 / 25 | 9 | 23 |
| Catálogo unido | 28 | 8.697.193 | 18 / 23 | 9 | 24 |

**Todos passaram: três ciclos completos, três cancelamentos, mesma assinatura de inventário nos três ciclos, reabertura sem o palco autoral e 0 erros/0 avisos Khronos.** Os cancelamentos dos casos unidos ocorrem durante a própria junção. O documento autoral permanece igual. Os objetos `a` e `b` continuam identificáveis por raycast no arquivo reaberto, inclusive reunidos em uma malha.

A junção reduz desenhos, mas pode aumentar bytes porque troca instâncias por vértices transformados. A interface deverá mostrar o orçamento efetivo de cada escolha. Não se promete que juntar peças diferentes resolverá limites de material, textura ou tamanho do Estúdio.

Consultas físicas comparam o pacote com as fontes nativas no piso conformado, na ponte e no objeto apoiado. Exemplo: em `(8, 10)`, ambos retornam `1,2641122772 m`; em `(4, −3)`, ambos retornam `−1,1301716566 m`. O buraco continua aberto e o chão não ultrapassa seu domínio finito.

As três câmeras do catálogo unido tiveram erros médios por canal de **0,087512**, **0,130538** e **0,112509** em 8 bits. As capturas correspondem à cena nativa e ao pacote reaberto. Os contadores GPU voltam à base após cada ciclo e a zero após descartar o renderer; a textura interna DFG do Three permanece somente durante a vida dele.

Evidências: [plano](evidencias/lote8-juncao/plano/resultado.json), [plano unido](evidencias/lote8-juncao/plano-juncao/resultado.json), [catálogo](evidencias/lote8-juncao/catalogo/resultado.json), [catálogo unido](evidencias/lote8-juncao/catalogo-juncao/resultado.json). Os diretórios incluem os relatórios Khronos; os casos unidos incluem as três câmeras antes/depois. [Vista geral nativa](evidencias/lote8-juncao/catalogo-juncao/geral-antes.png) e [reaberta](evidencias/lote8-juncao/catalogo-juncao/geral-depois.png).

Essas imagens são fixtures técnicas, com volumes e poses de referência. **Não são uma nova proposta artística da Faísca**, nem aceite de encaixe dos cenários definitivos, IK ou desempenho em dispositivos físicos.

## Correções e limites conferidos na revisão

### Aparência facetada

`flatShading` não é um campo do glTF. O divisor pode produzir normais, mas exportá-las em um material originalmente facetado fazia o leitor reabrir o modelo suavizado. O preparo do GLB passa a omitir NORMAL/TANGENT nessa cópia, mantendo posições e índices; o leitor usa normais por face. A geometria/material original é restaurada e as cópias são descartadas. A preparação de imagens foi reunida em `acabamento-glb.ts`.

O ensaio de duas faces compartilhando vértices usa reflexão, rotação e escala externa por eixo. Com a correção temporariamente desativada, o teste falhou: erro médio **3,708454**, máximo **43**, material reaberto suavizado. Restaurada a correção, deu **0 diferença em 14.526 amostras** e material facetado. [Falha reproduzida](evidencias/lote8-juncao/facetado-antes/resultado.json), [correção](evidencias/lote8-juncao/facetado-depois/resultado.json), [imagem reaberta](evidencias/lote8-juncao/facetado-depois/objeto-compilado.png).

Morphs de normal em material explicitamente facetado exigem preparo e são recusados, em vez de remover canais silenciosamente. A gravação também exige separar materiais lisos/facetados misturados na mesma parte. O compilador já separa partes por material.

### Transformações internas da pele

Normalizar uma malha com skin na raiz do glTF exige cuidado com a `normalMatrix` e o lado das faces. Transformações internas com escala anisotrópica, cisalhamento ou reflexo não são achatadas silenciosamente: há erro explícito antes da cópia. Escala animada de ancestral da pele deve ser uniforme/positiva e ter interpolação linear/discreta. O vínculo precisa ser `attached`, como no leitor glTF utilizado.

Isso não altera a escala externa de objetos estáticos nem o espelho controlado pela ferramenta. Os sete reflexos do ator, seus UVs métricos, clipes/morphs e o Cute real continuam passando. A comparação do Cute no pacote unido foi repetida após esse limite. Não se afirma compatibilidade irrestrita com qualquer configuração de rig de terceiros.

### Memória antes do decoder

Um arquivo pequeno pode instanciar a mesma geometria muitas vezes. A inspeção passou a reservar conservadoramente a materialização dos nós, além dos accessors e pixels. O caso com 512 nós/30 mil vértices demonstrou a falha antes: passava pelo teto de bytes; agora é recusado antes do decoder. O teto também participa do carregamento, da junção e da leitura do pacote.

As imagens do GLB devem respeitar os limites portáteis de 4.096 px por lado/8.388.608 pixels. Não se usa o redimensionamento silencioso do exporter para fazer uma fonte maior caber. A junção confere o orçamento antes de concatenar e não aloca lotes sem limite.

## Verificação e decisão

- Núcleo: **348 testes / 10.586 asserções**, sem falhas.
- Motor: **235 testes / 4.980 asserções**, sem falhas.
- Oficina: **110 testes / 735 asserções**, sem falhas.
- Tipagem de núcleo, motor e oficina aprovada. Build local da oficina/workers aprovado; continua o aviso anterior de chunks acima de 500 kB.
- Revisados matrizes/precisão local, winding, UVs, faixas/picking, tipos de collider, recursos emprestados/próprios, falhas/cancelamento, cópias/restauração e identidade dos atores.

**Fechar somente 8.2.** O compilador comum está disponível e conferido. O próximo recorte é 8.3: runtime, pacote three.js, arquivo único, orçamento/licenças e interface de exportação com autorização da revisão real. Raylib/Estúdio e publicação do jogo seguem em 8.4/8.5. Lotes 9–10, composição final, full review, CI e implantação/validação de staging permanecem pendentes.

Água dinâmica ainda será restaurada pelos consumidores; os comparativos congelam ondas. Os exemplos jogáveis/downloads e a integração real de conta também pertencem aos recortes seguintes. Nenhum artefato privado GLB foi incluído no Git; somente código, relatório e evidências visuais/dados dos ensaios.
