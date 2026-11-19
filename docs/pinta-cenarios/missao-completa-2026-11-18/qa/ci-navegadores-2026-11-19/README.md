# Correções de QA do CI 44572834661

Quatro falhas independentes impediram a implantação automática em staging.
Este lote fica na autorização restrita de QA/CI; não muda comportamento de
produção, limites de testes, motores ou progressão dos blocos.

1. **Contrato do agente:** a fixture ainda pedia Three 0.180, que o contrato do
   remoto substituiu pelo pin compartilhado. O teste agora usa esse pin. A
   conservação literal do pacote, bytes binários, hash e recusas continuam
   verificadas. Reprodução: um aprovado/um reprovado; correção: **2 aprovados,
   17 asserções**.
2. **Inventário pedagógico:** a integração remota acrescentou os blocos
   `sz_g3d_load_scene` e `sz_g3d_scene_start` ao iniciante. A lista literal esperada
   no teste não os incluía. Foram acrescentados somente esses dois nomes ao
   teste, conservando a igualdade exata e a disjunção dos níveis. Reprodução:
   15 aprovados/um reprovado; correção: **16 aprovados, 373 asserções**.
3. **Isolamento da prévia:** o teste executava no headless shell, enquanto o
   experimento `measure-preview-isolation.mjs` e os recibos homologaram Chromium
   completo (`chromiumMode: chromium`). O shell bloqueou o editor por cerca de
   30 segundos também na reprodução Windows. O spec agora seleciona o mesmo
   Chromium completo do experimento, sem flags extras nem aumento da tolerância.
   Os **5 casos passaram**, incluindo cálculo nativo, recursão, mensagens,
   interrupção/recomeço e pressão de memória. Não se promete isolamento no shell,
   Firefox ou WebKit com essa prova.
4. **Cartões de divulgação:** o job instalava o navegador do Kids/Pensa, na
   revisão 1223, mas o teste resolve o Playwright do Estúdio, revisão 1248. Foi
   acrescentada ao job a instalação pelo CLI desse consumidor. O teste real dos
   cartões passou localmente com decodificação do QR no PNG, inclusive todos os
   casos de teclado, recorte móvel, diálogos, URL inválida e recuperação de erro.

O teste de preflight/ordem do workflow conserva **11 aprovados e 39 asserções**.
As provas negativas e positivas estão nos logs adjacentes. A instalação Linux
e o conjunto Windows completo precisam passar novamente no CI do novo commit.

As duas tentativas locais da suíte ampla do agente **não foram aprovadas**:
57/8 e 55/10. Há falhas de ambiente em navegadores ausentes e execução do helper
nativo rejeitada pelo Windows, além de outros ensaios do pacote. A correção
deste lote foi comprovada no teste específico; não se apresenta a suíte ampla
local como validada e não se alteram políticas do Windows para fazê-la passar.
