# Visitas pelo aconchego e tema semanal

Conferência local, sem acesso a banco remoto. Não comprova implantação.

## Cenários

- Casa com 28 pontos, moradores conhecidos e todas as ilhas liberadas.
- Uma visita automática, festa com três, conversa real por E/Usar, circulação com física,
  saída da ilha central, volta, descanso das visitas.
- Painel sem corte lateral, título visível na abertura e texto com pelo menos 200 px de largura.
- Em r6: selecionar outra ideia no diário e abrir a barra real de Construir pelo convite.

## Evidências

- r1 Kids computador: falhou no seletor de texto que não incluía o E. Print e diagnóstico
  preservados. Os três modelos já apareciam no cenário.
- r2 Kids computador, r3 Kids celular e adulto computador: fluxo funcional passou. A revisão
  visual detectou texto estreito e foco abrindo o painel rolado; não considerar acabamento final.
- r4 Kids/adulto celular: texto legível e título visível. A inspeção adicional encontrou painel
  adulto 4 px maior que a tela e medição da caminhada iniciada antes do teleporte terminar.
- r5 adulto celular: caixa corrigida e caminhada medida após confirmar a posição inicial.
- r6 Kids computador/celular: fluxo completo com os critérios corrigidos e tema semanal.

Cada pasta guarda prints e `resultado.json`; erros de página são fatais. O verificador é
`packages/arquipelago/playground/verificar-convidados-browser.ts`, compilado para Node com
Playwright externo. Usa Chrome/SwiftShader, perfil isolado, serviço local de propriedade do
processo, prazo global de seis minutos e fechamento no finally. Celular é emulado, não hardware.

## Comandos

No pacote do jogo:

```powershell
bun build playground/verificar-convidados-browser.ts --target=node --external=playwright-core --outfile=.cache/convidados-browser.mjs
$env:ARQUIPELAGO_PUBLICO='kids'
$env:ARQUIPELAGO_CELULAR='1'
$env:ARQUIPELAGO_PRINTS='<pasta nova para esta tentativa>'
node .cache/convidados-browser.mjs
```

Testes puros: visitas e estado 7/47 antes dos dois controles adicionais de construção/visita;
tema semanal 3/29. Tipagem do jogo passou após visitas; a composição com tema entra na
verificação integrada seguinte. Não transferir estes resultados para a feira ou para compra
compartilhada, que ainda não estão implementadas.
