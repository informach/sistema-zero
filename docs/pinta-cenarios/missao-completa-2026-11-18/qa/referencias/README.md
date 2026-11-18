# Referências executáveis

Provas locais em 18/11/2026. `blocos-e-motores.log` contém 150 testes/6.896 verificações;
`exportadores.log` contém 47 testes/5.452 verificações, sem falhas ou skips. Os quatro
casos de `browser.json` cobrem Phaser desktop/toque e a Vila com física e portas.
As consultas do recurso referido somente por propriedade carregam sua imagem real e
conferem o pixel amarelo; a animação fixada continua vermelho/verde/azul/azul.

`studio-typecheck.log` e `pinta-typecheck.log` são gates completos, código zero.
`godot-gpu.log` registra consultas e pixels executados com Godot 4.7.2/OpenGL/RTX 3050.
`python-scale-red.log` executa uma cópia descartável do leitor sem a correção de escala;
`python-scale-green.log` executa o módulo real, com o mesmo PNG 2×. A falha inicial é esperada.

Scripts: `scripts/homologacao/resources.ts`, `test-resource-{pygame,studio}.py` e
`test-resource-godot.gd` no Pinta. A geração de recursos produz PNGs 1× e 2× além dos
pacotes dos motores. O script Studio lê o PNG pelo `pinta.carregar_mapa`, sem mock de Surface.

O ciclo autenticado de staging continua separado no plano. Toque é emulado nesta máquina.
