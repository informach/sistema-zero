# Adiantamento do núcleo puro dos lotes 4, 5 e 6

Data: 17/11/2026. Trabalho de uma sessão paralela, pedido pela usuária, enquanto o lote 3 segue em execução exclusiva na sessão principal. **Não fecha nem inicia formalmente nenhum lote.** É matéria-prima para quando a sequência chegar a cada um.

## Regra de convivência

- Só arquivos **novos** em `packages/molda-cenarios-core/src/v2/` e `packages/molda-cenarios-core/tests/`.
- Nenhuma alteração em `documento.ts`, `comandos.ts`, `inverter.ts`, `validacao.ts`, `index.ts`, motor, oficina, Members, BFF ou nos documentos de rastreamento.
- Os módulos **não estão exportados** por `v2/index.ts`. Quem ligar acrescenta a linha `export * from './<arquivo>'` no lote correspondente.
- Núcleo puro: sem React, Three ou IO. Só soma, produto, divisão e raiz quadrada (nada de seno, exponencial ou `Math.random`), para o mesmo gesto dar o mesmo resultado à mão, no agente e no servidor.
- Tudo aqui pode ser alterado ou descartado pela sessão responsável pelo lote. Se um contrato não servir ao desenho final, vale o desenho final.

## Lote 4 — Terreno

| Arquivo | O que traz |
|---|---|
| `campo-de-alturas.ts` | Grade de trabalho em metros (`CampoDeAlturas`) para o relevo inteiro. `campoDaBase` abre a base e as peças; `amostrasDaPeca` devolve as 65 × 65 alturas para `codificarPecaDeAlturas`; `pecasDaRegiao` lista as peças que uma região tocou (as duas vizinhas quando a amostra está na divisa). Leitura com a mesma interpolação triangular de `criarFonteDeAlturas`; declive por amostra. |
| `pinceis-de-terreno.ts` | Uma pincelada por chamada, alterando o campo e devolvendo a região tocada: `elevarTerreno`, `abaixarTerreno`, `aplainarTerreno` (também o Nivelar na altura), `suavizarTerreno`, `fazerPlato`, `fazerRampa`, `ruidoNoTerreno`, `erodirTerreno` (térmica, conserva o volume), `carimbarMorro`, `carimbarCratera`. Ruído de valor com hash inteiro e semente. |
| `receitas-de-terreno.ts` | `ReceitaDeTerrenoSchema` (Zod) e `aplicarReceitaDeTerreno`: plano, ilha, colinas e vale. Serve aos modelos prontos da aba e ao comando de intenção "gerar terreno por receita" do lote 9. |
| `pintura-de-chao.ts` | Até 8 camadas, um peso de 0 a 255 por camada e por amostra, soma sempre 255 (aritmética inteira). `pintarChao`, `pintarChaoPorRegras` (altura e declive), acrescentar e retirar camada, binário por peça (`codificarPecaDePintura`, `lerPecaDePintura`). Máscara de buracos por célula: `furarTerreno`, `pontoNoBuraco`, mapa de bits de 512 bytes por peça. |
| `png-de-alturas.ts` | `codificarPngDeAlturas` (cinza de 16 bits) e `lerPngDeAlturas` (cinza ou colorido, 8 ou 16 bits, sem paleta nem entrelaçamento, confere CRC e limita o tamanho descompactado). `imagemDoCampo` e `colocarImagemNoCampo` (estica qualquer imagem sobre o campo). Assíncronas: usam `CompressionStream`. |

Testes: `tests/terreno-esculpir.test.ts`, 16 testes. Incluem o ciclo real campo → peças binárias → base → `criarFonteDeAlturas`, a conservação dos bytes das peças não tocadas e as bordas coincidentes depois de uma pincelada na divisa.

### Como ligar (sugestão)

1. Gesto do pincel: `campoDaBase` uma vez ao abrir; a cada pincelada, chamar o pincel e unir as regiões (`unirRegioes`).
2. Fim do gesto: `pecasDaRegiao` → `amostrasDaPeca` → `codificarPecaDeAlturas` → envio do binário por hash → um comando que troca as referências de `base.pecas`. O desfazer só precisa das referências antigas; os binários são imutáveis.
3. `min` e `max` do campo são os da base. As ferramentas nunca gravam fora deles; ampliar o intervalo é regravar todas as peças.

### O que fica para o lote 4 propriamente dito

Esquema do documento para camadas de chão, pintura e buracos; comandos e inversão; envio e conferência das peças no servidor; malha, material e pincel no motor; painéis e copy da aba Terreno; mudança de tamanho e resolução do terreno; conversão do perfil do Arquipélago.

### Limites conhecidos

- A erosão é térmica (escorregamento por talude). Erosão hidráulica não foi feita.
- A pintura tem a resolução das alturas (uma amostra por vértice). Pintura mais fina que o relevo pediria outro formato.
- A máscara de buracos convive com `base.recortes` (polígonos importados); a união das duas formas de furo é decisão do lote 4.
- O leitor de PNG recusa paleta e entrelaçamento com mensagem clara, em vez de aceitar em silêncio.

## Lote 6 — Caminhos

| Arquivo | O que traz |
|---|---|
| `curvas.ts` | `medirCurva`, `suavizarCurva` (Catmull-Rom centrípeta, aberta ou fechada, passa pelos pontos de controle), `pontoNaCurva`, `reamostrarCurva`. `faixaDaCurva`: malha da trilha e da estrada deitada no relevo, com UV que não estica e faces para cima. `triangularPoligono` (praça e lâmina de lago; recusa polígono que se cruza). `distribuirNaCurva` (postes, lampiões) e `modulosNaCurva` (lances de cerca e muro que fecham exato, com giro e fator de comprimento). `moldarTerrenoPelaCurva`: a estrada que molda o terreno. `perfilDaPonte`: tabuleiro, vãos para os pilares e aviso quando o morro atravessa. Edição na cena: `trechoMaisProximo`, `inserirPontoNaCurva`, `removerPontoDaCurva`. |

Notas para quem ligar:

- `giroDaDirecao` alinha o **eixo X local** da peça à direção da curva, na convenção de rotação Y do motor, arredondado a 1e-6 rad. Se os módulos de cerca do acervo correm no eixo Z, somar um quarto de volta na chamada.
- `moldarTerrenoPelaCurva` copia a região envolvente da curva enquanto trabalha. Uma estrada em diagonal num terreno de 4096 × 4096 chega a duas cópias do campo; se isso pesar no navegador, dividir a curva em trechos.
- O `CaminhoSchema` de hoje só conhece `trilha` e `praca`, com `acabamento` e `largura`. Estrada, cerca, muro e ponte pedem tipos novos no documento; isso é do lote 6.

## Lote 5 — Água

| Arquivo | O que traz |
|---|---|
| `agua-do-terreno.ts` | `encherLago`: a partir do ponto tocado e do nível, alaga o que está ligado e abaixo dele; devolve margem simplificada (cabe no limite de pontos do documento), ilhas, área, volume, profundidade e o aviso `vaza` quando a água alcança a borda do terreno. `nivelDeTransbordo`: até onde a baixada enche e por onde sai (teto do controle de nível). `cavarRio`: leito que nunca sobe rio abaixo, lâmina de água em malha e lista de quedas para a cachoeira. `represar`: levanta a barragem (só sobe o chão) e enche atrás dela. `profundidadeDaAgua` para a área de nado. |

Notas para quem ligar:

- O mar é o mesmo `encherLago` tocado na borda do terreno no nível do mar: a margem externa é o retângulo do terreno e as ilhas são a terra firme.
- A margem do lago sai em coordenadas de mundo. O `AguaSchema` atual guarda `contorno` e `recorte` locais ao `centro`, com `giro` e `escala`; a conversão e os tipos `rio`, `represa` e `cachoeira` são do lote 5.
- `cavarRio` usa `moldarTerrenoPelaCurva` com `descer: true`. O rio altera o campo: a ordem "cavar, depois encher o lago da foz" importa.

Testes dos dois lotes: `tests/curvas-e-agua.test.ts`, 14 testes.

## Verificação desta entrega

`bun test` em `packages/molda-cenarios-core`: 101 testes, nenhuma falha (71 que já existiam e 30 novos). `tsc --noEmit` e Biome do pacote aprovados. Medição local num campo de 1024 × 1024 com passo de 1 m: pincelada de 20 m de raio em cerca de 1 ms, receita de ilha em 0,2 s, encher o mar em 70 ms, estrada ou rio de 1,2 km em 30 ms.

Não houve prova no navegador nem em staging: nada disto está ligado ao palco ou à oficina.
