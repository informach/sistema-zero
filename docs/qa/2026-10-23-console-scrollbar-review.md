# Rolagem dos consoles

Correção complementar à revisão do Admin e das oficinas, em 23/10/2026.

O menu do Admin publicado usava a barra nativa: estilo computado `auto`, sem largura nem
polegar temático. Os três consoles mantinham uma regra local opt-in que misturava
`scrollbar-width`/`scrollbar-color` com `::-webkit-scrollbar`; no Chromium, as propriedades
padrão substituem esse desenho. Kids e comunidade adulta já tratavam os motores separadamente.

A receita compartilhada `packages/ui/src/styles/console-scrollbars.css` substitui os três
blocos antigos. Usa cores dos tokens existentes, traço de 6 px dentro de uma área de arrasto
de 14 px e tinta clara no menu escuro. A variante discreta também aparece com foco de teclado.
Firefox recebe as propriedades padrão; o modo de alto contraste conserva cores nativas.
Não altera permissões, cursos, matrículas, jornadas nem a rolagem específica do Pinta.

Verificações locais:

- Contrato do tema compartilhado: 10 testes / 52 asserções, zero falhas.
- Navegação, cadastro de curso e oficinas do Admin: 28 testes / 137 asserções, zero falhas.
- Biome nos cinco arquivos de implementação e `git diff --check`: exit 0.
- Chromium 148: largura computada de 14 px, cores diferentes para fundo claro/menu escuro,
  rolagem por teclado e roda, foco da variante discreta e alto contraste verificados.
  Inspeção raster com o argumento de teste `--hide-scrollbars` removido confirmou os traços.
- Firefox 150: cores aplicadas, teclado, roda, foco e alto contraste verificados. O Firefox
  headless instalado computa largura `none` inclusive no controle mínimo com `auto`;
  portanto, este ensaio não comprova visualmente a espessura nativa nesse motor.

O primeiro ensaio usou `End`, que não deslocou a região; a prova foi corrigida para `PageDown`.
Os resultados iniciais e o limite do Firefox não são tratados como homologação visual.
As provas privadas ficam em `.cache/release-integration-20261023/console-scrollbar-*`.
Este registro descreve testes locais; implantação e CI do complemento devem constar no
relatório final da liberação.

Referência do comportamento dos motores:
[Chrome: Scrollbar styling](https://developer.chrome.com/docs/css-ui/scrollbar-styling).
