# Faísca M3 — primeira passada jogável

> Execução inline com `executing-plans`, autorizada pelo aceite do Gate 1 com ajustes. Cada etapa entrega evidência conferível. Nenhum novo aceite intermediário é necessário dentro deste recorte.

**Goal:** compor a praça e três saídas, os dois percursos piloto, margens da ponte e chegada ao Farol, com comparativos reproduzíveis e regressão técnica.

**Architecture:** manter macrogeografia, setores, controlador, câmera de jogo e manifesto de 23 modelos. Preparar três patamares locais no mesmo relevo usado pelo renderer/Rapier; acabamento no material do terreno, sem planos paralelos. Dados compartilhados de implantação, bases e colisores; instâncias para vegetação e objetos. Câmeras fixas existem somente no playground e são idênticas no antes/depois.

**Tech Stack:** Bun, TypeScript, Three.js, R3F, Rapier, Playwright existentes.

**Spec:** `docs/plans/2026-11-15-faisca-m3-composicao-design.md`, com aceite/ajustes do usuário em 15/11/2026.

**Complemento durante a execução:** `docs/plans/2026-11-15-faisca-patins-mochila-qualidade.md`. Prioridade da composição mantida; patins e mochila são recorte de estudo/protótipo separado, com preservação dos contratos existentes. Nenhum aceite visual automático.

## Restrições

- Conferir `staging` antes do trabalho; entregar código e evidências commitados em `staging`, com push para a coordenação.
- Costa: compor o início da descida como terceira escolha, sem finalizar a costa inteira.
- Poço, Quadro e descanso: volumes fora do eixo porta–praça–Farol e da faixa de caminhada.
- Posição da futura porta permanece `(0,150)`; lote de 24 × 24 m preservado. Sem integrar a Morada.
- Distinguir correio/oficina por função. Oficina permanece lacrada, com projetos interrompidos; não simular a Missão do Núcleo concluída.
- Não mudar velocidades, cálculo dos tempos, avatar nativo, motor de física, macrogeografia ou sistemas de NPC. A orientação posterior de qualidade autorizou tratamento local de implantação: correio, vizinho leste e moinho recebem patamares graduados com transição de 6 m, preservando a mesma malha/altura para física e desenho.
- Íris completa e acessórios continuam pendentes; não bloqueiam composição ambiental.
- Capturas e vídeos são evidências; não concedem aceite perceptivo ou certificação em aparelho físico.

## 1. Instrumentar comparativos e registrar antes

Arquivos: `playground/faisca-vistas.tsx`, entrada `playground/arquipelago-macro.tsx`, `playground/verificar-faisca-gate2-browser.mjs`.

- [x] Declarar câmeras nomeadas de porta, praça, Costa, oficina, Farol inteiro, subida e duas cabeceiras. FOV 55°, resolução 1280 × 800, mesma iluminação nos dois momentos.
- [x] `?vista=<nome>` posiciona o avatar pela física real e fixa câmera somente para fotografia; ocultar apenas ferramentas de QA. Não persistir esse posicionamento no ensaio do usuário.
- [x] Capturar o antes, com manifesto e métricas de enquadramento, antes de modificar o ambiente. Separar fotos técnicas de câmera normal em movimento.

## 2. Implantar superfícies, volumes e arte existente

Arquivos: `src/sistemas/implantacao-da-faisca.ts`, `src/mundo/faisca/ambiente.tsx`, `src/mundo/faisca/caminhos.tsx`, `src/sistemas/composicao-faisca.ts`, `src/mundo/macro/terrenos.tsx`.

- [x] Dados explícitos para Quadro/descanso, apoio do correio e lacre. Compartilhar colisores e rejeição de retomada nesses volumes; volumes têm acabamento de estudo e são documentados como provisórios.
- [x] Reutilizar árvores, arbustos, flores, rochas e caixas em agrupamentos assimétricos. Conferir copas fora do lote, centros sólidos fora dos trajetos e funções das fachadas.
- [x] Chão de convívio, entrada da Costa, patamar do Farol e cabeceiras aderentes à altura já usada pela física; bordas suaves e variação de largura. Ponte mantém origem 3,45 m e malha física original.
- [x] Diferenciar os dois percursos com vegetação/objetos de uso e uma pausa de encosta. Manter o retorno cobre acessível.

## 3. Verificar e documentar

Arquivos: `tests/faisca.test.ts`, `tests/macro-estado.test.ts`, verificador Gate 2 e verificadores de percurso/mundo/toque existentes; relatório `docs/qa/2026-11-15-faisca-m3-gate2.md`.

- [x] Teste significativo: lote/corredores livres e retomada rejeitada sob os novos volumes; conferir antes de povoar a cena e repetir após a implantação.
- [x] Executar os dois percursos com controlador real, ida/volta da ponte, parada, salto e conversa. Recarregar posição local, conferir limites de setores e três ciclos de recursos.
- [x] Capturar depois nas mesmas câmeras, dia/noite e câmera de jogo normal. Registrar vídeos com controles reais, sem teleporte durante a gravação, incluindo ritmos e movimentos para o próximo aceite.
- [x] Rodar testes do pacote, tipagem, build e Biome dos arquivos alterados. Conferir falha recuperável da arte e toque.
- [x] Versionar comparativos e vídeos com tamanho controlado e links relativos. Separar implementado, provisório, dependente de arte e não testado em aparelhos físicos.
- [ ] Commit/push `staging`; confirmar SHA remoto e árvore limpa.

## 4. Recorte separado — equipamentos de exploração

- [x] Conferir patins, inventário, modo/animação, rodas, recompensa V1 e segredo do Bosque; registrar os contratos.
- [x] Identificar bolsinha candidata e encaixe `costas`/`Spine1`; registrar conflito atual do slot com capas.
- [ ] Escolher e testar esconderijo opcional nos Campos com descoberta idempotente no ensaio; reutilizar `patins` e a loja existente, sem progresso de plataforma.
- [ ] Gravar equipar/desequipar, deslize e movimentos em 1,3×; só experimentar 5–5,5 m/s em perfil explícito, com frenagem, curvas e salto conferidos.
- [ ] Prototipar mochila no pipeline existente sem substituir capa/roupa; avaliar a matriz de peças e ocultação temporária. Dependência de arte fica explícita se a candidata não servir.
- [ ] Submeter este recorte a aceite próprio, sem bloquear nem declarar pronta a composição ambiental.

## 5. Curadoria 01 — ensaio A/B aprovado durante a execução

Referência preservada sem edição: `docs/plans/2026-11-15-faisca-m3-curadoria01.md`. O usuário aprovou expressamente o ensaio A/B de 20–30 m. A escolha final de água/lago continua separada.

- [x] Auditar 17 IDs nos snapshots `7816a7a` e `4b7ab31`, conferir dimensões, encaixes e SHA-256 dos GLBs; registrar `curadoria01-auditoria.json`.
- [x] Exportar oito peças adicionais do mesmo commit já fixado, mantendo 23 no carregamento padrão e 31 somente no ensaio. Validar exportação determinística e origem das peças.
- [x] Montar 26,5 m de reta/curva/reta a partir dos encaixes reais, escala 1 e colisão em malha, em bancada de campo separada das âncoras aprovadas.
- [x] Disponibilizar `?curadoria=a` (referência provisória) e `?curadoria=b` (módulos reais), com vegetação/objetos Adventure Land iguais nos dois casos. Não duplicar uma faixa provisória embaixo da opção B.
- [x] Conferir caminhada, juntas, curva, câmera, estado de ensaio protegido, vídeo e comparativos dia/noite; documentar o que não foi aplicado ao mundo principal.
- [ ] Submeter o resultado à escolha artística; não transplantar automaticamente para Praça–Horta ou trocar o lago.
