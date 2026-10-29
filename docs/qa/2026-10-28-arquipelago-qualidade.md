# Qualidade automática do Arquipélago

Escopo: geral-05. Regra pura, preferência no Conforto, adaptação da cena e observação no playground.
Não altera física, salvamento, banco de dados, modelos nem arquivos reservados às outras frentes.

## Conferências locais

- `bun test`: 515 passaram na primeira revisão; 529 na composição com cabana, luneta e miniaturas.
  Zero falhas, uma integração Postgres ignorada por não haver banco de teste configurado.
  Nenhum banco de staging ou produção foi acessado.
- `bun run typecheck` e `bun run check`: passaram.
- `tests/qualidade.test.ts`: detecção, preferências antigas, imposição por URL, tempos mínimos,
  faixa neutra, recuperação, descarte de pausas e alcance da névoa. Rapier real e o controlador
  do personagem produziram a mesma trajetória nos 240 passos de caminhada/pulo em quatro
  segundos, a 30/60 quadros e nos três níveis, com deslocamento e altura positivos.
- `bun run test:qualidade-browser`: Chrome 156.0.8078.48 no Windows, renderização SwiftShader,
  viewport 960×600 e densidade 2 (primeira prova também em 1280×720). O caminho Linux solicitado não existe nesta máquina.
  O runner aceita `ARQUIPELAGO_CHROMIUM` e usa automaticamente
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` quando presente.
- Bosque completo: DPR 1,75, uniform visual de vento 1, ondinhas montadas. Leve: DPR 0,75,
  uniform 0, ondinhas desmontadas e zero ondas ativas. Capturas locais nos dois níveis.
- Menu: troca efetiva, DPR preservado ao abrir/fechar, preferência mantida depois de reabrir,
  retorno das ondinhas ao completo e desligamento ao leve. Caminhada, pulo e pouso reais no leve.
- Toque emulado: `pointer: coarse` verdadeiro, nível inicial médio e meta 30.

## Achados corrigidos durante a revisão

Na conciliação, o remoto passou a usar `arq-escolha` também nos cartões de miniatura do
Construir, estreitando os fieldsets existentes de Conforto para 92 px. Os cartões agora usam
`arq-obra-escolha`, com estilos próprios. O navegador confere que o grupo de qualidade mantém
sua largura de formulário.

O primeiro controlador alterava DPR por `setDpr`, mas o Canvas reaplicava sua prop ao fechar o
menu. Teste reproduziu 1 no lugar de 0,75. A resolução passou a ter uma única autoridade na
prop do Canvas, ligada ao mesmo contexto de qualidade dos efeitos. A regressão está no runner.

O primeiro runner recriava o salvamento na mesma sessão com `novo=1` e `em=...`, acionando
corretamente a proteção de conflito. Agora cenários independentes usam contextos separados e
a prova de reabertura remove os parâmetros que criam um novo jogo e espera o primeiro autosave
confirmado pela plataforma falsa antes de recarregar. A proteção não foi alterada.

## Limites da evidência

Os números de adaptação estão em `docs/arquipelago-regras.md`, seção 6.18. A meta de 30 não impõe
um teto artificial de desenho. Ainda faltam medições prolongadas em celular/tablet Android,
iPhone/iPad e Chromebook reais: FPS, aquecimento, bateria, resposta do toque, legibilidade com
DPR 0,75 e estabilidade das transições em percursos longos. SwiftShader e emulação não provam
60/30 FPS em hardware físico. O Chromium específico do Linux também precisa ser executado lá.
