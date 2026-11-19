# Pincel de objetos e conjuntos — etapa 4b

Implementação na worktree isolada sobre `b390142cd`, preservando os componentes,
cores, fontes e organização do Pinta. [Guia e arquitetura](../../espalhar-objetos.md).

## Resultado funcional

Ferramenta própria em Criar mais/Avançado, atalho S sujeito à curadoria,
densidade, afastamento, semente, largura, quarto de volta e espelhos. O caminho
é interpolado, a prévia usa as artes reais e a soltura confirma exatamente os
IDs mostrados em um único passo de histórico. Conjuntos continuam vinculados;
artes copiam dados do objeto, preservam animação e propriedades. Não há formato novo.

O núcleo usa amostras ordenadas e índice espacial de centros; o lote é atômico.
Clipping considera a caixa transformada e offsets herdados. Ao exceder 512
objetos na camada, nada é inserido. Recuperação de conflito e recusa do host não
podem ser tratadas como inserção bem-sucedida. A mesma conferência de aceite
foi corrigida no arrasto da biblioteca, com reprodução red/green do defeito.

## Provas locais

- Suíte completa: **2.155 aprovados, zero falhas, 26.461 asserções, 186 arquivos**,
  236,01 s; [log](suite-pinta.txt). Inclui pixel, vetor, armazenamento e formatos.
- Após a revisão visual final, **77 aprovados, zero falhas, 3.442 asserções** nos
  seis arquivos de UI, núcleo, lote, recuperação e coordenadas;
  [log](regressao-final.txt). A prévia não carrega os rótulos sobrepostos;
  a [reprodução anterior](previa-rotulos-red.txt) falha antes da correção.
- Recusa do host no arrasto: [reprodução com a implementação publicada](biblioteca-recusa-red.txt)
  e regressão final aprovada. Nenhuma seleção de objeto inexistente nem anúncio de sucesso.
- Typecheck Pinta após a revisão final e typecheck Estúdio antes do ajuste privado
  de rótulo do overlay: ambos exit 0. O contrato público não foi alterado.
- Biome global: **16.260 arquivos, zero erros, 303 avisos e 245 informações**,
  exit 0. Avisos preexistentes não são classificados como removidos.

## Navegador nativo nesta máquina

Build de produção, Playwright/Chromium, sem login: **3 aprovados, zero skips,
retries ou instáveis**, com desktop, toque Pixel 7 emulado e desktop CPU 4×.
[Resultados](pincel.json), [log](navegador.txt), prévias
[desktop](previa-desktop.png), [toque](previa-touch.png) e [CPU](previa-cpu-4x.png).

O fluxo coloca pixel, vetor e conjunto, compara IDs de prévia/commit,
cancela com Esc/touchCancel sem edição, compara determinismo sem reutilizar IDs,
desfaz/refaz e fecha/reabre pelo IndexedDB. As coordenadas do gesto precisam estar
dentro da janela; visibilidade de CSS sozinha não é prova suficiente.

O conversor de coordenadas compartilhado também passou novamente pelos **3 casos
de arrasto da biblioteca**, nos mesmos perfis: [resultados](biblioteca.json),
[log](biblioteca-navegador.txt).

## Limites desta evidência

Toque e CPU são simulações nesta máquina, sem telefone físico ou participantes.
Happy-dom não comprova layout. Este lote não executa novamente todos os motores
externos nem encerra o ciclo autenticado Pinta–Estúdio, que permanece no plano.
A revisão de rótulos foi seguida de regressão direcionada e browser; a suíte
completa é anterior a esse pequeno ajuste. Nenhuma medição aqui promete fluidez
dos gestos no teto de mapas/objetos em hardware de entrada.
