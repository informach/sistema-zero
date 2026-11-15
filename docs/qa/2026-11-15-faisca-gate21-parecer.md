# Arquipélago Vagalume V2 — Parecer artístico do M3 / Gate 2

**Data da análise:** 15/11/2026  
**Referência de código e evidências:** `informach/sistema-zero`, branch `staging`, commit `a300c5f2e23bb888417baf29f3581e530f323aef`  
**Relatório consultado:** [`docs/qa/2026-11-15-faisca-m3-gate2.md`](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2.md)  
**Natureza:** parecer de direção de arte e level design; não é resultado de nova execução local, não altera código nem concede aceite artístico final.

## 1. Decisão executiva

**Gate 2 técnico: aceito como evidência de primeira passada jogável, nos limites dos ensaios apresentados. Gate 2 artístico: NÃO aprovado como cenário final.**

**Comparativo A/B:** selecionar **B como prova técnica preferencial dos módulos reais de caminho**, mas **não selecionar sua aparência atual** como linguagem aprovada para a Faísca. O **A** funciona como referência de integração suave com o terreno, porém é um tratamento de cor gerado por código e **não deve virar a arte final**. A próxima rodada deverá produzir uma **terceira solução de curadoria**, usando modelos existentes com implantação apropriada, considerando variantes de trilha/piso e transição ao terreno.

Os testes do relatório (2.119 aprovados, 1 pulado), travessias, retomada, toque e amostras de FPS demonstram avanço técnico. Não comprovam estética, legibilidade com crianças, sensação da animação com IK ou desempenho com todos os distritos e NPCs concluídos.

## 2. Escopo efetivamente examinado

- Leitura integral do relatório do Gate 2, dados de curadoria e JSONs de ritmo, percursos e recursos.
- Inspeção visual das quatro capturas A/B (dia/noite), da captura de travessia do B e dos **nove pares** de capturas antes/depois (porta, praça, Costa, oficina, Farol inteiro, subida, Farol à noite, ponte sul e ponte norte).
- Conferência de arquivos de implementação na `staging`: `src/mundo/faisca/pintura-do-solo.tsx`, `caminhos.tsx`, `ambiente.tsx`, `src/sistemas/assentamento-da-faisca.ts`, `implantacao-da-faisca.ts` e `prova-curadoria-faisca.ts`, relativos a `packages/arquipelago`.
- **Limite relevante:** os arquivos MP4 estão versionados e os registros JSON foram lidos, mas **não houve reprodução visual efetiva dos vídeos nesta revisão**. Portanto, **contato dos pés, IK, animação, conforto de câmera e cadência permanecem sem aceite perceptivo**; não se deve inventar observações de quadros não vistos.

## 3. Ensaios A/B — decisão de curadoria

| Critério | Ensaio A — faixa integrada ao terreno | Ensaio B — caminho modular do Reino |
|---|---|---|
| Origem visual | Pintura gerada por código sobre terreno | `caminho_terra_reto` + `caminho_terra_curvo` do catálogo |
| Coerência com exigência «usar a biblioteca» | Não é solução artística definitiva | Melhor como princípio de produção |
| Aspecto na captura | Faixa terrosa e relativamente discreta | Superfície laranja/salmão elevada, borda terminal rígida |
| Integração ao gramado | Visualmente melhor, mas sem materialidade e detalhe | Muito contrastante; parece plataforma/passarela colocada por cima |
| Encaixe e percorribilidade | Caminho sem piso modular próprio | Encaixes medidos e passagem verificada nos logs |
| Aceite | Não para arte final | **Aceitar tecnologia do ensaio, não a aparência final** |

**Problemas específicos do B vistos nas imagens:**
1. A cor saturada disputa atenção com o avatar, a casa e o lago, mas não está ligada a uma função narrativa relevante.
2. O perfil lateral de cerca de 0,12–0,15 m é claramente legível como placa elevada sobre o verde, em vez de trilha resultante do desgaste do chão.
3. As extremidades terminam bruscamente no gramado, sem entrada, transição ou conexão com uma praça.
4. A área ao redor continua pouco composta: a boa montagem das juntas não resolve o vazio da paisagem.
5. Na noite a diferença de cor e superfície persiste; não se transforma em caminho natural.

**Próxima prova de arte:** testar 2–3 alternativas do **acervo existente**, sem mudar o mapa de 520 m nem o controlador. Comparar peças térreas do Reino com `trilha_terra_reta/curva` do Faroeste e `caminho_lajes_reto/curvo` do Templo **apenas como candidatos de catálogo a validar**, sem pressupor compatibilidade de material ou estética. O Adventure Land permanece preferencial quando existir equivalente adequado; seus `caminho_01..04_pacote` são mais próximos de pedras/plataformas do que de terra contínua, logo podem enriquecer trechos especiais, mas não substituir automaticamente o piso de toda a Vila. Testar assentamento e transições, não simples mudança de cor.

**Uma exigência:** escolher um material de caminho e um conjunto de encaixes que permita construir trilhas com aparência nativa ao terreno, sem repetir a mesma faixa geométrica por toda a ilha. Não resolver com malha coplanar que volte a produzir z-fighting.

## 4. Avaliação da composição principal — antes e depois

### 4.1. Porta da Morada e Praça dos Criadores — melhora real, aceite pendente

**Preservar:** Farol inteiro legível desde a futura porta; moinho como marco secundário; caminhos mais suaves; poço de escala correta; bancos e pequenas áreas de solo de convívio; vegetação nas bordas; lote da Morada livre.

**Corrigir:** três construções quase idênticas ainda parecem cubos coloridos sem função; praça permanece uma área grande e aberta com pouco centro social; o poço fica visualmente secundário; a horta compete com a praça pela atenção. Diferenciar fachadas, acessos e usos com **peças já existentes**. Os objetos de carpintaria de referência não podem constituir acabamento definitivo. A primeira vista deve fazer criança reconhecer **pelo menos três direções** sem depender de etiqueta; isso ainda não foi demonstrado por teste humano.

**Prioridade: P0 visual.** Fazer uma vista do chão na altura/câmera normal do avatar e uma vista da porta com as três escolhas reconhecíveis, sem HUD técnico. Uma praça bonita não é apenas um centro com três estradas: precisa sugerir que há moradores, ofícios e acontecimentos.

### 4.2. Pátio / Oficina — a mensagem ainda está fraca

**Preservar:** barreira/lacre e caixas com selo do Rei, organizados como sinais ambientais de oficina interrompida.

**Corrigir:** o prédio se parece com uma das casas da Vila; poucos elementos contam que ali havia invenções. Melhorar identidade da frente, sinal de entrada, áreas de armazenamento de peças e o motivo visual para visitar, com objetos catalogados. Não mostrar máquinas reativadas antes da missão. Não presumir que o lacre provisório já cumpre o papel narrativo de `PROIBIDO` para uma criança.

**Prioridade: P0 de narrativa ambiental.** A oficina deve ser distinguível do correio a partir da trilha, sem legenda.

### 4.3. Campos e Ponte do Lago — funcional, mas ainda artificial

**Preservar:** `ponte_04_pacote`, colisão e origem já ensaiadas; acessos livres; grupos de árvores e vegetação usados para moldurar a vista; horta em região próxima.

**Corrigir:** o lago continua parecendo uma mancha lisa azul-esverdeada; as margens são pouco definidas; a ponte rosa parece apoiada sobre a mancha, sem explicação física/ambiental clara de cabeceiras. O depois melhora o solo perto das entradas e a disposição de rochas, mas não apresenta um sistema de margens e água convincente.

**Prioridade: P0 de integração.** Executar uma prova **isolada do lago** com modelos de margem e material de água do catálogo, mantendo sincronizados forma, colisores, superfície e nado. `lago_nadavel` do Reino é candidato catalogado, **não está integrado** e não pode ser apenas sobreposto. Verificar as duas entradas em fotos laterais e controlador em movimento.

### 4.4. Farol / Encosta — silhueta aprovada como direção, implantação ainda em progresso

**Preservar:** altura aproximada de 24 m, modelo Adventure Land, visibilidade integral na nova câmera de inspeção, hierarquia monumental, subida jogável e a correção de patamares no relevo físico e visual.

**Corrigir:** os volumes dos seis compartimentos são protótipos muito crus; a base escura do Farol encontra um patamar terroso sem elementos suficientes para transmitir um lugar de grande conquista; mirantes e vistas panorâmicas não estão materializados. A montanha exterior ao fundo é grande e simples, não precisa ser alterada no M3, mas não confundir com paisagem final.

**Prioridade: P1 do M3 (sem abrir campanha).** Compor área de chegada, mirante/pausa e contorno de implantação, validando a câmera e alcance do avatar. O acabamento de Núcleos continua fora deste marco.

### 4.5. Entrada da Costa — sinaliza saída, não um destino ainda

**Preservar:** abertura na cerca, vista do mar e saída franca do coração habitado.

**Corrigir:** a paisagem ainda é praticamente gramado, uma placa, uma cerca e água distante. Diferenciar imediatamente o início da Costa com vegetação, marcos costeiros e chão coerentes, usando modelos da biblioteca. Não é necessário terminar píer e enseadas agora.

**Prioridade: P1:** terceira escolha visualmente distinta a partir da praça.

### 4.6. Noite — legibilidade insuficientemente demonstrada

O Farol permanece luminoso, mas o conjunto parece ter apenas uma redução geral de luz. Ainda é necessário comprovar orientação nos cruzamentos, iluminação nos lugares de permanência e leitura de bordas de caminho e água. Não criar decoração luminosa descontrolada; aproveitar peças de luz existentes e o papel narrativo do Farol, Zappy e lanternas.

## 5. Problema de aderência à direção artística «usar os pacotes»

A revisão do código da `staging` confirma que:
- O caminho A e as faixas da cena principal ainda derivam de `pintura-do-solo.tsx` (textura de 2048² criada programaticamente). Foi útil para remover a sobreposição e o z-fighting do protótipo, mas não corresponde a uma solução de arte de catálogo final.
- `ambiente.tsx` ainda monta bancos, Quadro, lacre e apoios com blocos geométricos coloridos. O relatório os nomeia como carpintaria de referência, não acabamento. Manter essa honestidade de escopo.
- `prova-curadoria-faisca.ts` testa uma bancada separada de ~26,5 m, com módulos do Reino. Não é substituição concluída do percurso Praça–Horta.
- A água da Ponte dos Campos ainda é provisória, e o lago completo de catálogo foi somente auditado.

**Diretriz vinculante:** priorizar arte Adventure Land quando adequada; depois outras coleções existentes; justificar cada exceção. Nenhuma geometria gerada por código deve ser promovida silenciosamente a **arte final de chão, água, trilhas ou mobiliário**. Geometria de suporte para física, streaming e testes pode permanecer quando necessária, desde que não seja confundida com apresentação artística aprovada.

## 6. Movimento, testes e desempenho — o que podemos afirmar

**Confirmado no relatório/logs:**
- 2.119 testes passaram, 1 teste de integração Postgres foi pulado.
- Percursos em `curadoria-caminho-real.json` e `curadoria.json` indicam travessia dos nós do B, com `y` em torno de 4,64 m; isso não prova beleza do encaixe.
- `evidencias-ponte.json` documenta passagem e retorno entre margens.
- `evidencias-cobre.json` registra retorno/retomada.
- No desktop de ensaio: 58–60 FPS perto da praça, aproximadamente 85–87 chamadas e ~143 mil triângulos; três ciclos próximos com 119/118/119 geometrias e 42 texturas estáveis.
- Os 8 vídeos MP4 estão no repositório; registros e metadados foram consultados, mas não se assistiu aos quadros nesta avaliação.

**Não comprovado:** qualidade do IK, patinação dos pés, conforto de câmera em curvas, animações por perfil, uso de patins, usabilidade da mochila, desempenho com todos os modelos previstos, validação com crianças e aparelhos reais.

## 7. Próximo recorte recomendado: M3-Gate 2.1 / Fechamento da gramática ambiental

**P0 — bloqueadores artísticos antes da expansão**

1. **Curadoria de caminhos:** apresentar 2–3 opções do acervo real, com teste de caminho **implantado** num trecho de 20–30 m que se conecta a piso de praça/grama, fotos em câmera normal, lateral baixa e noite. Não aceitar placa salmão terminando abruptamente, nem pintura lisa como resultado final.
2. **Água e lago:** escolher a geometria/material de catálogo e comparar água, margem, solo, colisor e nado juntos; não duplicar superfície.
3. **Praça e oficina:** distinguir os edifícios por função/arquitetura; centro de convívio mais definido; reduzir dependência visual de cubos genéricos; preservar as três saídas e lote da Morada.
4. **QA de arte:** inspeção junto ao solo de cada encaixe, duas direções por ponte, rotação de câmera, dia/noite, ausência de objeto flutuante e z-fighting **observado em movimento**, não apenas inferido de código.

**P1 — depois de fixar a linguagem**

5. Entrada da Costa e subida do Farol com transição de materiais e marcadores próprios.
6. Íris (figurino, gestos e rotina) no sistema atual de NPC, sem reescrever controlador.
7. Avaliação perceptiva em vídeos de IK/ritmo com quadro assistido; só então escolher entre perfil Exploração, Referência e Ágil. Não ajustar velocidade por foto ou por tempo isolado.
8. Equipamentos: patins e mochila continuam como estudo separado, usando contratos existentes; não antecipar concessão de recompensas em conta real.

### Critérios de aceite para Gate 2.1

- [ ] Pelo menos um **caminho** de catálogo aprovado artisticamente em trecho integrado ao terreno e percorrível, de dia e à noite.
- [ ] Nenhuma extremidade aparece como bloco/placa sem encontro com o solo; não há disputa de profundidade em câmera em movimento.
- [ ] Lago e ponte formam um conjunto paisagístico compreensível, com geometria visual e física coerentes.
- [ ] A partir da porta e da praça, os três destinos são distinguíveis sem o mapa técnico.
- [ ] Correio, oficina e vizinhos são visualmente identificáveis sem serem a mesma caixa genérica diferenciada só por cor.
- [ ] Os arquivos do catálogo são rastreados por origem e ID, e os novos testes preservam a base técnica da `staging`.
- [ ] Entregar vídeo visualmente inspecionável para avaliação do movimento, sem substituir verificação humana por log.
- [ ] Nada do M3 é publicado como campanha nem como final de direção de arte antes do aceite humano.

## 8. Encaminhamento para a sessão de implementação

**Decisão autorizada:** continuar a partir da `staging`, **sem redesenhar macrogeografia ou controladores**. O B autoriza **a técnica de montagem com módulos de catálogo**; não autoriza espalhar o caminho cor salmão por toda a Faísca. Produzir variantes artísticas com peças existentes e submeter imagens/vídeos do **trecho realmente integrado** antes de fazer substituição geral. Manter A apenas como comparativo transitório. Retornar com um pacote de evidências específico para o aceite do Gate 2.1; não confundir aceite de testes com aceite de direção de arte.

**Arquivos e capturas consultados:**
- [Relatório M3 Gate 2](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2.md)
- [Ensaio A — dia](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2/curadoria/a-dia.png)
- [Ensaio B — dia](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2/curadoria/b-dia.png)
- [Ensaio B — travessia](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2/curadoria/travessia.png)
- [Comparação da praça](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2/depois/praca.png)
- [Ponte sul após M3](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2/depois/ponte-sul.png)
- [Oficina após M3](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2/depois/oficina.png)
- [Código dos modelos A/B](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/src/sistemas/prova-curadoria-faisca.ts)
- [Código do acabamento de solo atual](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/src/mundo/faisca/pintura-do-solo.tsx)
