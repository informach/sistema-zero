# Mixamo por dentro, e o que o Molda pode fazer igual (ou melhor)

Data: 31/10/2026 · Escopo: oficina 3D do Molda, aba Animar e Ossos e pesos

## Resumo

O Mixamo não tem mágica em cada animação. Ele tem **um esqueleto padrão único**, e todo o
resto encaixa nele: o auto-rig só ajusta esse esqueleto ao corpo enviado, e as milhares de
animações, feitas uma vez para esse esqueleto, servem para qualquer personagem. Os parâmetros
de cada animação (velocidade, braços afastados, no lugar, espelhar) consertam o que o encaixe
deixa errado.

O Molda já tem as peças principais dessa ideia:
- um esqueleto padrão reconhecido pela forma;
- ossos colocados sozinhos pela silhueta, onde o Mixamo ainda pede marcadores;
- um clique que aplica o movimento;
- movimentos editáveis na linha do tempo, coisa que o Mixamo não oferece.

**O que falta é escala e acabamento:**
- os movimentos ainda são 4 geradores escritos em código, e não dados;
- faltam os ajustes que evitam defeitos (braços atravessando o corpo, pés escorregando);
- o personagem ainda não sai pronto para outros programas.

**Recomendação:** quatro fases, nesta ordem:
1. acabamento do que já existe;
2. movimentos como dados, com retarget;
3. qualidade dos ossos e dos pesos;
4. saída para jogos.

A fase 1 é pequena e resolve os defeitos que já apareceram nos testes (pés flutuando,
escorregando).

---

## 1. Como o Mixamo funciona

Legenda: **[doc]** = descrito pela Adobe ou por fontes consistentes; **[dedução]** = inferido do
comportamento e da estrutura dos arquivos, sem confirmação oficial.

### 1.1 O fluxo em quatro passos

| Passo | O que a pessoa vê | O que acontece por trás |
|---|---|---|
| **1. Enviar** | Sobe FBX, OBJ ou ZIP (OBJ + MTL + texturas). Pede o personagem de frente, em pose T ou A. | **[doc]** Formatos e pose. Os limites de tamanho e polígonos variam conforme a fonte e a época (de 20 a 40 MB nos relatos; malhas pesadas falham). Acessórios soltos (cabelo, chifres) atrapalham. |
| **2. Auto-rig** | **Se o arquivo já vem com ossos**, não há este passo: o Mixamo aproveita o esqueleto e a pessoa vai direto para as animações. Esse é o caminho mais comum com personagens prontos, e foi o que vivemos no teste. **Sem ossos**, ela arrasta marcadores sobre a vista de frente (queixo, virilha, pulsos, cotovelos e joelhos, com opção de simetria) e escolhe o nível de detalhe do esqueleto (com ou sem dedos). | **[doc]** Os marcadores e a simetria. Esqueleto já existente é mapeado automaticamente, e quando não dá aparece "unable to map your existing skeleton". **[dedução]** Com os marcadores, encaixa o esqueleto padrão nas proporções do corpo; o resto (coluna, ombros, pés) sai de proporção e da forma da malha. Os pesos são calculados automaticamente; o método não é público. |
| **3. Animações** | Biblioteca enorme de capturas de movimento, com busca e categorias. Clicar já aplica a animação **no próprio personagem**: **sai a anterior e entra a nova**, uma por vez. *In Place* tira o deslocamento, para o personagem andar sem sair do lugar. Cada animação tem seus controles: *Overdrive*, *Character Arm-Space*, *In Place*, *Mirror*, *Trim*. | **[doc]** Os controles existem e variam conforme a animação. Segundo um moderador, só cerca de metade das animações tem *In Place*. **[dedução]** As animações estão gravadas no esqueleto padrão (nomes `mixamorig:Hips`, `Spine`, `Spine1`…). Aplicar uma animação é só transferir giros de osso para osso, mais a escala do quadril. *Arm-Space* existe porque o retarget não sabe o volume do corpo e os braços atravessam o tronco. |
| **4. Baixar** | FBX ou DAE, *With Skin* / *Without Skin*, quadros por segundo e *Keyframe Reduction*. Pacotes de animações. | **[doc]** *With Skin* leva malha, esqueleto e animação; *Without Skin* leva só a animação, e basta a malha no primeiro arquivo. Reduzir chaves deixa o arquivo menor, mas pode tirar precisão. |

### 1.2 Por que funciona (o segredo)

1. **Um contrato só: o esqueleto padrão.** Toda animação é feita uma vez e serve para qualquer
   personagem. O custo de cada animação nova é fixo; não aumenta com o número de personagens.
2. **Poucos pontos humanos, e o resto por proporção.** São cinco tipos de marcador que qualquer
   pessoa entende. Simetria corta o trabalho pela metade.
3. **Zero preparação e troca na hora.** Com ossos no arquivo, é só enviar e clicar. Cada
   clique troca a animação do personagem (a anterior sai). O retorno é imediato e o custo de
   errar é zero.
4. **Controles que consertam o retarget.** *Arm-Space* (braço atravessando o corpo), *In Place*
   (o jogo controla o deslocamento) e *Mirror* (trocar o lado) são remendos genéricos que
   funcionam em qualquer animação.
5. **Biblioteca grande.** É o maior trunfo do Mixamo, e o mais caro de copiar: são capturas de
   movimento de atores.

### 1.3 Onde o Mixamo falha (e o Molda não deve copiar)

- **Só humanoides.** Não dá para pular marcadores. Personagens sem pernas ou sem braços não
  servem.
- **Depende de servidor e de conta Adobe.** Relatos de 2025 e 2026 falam de instabilidade,
  mas a fonte é um concorrente; vale conferir.
- **Falha opaca.** "Coloque todos os marcadores" sem dizer o porquê, e travamentos com
  acessórios.
- **Termina no download.** Para editar uma pose, é preciso levar o arquivo para outro
  programa.

---

## 2. Onde o Molda está hoje

| Peça do Mixamo | Molda hoje | Situação |
|---|---|---|
| Esqueleto padrão | 19 ossos que dobram e 5 pontas (`characterRig.ts`), reconhecido pela **forma** da hierarquia: renomear não quebra | ✅ igual na ideia |
| Marcadores | 5 pontos com espelho (8 sem). **E automático**: `guessCharacterMarks` acha os 5 na silhueta; se não der, pede a marcação | ✅ melhor no caminho feliz |
| Pesos | Cada ponto segue o osso mais perto e só mistura perto das juntas | 🟡 bom para personagens de peças, fraco para malha única |
| Animações | 4 geradores em código: Parado, Andando, Correndo, Pulando | 🔴 pouca variedade, e crescer exige programar |
| Ver no personagem | Um clique aplica e toca; a anterior para e a nova entra, e as poses vão para a linha do tempo | ✅ igual na hora, e dá para editar depois |
| Uma por vez × várias | O Mixamo guarda **uma** animação por vez (cada uma é baixada separada). O Molda **guarda cada movimento clicado** na lista (Parado, Andando…), porque o jogo precisa de vários no mesmo personagem | 🟡 escolha de produto (ver decisões) |
| *In Place* | Todo movimento do Molda é no lugar; não existe a opção de deslocar | 🔴 falta o interruptor |
| Controles | Velocidade, Intensidade | 🟡 faltam braços afastados, espelhar, recortar, no lugar/andando |
| Pés no chão | Parado com pés plantados (cinemática inversa); Andando e Correndo só com ajuste de altura | 🟡 pés ainda escorregam ao andar |
| Baixar | GLB com peças, pintura, ossos, pesos e movimentos; o Jogo 3D usa | 🟡 sem nomes padrão de outros programas e sem "só a animação" |

**Vantagem do Molda que vale proteger:** os personagens das crianças são feitos de **peças**.
Uma peça que segue um osso só, sem amassar, é exatamente o que um boneco de blocos pede. Essa é
uma qualidade, não uma falha a corrigir.

---

## 3. Proposta

### Princípios

- **Um clique continua sendo o caminho padrão.** Os controles ficam à mostra, mas nada é
  obrigatório.
- **O esqueleto padrão é o contrato.** Todo movimento novo é escrito para ele, nunca para um
  personagem específico.
- **Movimentos são dados, não código.** Para crescer de 4 para 40 movimentos, não pode ser
  preciso programar.
- **Tudo continua editável.** Um movimento pronto vira poses na linha do tempo, como já
  acontece.
- **Plano B sempre explicado.** Quando o automático não dá, o Molda diz o porquê e oferece o
  passo manual.

### Fase 1 — Acabamento (pequena; resolve defeitos já vistos)

0. **Interruptor "No lugar"**, como o *In Place* do Mixamo, ligado por padrão.
   - Desligado, Andando e Correndo levam o personagem para a frente no ritmo dos passos:
     comprimento da passada × passos por ciclo, na trilha do quadril.
   - Com isso, os pés plantados ficam exatos, porque o corpo anda e o pé apoiado não sai do
     lugar.
1. **Pés plantados em Andando e Correndo.** Mesma técnica do Parado, aplicada só na fase em
   que o pé está apoiado (travar o pé). Hoje os pés escorregam no chão.
2. **Braços afastados**, equivalente ao *Arm-Space*. Hoje os braços caem num ângulo fixo de 12°
   (`hang`).
   - Calcular o ângulo de cada personagem pela largura do tronco que a silhueta já mede, para o
     braço não atravessar o corpo.
   - Dar um controle "Braços: junto ↔ afastado".
3. **Espelhar.** Trocar esquerda e direita num movimento, útil para os que não são simétricos
   (acenar com a outra mão).
4. **Conferência depois do auto-rig.** Avisar quando uma peça ficou sem osso, ou quando o
   braço atravessa o tronco na pose de repouso. Hoje o aviso só existe quando o rig falha por
   completo.

### Fase 2 — Biblioteca como dados (média; é o que dá escala)

1. **Formato de movimento padrão.** Giros por papel de osso (quadril, coxa esquerda…) no espaço
   do personagem, mais a trilha do quadril medida em "comprimentos de perna".
   - É o formato que `createCharacterMotion` já usa por dentro (`Pose` e `Frame`), só que
     guardado num arquivo em vez de calculado.
   - Os 4 geradores atuais passam a produzir esse formato.
2. **Retarget.** Aplicar um movimento padrão a qualquer esqueleto com as peças que já existem:
   - `local()` faz a troca de espaço;
   - `hang` corrige a pose de repouso;
   - o contato com o chão faz a altura;
   - os pés plantados evitam escorregar.
3. **De onde vêm os movimentos novos**, por ordem de custo:
   - **"Guardar como movimento pronto".** Uma animação feita à mão na linha do tempo vira um
     movimento padrão que serve em qualquer personagem. As crianças criam e trocam movimentos
     entre si, coisa que o Mixamo não tem.
   - **Captura de movimento aberta**, como o banco da CMU, convertida para o formato padrão.
     ⚠️ Conferir a licença antes de usar.
   - ⚠️ **Não usar animações do Mixamo como fonte da biblioteca.** Os termos da Adobe permitem
     usá-las em projetos, não redistribuí-las como animações soltas. Isso também precisa ser
     conferido com o jurídico.
4. **Galeria.**
   - Categorias infantis: Andar e correr, Brincar, Dançar, Emoções, Esportes.
   - Busca.
   - Miniatura animada num boneco padrão do Molda (o "Y Bot" do Molda).
5. **Controles declarados no próprio movimento**, como no Mixamo: cada um diz quais controles
   tem. Por exemplo, "altura do pulo" só no Pulando.

### Fase 3 — Qualidade dos ossos (média)

1. **Pesos por difusão de calor** (o método do Pinocchio, também usado no Blender) para malhas
   inteiras, como um personagem importado de outro programa. Personagens de peças continuam com
   uma peça para um osso.
2. **Níveis de detalhe**, como o Mixamo: "sem dedos" como padrão para crianças, e "mão com
   dedos" opcional no perfil avançado.
3. **Silhueta mais esperta.** Usar também a vista de lado (profundidade dos joelhos e dos pés) e
   aceitar braços levemente colados, recuando para a marcação só quando não houver jeito.
   Aprendizado de máquina (como RigNet e HumanRig) fica para depois: é pesado para rodar no
   navegador, e os personagens de peças não precisam.

### Fase 4 — Saída para jogos (pequena a média)

1. **Pacote de movimentos.** Baixar só os movimentos ("sem o boneco") para um personagem que
   já está no jogo, como o *Without Skin*. O bloco do Jogo 3D toca pelo nome ("tocar
   Andando").
2. **Nomes compatíveis.** Opção de exportar o GLB com nomes de osso no padrão Mixamo
   (`mixamorig:Hips`…). Assim o personagem do Molda recebe animações do Mixamo, da Unity ou do
   Godot em outros programas. Combina com o perfil Pro.
3. **Redução de chaves.** Hoje gravamos de 16 a 36 poses por ciclo em todo osso; tirar as que
   não mudam diminui o arquivo.

---

## 4. Decisões para o produto

1. **De onde vem a biblioteca?**
   - Recomendação: começar por "Guardar como movimento pronto" (custo zero, e vira conteúdo
     das próprias crianças).
   - Depois, poucos movimentos de captura aberta, com a licença conferida.
2. **Quantos movimentos na primeira leva?**
   - Recomendação: de 12 a 15, cobrindo o que os jogos do Estúdio usam: parado, andar,
     correr, pular, cair, acenar, comemorar, dançar, sentar, empurrar, apanhar e atacar
     (de leve).
3. **"Nomes compatíveis"** entram só no Pro, ou para todos?
4. **Uma por vez ou várias?**
   - Recomendação: manter várias, porque o jogo usa Parado, Andando e Correndo no mesmo
     personagem. O clique já troca na hora, como no Mixamo.
   - Se a lista crescer demais, um modo "experimentar" que substitui o último movimento não
     guardado.

## 5. Próximo passo sugerido

Fase 1, itens 0 e 1 juntos: o interruptor "No lugar" e os pés plantados em Andando e Correndo.
- Os dois usam a mesma conta (o pé apoiado fica parado no mundo).
- Os pés escorregando são o defeito mais visível hoje, e a técnica do Parado já está pronta.
- Depois vem "Braços afastados", que usa a largura do tronco que a silhueta já mede.

---

## Fontes

- Adobe — [Upload and rig 3D characters with Mixamo](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html) (formatos aceitos; a página bloqueou a leitura automática)
- CG Channel — [Mixamo makes Auto-Rigger free for low-poly meshes (2012)](https://www.cgchannel.com/2012/06/mixamo-makes-auto-rigger-free-for-low-poly-meshes) (marcadores, pose T)
- Comunidade Adobe — [marcadores não reconhecidos](https://community.adobe.com/t5/mixamo-discussions/mixamo-doesn-t-think-i-placed-the-markers-on-my-model/m-p/12215400), [erro "place all markers"](https://community.adobe.com/t5/mixamo-discussions/mixamo-place-all-markers-on-character-error/m-p/14167779), [personagem sem braços ou joelhos](https://community.adobe.com/t5/mixamo-discussions/almost-no-arms-no-knees-would-still-like-it-rigged/m-p/12762567)
- Comunidade Adobe — [esqueleto já existente que não deu para mapear](https://community.adobe.com/t5/mixamo-discussions/sorry-unable-to-map-your-existing-skeleton-job-failed-w-unknown-error/m-p/13358320)
- Comunidade Adobe — [como funciona o Overdrive](https://community.adobe.com/t5/mixamo-discussions/how-does-the-overdrive-parameter-work/m-p/11479519), [Arm Space em pacotes de locomoção](https://community.adobe.com/t5/mixamo-discussions/adjusting-arm-space-for-locomotion-packs-mixamo/td-p/12617130), [Arm Space volta ao baixar](https://community.adobe.com/t5/mixamo-discussions/animation-reset-when-downloaded/m-p/15083437)
- [mixamo-mcp](https://www.remoteopenclaw.com/mcp/V1xel/mixamo-mcp) (lista de controles: in place, mirror, overdrive, arm-space, trim)
- Animancer — [guia Mixamo](https://kybernetik.com.au/animancer/docs/manual/getting/mixamo); Packt — [Downloading the Mixamo animation](https://packtpub.com/en-gb/product/reimagining-characters-with-unreal-engines-metahuman-creator-9781801817721/chapter/chapter-5-retargeting-animations-with-mixamo-7/section/downloading-the-mixamo-animation-ch07lvl1sec36) (With/Without Skin, quadros por segundo, redução de chaves)
- Lenovo — [What is Mixamo?](https://www.lenovo.com/us/en/glossary/mixamo/index.html) (pose T/A)
- Nomes de osso — [mapa Mixamo ↔ VRM](https://huggingface.co/spaces/AIbee999/CharacterGen_test/blob/604b72580a799f334d82bcc49c9075dce80694f4/render_script/three-js/src/mixamoVRMRigMap.js), [problema ao reenviar personagem já com ossos](https://community.adobe.com/t5/mixamo-discussions/problem-with-uploading-already-rigged-characters/m-p/15543608)
- Pesquisa em auto-rig — [Pinocchio (MIT CSAIL)](https://publications.csail.mit.edu/abstracts/abstracts07/ibaran/ibaran.html), [RigNet](https://github.com/zhan-xu/RigNet), [HumanRig](https://ar5iv.labs.arxiv.org/html/2412.02317), [RigAnything](https://arxiv.org/html/2502.09615v2)
- Instabilidade recente (fonte de concorrente, conferir) — [Sorceress](https://sorceress.games/blog/replace-the-mixamo-auto-rig-browser-no-adobe-id)
