# Full review da Morada — 14/11/2026

**Atualização após autorização de correção:** os seis achados foram reparados. Evidências e escopo em `docs/plans/2026-11-14-morada-reparos.md`. As descrições abaixo preservam o diagnóstico anterior às correções.

Revisão da implementação local da migração: contrato/catálogo, leitura e CAS do Members, conversão de dados, rotas privadas de recursos, editor compartilhado Kids/adulto, cena nativa do jogo, interações, descanso, colisões e pets. Esta rodada não altera o código da aplicação nem publica recursos ou migrações.

## Achados confirmados

### 1. [P2] A chegada segura ignora colisões por malha

**Local:** `packages/arquipelago/src/mundo/morada.tsx:420–452`; volumes em `packages/arquipelago/src/sistemas/morada.ts:153–170`.

`safeMoradaSpawn` consulta exclusivamente `moradaBoxes`, que representa `piece.colliders`. Existem peças com colisão física exclusivamente em `collisionMeshes`. Colocar uma delas sobre a chegada é aceito, mas o avatar nasce intersectando a malha real. A análise de acesso também ignora essas malhas.

**Reprodução:** casa com a peça real `moveis/natal/parede_biscoito_lateral_janela_pacote` em `[0,0,4]`. `validateMoradaHouse` retorna zero erros e `moradaAccess` retorna `true`. A chegada escolhida é `[0,0.545985,4]`; o Rapier detecta uma interseção entre a cápsula real do avatar e o colisor extraído do GLB privado. A colisão acompanha a peça corretamente; o defeito está em escolher esse ponto como livre.

**Recomendação:** escolher a chegada por consulta ao mundo físico depois que as colisões estiverem carregadas, com alternativas fora das malhas. A validação de acesso precisa representar essas peças também. Investigação reproduzível em `.tmp/morada-spawn-review.ts`.

### 2. [P2] O novo personagem não atende os comandos de interação e câmera existentes

**Local:** `packages/arquipelago/src/mundo/morada.tsx:492–515`; seleção em `packages/arquipelago/src/interface/morada.tsx:202–216`.

O teclado e o gamepad continuam emitindo `controle.usar`, `cameraX`, `cameraY` e `recentrar`, mas `NativeActor` não os consome. As interações da casa dependem de clicar no objeto; elas não entram no registro de proximidade usado pelo personagem anterior. A câmera usa apenas `OrbitControls`. O personagem e a câmera antigos ficam sem renderização enquanto a casa está aberta.

**Impacto:** E/botão Usar não abrem os objetos da casa; o analógico direito e o comando de recentralizar não movem a câmera. O jogador que usa controle precisa recorrer ao ponteiro para essas ações.

**Evidência:** no navegador, com `cameraX=1`, `cameraY=1` e incremento de `recentrar`, o azimute permaneceu exatamente `0.5880026035475675` após 900 ms. A ausência do consumidor de `usar` foi conferida no fluxo do ator e dos objetos.

**Recomendação:** integrar o ator nativo ao contrato de controles e ao registro de interações existentes, incluindo as partes móveis dos objetos.

### 3. [P2] Sentar e deitar recuperam energia mantendo o avatar em pé

**Local:** `packages/arquipelago/src/mundo/morada.tsx:496–504`; botões em `packages/arquipelago/src/interface/morada.tsx:743–786`.

Os botões definem somente `descanso`, sem guardar o objeto escolhido ou seu ponto de assento/cama. O ator apenas zera a velocidade e retorna; não se posiciona no móvel e não envia `sentar`/`deitar` para a locomocação. Os clipes correspondentes já existem no motor de animação.

**Evidência:** no ator real do navegador, definir `descanso='sentar'` manteve a posição do corpo e `moving.especial=null`. O teste de descanso existente passa porque verifica o relógio de energia e as saídas do estado, sem montar o ator 3D.

**Recomendação:** guardar instância e ponto autoral selecionados, posicionar corpo/desenho conforme esse ponto e alimentar o estado especial da animação; liberar o vínculo ao levantar, retirar ou mover o móvel.

### 4. [P2] A casa continua simulando movimento durante conflito de salvamento do jogo

**Local:** `packages/arquipelago/src/mundo/morada.tsx:102–109`.

A nova guarda `blocked` não inclui `salvamentoPausado(s.salvamentoSituacao)`, embora a cena anterior e as operações de construção respeitem esse bloqueio. Se a conciliação aparecer com uma tecla já pressionada, o corpo continua andando durante a interrupção.

**Reprodução no navegador:** segurar D dentro da casa e mudar o estado do salvamento para `conflito`. Em 900 ms, a posição passou de aproximadamente `(0.067,0.461,3.955)` para `(0.516,0.461,3.656)`, mantendo `status='conflito'`.

**Recomendação:** reutilizar a guarda comum de pausa, normalizando apenas o painel da casa, e congelar física/animação durante os mesmos estados de conciliação do restante do jogo.

### 5. [P2] O modo foto ficou indisponível dentro da casa

**Local:** `packages/arquipelago/src/sistemas/modo-foto.ts:34–35`; entrada em `packages/arquipelago/src/estado/morada.ts:276–277`.

A casa permanece aberta com `painelAberto='casa-morada'`. `podeEntrarNaFoto` usa `jogoPausado`, que considera qualquer painel uma interrupção. Assim, a foto fica desabilitada durante toda a exploração da casa, inclusive fora do editor. O atalho F usa a mesma autorização. O capturador existente também permanece registrado no Canvas da ilha.

**Evidência:** entrada pelo portal no playground e consulta ao botão real `Modo foto`: `disabled=true`.

**Recomendação:** autorizar foto na casa em modo Viver e registrar a captura do Canvas ativo. Somente liberar o botão capturaria a cena errada e não resolve a integração.

### 6. [P2] O editor do quarto esconde encaixes válidos para peças giradas

**Local:** `packages/member-shell/src/components/cosmetics/room/morada-editor-model.ts:73–76`; aplicação em `morada-room-builder.tsx:446–450`.

`moradaSurfaceOptions` compara as dimensões originais XYZ, ignorando a rotação da instância. Além disso, selecionar um apoio força a rotação para zero. Isso impede arranjos que o contrato canônico aceita.

**Reprodução com catálogo real:** a prateleira `moveis/banheiro/prateleira_madeira_escura` mede aproximadamente `0.46 × 0.098 × 0.14 m`. Girada 90°, cabe no `slot_aberta_1` do `moveis/armarios/guarda_roupa_correr_espelho_verde`, de `0.39 × 0.30 × 0.585 m`. O validador aceita a instância apoiada sem erros, mas a opção não aparece na interface. A prateleira de vidro/cromo reproduz a mesma falha.

**Recomendação:** compartilhar o cálculo de dimensões giradas com o validador e preservar a orientação que tornou o encaixe válido. Afeta Kids e adulto, que usam o mesmo editor. Investigação em `.tmp/morada-full-review.ts`.

## Verificação desta rodada

- Jogo: **38 testes passaram, zero falhas**, em oito arquivos direcionados: autoridade, contrato real do Members, colisão, descanso, locomocação, coleções, pets e regras da casa.
- Core, Members e editor/rotas compartilhados: **21 testes passaram, zero falhas**, em quatro arquivos.
- Reprodução com GLB privado e Rapier real para a chegada; reprodução com peças/slots reais para os encaixes.
- Navegador com o jogo local para foto, câmera, estado de descanso e movimento durante conflito. Para observar referências internas, a resposta JavaScript foi instrumentada somente no contexto descartável do navegador; nenhum arquivo da aplicação foi alterado.

Esses resultados não equivalem à execução de todas as suítes do monorepositório. Esta rodada não refez builds completos, testes SQL, aplicação de migração em bancos da aplicação ou upload ao R2. A inspeção de interfaces concentra-se nos fluxos da Morada; não certifica todos os estados visuais das duas comunidades.

Os seis itens são falhas adicionais ou lacunas remanescentes. As suítes direcionadas dos reparos anteriores continuam passando; isso não substitui a cobertura 3D e de controles dos casos acima. Não foi confirmado um novo achado P0/P1 nesta rodada.
