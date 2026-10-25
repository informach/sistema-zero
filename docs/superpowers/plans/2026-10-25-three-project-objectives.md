# Objetivos executáveis Jogo 3D e three.js — plano

> Executar com `executing-plans`, neste checkout isolado; não abrir agentes de sessões antigas.

**Objetivo:** Executar os projetos 3D na imagem protegida e conferir seus resultados reais, no clássico e no Pro.

**Contrato aprovado:** Em 25/10, o usuário confirmou que o Pro pode exigir valores exportados pelo arquivo (`export const jogador`) para observar `jogador.position.x/y/z`. O clássico mantém variáveis e funções do escopo existente. Modelos, cores e valores coerentes permanecem livres; a comparação continua privada no servidor.

**Arquitetura:** Reutilizar `/v1/check`, o Chromium isolado e a comparação canônica. Os pedidos da versão exata do Three já autorizada pela CSP serão atendidos com arquivos do pacote imutável da imagem, sem acesso à CDN. Um alvo `moduleValue` lê um caminho de uma exportação ES do projeto Pro; não avalia expressões nem acessa variáveis internas. Kits continuam oferecendo seu estado e funções.

**Restrições:** Three 0.180.0, rede desativada, UID não privilegiado, sem afrouxar CSP, caminhos de módulo `.js/.ts/.jsx/.tsx` do projeto, sem respostas esperadas na página. Falha do navegador/transporte impede aprovação. Não alterar roteiros ou exportar variáveis automaticamente no código do aluno.

## 1. Módulos oficiais offline

Arquivos: criar `packages/studio-runtime/runtime/check-javascript-modules.mjs` e `tests/check-javascript-modules.test.mjs`; alterar `runtime/check-objectives.mjs` e `Dockerfile`.

- [ ] RED: resolvedor recusa versão diferente, origem diferente, caminhos fora de `build/` e `examples/jsm/`, arquivos não JavaScript e symlinks; aceita núcleo e dependência relativa GLTF de um pacote pinado.
- [ ] Implementar `createPinnedThreeModuleResolver(packageRoot, version)`: raiz real/versão conferidas; entrada do pacote redireciona para `build/three.module.js`; leituras limitadas a 256 módulos/32 MiB, 4 MiB por arquivo, cache por job. Não mudar bytes do pacote.
- [ ] Implementar `createImageThreeModuleResolver()`: usa a dependência exata da própria imagem. Carregar somente quando o documento clássico solicitar o Three.
- [ ] Integrar ao roteamento privado do Chromium. Pedidos não reconhecidos continuam bloqueados. Falha de módulo confiável não pode virar resposta aprovada.
- [ ] Gerar perfil canônico e reconstruir a imagem.

## 2. Valores exportados no Pro

Arquivos: `core/src/learning/project-execution.ts`, `studio-runtime/src/check.ts`, `runtime/check-objectives.mjs`, `studio/src/blockly/projectCheckAuthoring.ts`, `admin/src/components/editor/execution-rule-editor.tsx` e testes afetados.

- [ ] Acrescentar alvo `{ kind: 'moduleValue', module: 'src/main.ts', path: 'jogador.position.z' }`, validado apenas para JavaScript. Recusar travessia de módulo e caminhos de protótipo.
- [ ] Provar que o clássico recusa esse alvo, o Pro exige arquivo existente e `proCheckModules` importa a união dos arquivos de função e de valor, sem duplicação.
- [ ] Ler a exportação pelo namespace ES já guardado em escopo privado; aplicar o mesmo codec limitado. Não encontrado/exceção/valor inválido não aprova.
- [ ] Oferecer o alvo no formulário Pro com arquivo e caminho explícitos. Preservar JavaScript clássico e Python.

## 3. Prova real e publicação

- [ ] Criar smoke Docker com documento clássico produzido pelo pipeline real e com Pro compilado por Vite/Three oficial. Casos: cena desenhada, tecla altera X/Y/Z corretamente, direção errada e ausência de movimento recusadas, função e saída, erro e tentativa de rede bloqueados.
- [ ] Usar contextos separados, PNG real de cena para a prova, revisão exata e confirmação de encerramento; dados simulados não qualificam WebGL.
- [ ] Rodar Core/Admin/serviço e perfil/tipagem afetados; revisar os resultados. Registrar explicitamente qualquer fronteira não qualificada.
- [ ] Conciliar o remoto atual, commit/push, CI e implantação staging/produção. Python/Raylib e financeiro mantêm seus próprios aceites; não herdar homologação entre eles.
