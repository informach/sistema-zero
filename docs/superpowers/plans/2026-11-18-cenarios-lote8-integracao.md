# Lote 8.2 — Integração do compilador: decisões e verificações pendentes

Complemento executável do [plano do lote 8](2026-11-18-cenarios-lote8-exportacao.md). **Não é um checkpoint de conclusão.** Base atual: `bfb24122c`, staging limpa antes da integração; lotes 0–7 fechados, somente 8.2 ativo. Sem delegação ou aprovação intermediária.

## Contrato e identidade

- Guardar âncora/matriz e volume das entidades independentemente do nó visual. Isso conserva informações para propriedades, associações de marcadores e futura junção estática. Conservar também a organização/ocultação na tabela de entidades; elementos ocultos não carregam GLBs ou licenças ociosas.
- Montagens continuam entidades próprias: o resolvedor cria grupos com seus IDs. Identificar essas raízes pela lista original de montagens e preservar a matriz absoluta da raiz, procedência, propriedades e relações dos filhos.
- O hash da fonte deve vir do documento autoral validado, antes da expansão, e ser reproduzível em JSONB/HTTP. Investigar/reutilizar `canonicalJson`/`sha256Hex` de `@sistemazero/core/creations`, sem criar outro serializador ou alterar o formato das impressões já usadas pela plataforma. O servidor verificará a mesma fonte/revisão em 8.3.
- Observação concreta da revisão: `PropriedadesSchema.safeParse(JSON.parse('{"__proto__":"teste"}'))` aceita e descarta a chave. Recusar explicitamente essa chave na entrada, com teste de regressão, para não anunciar preservação enquanto algum dado desaparece silenciosamente. Não mudar impressões digitais antigas para resolver isso.

## Objetos estáticos e atores

- Reutilizar `RepresentacoesDoModelo` para reflexos, materiais e projeção de textura. Acrescentar uma leitura de partes locais ao lote se necessário; não extrair matrizes Float32 de `InstancedMesh` para substituir a transformação autoral de precisão completa.
- Geometria dos modelos fica local ao template; `NoCompilado.matriz` guarda a transformação final no mundo. Aparência e espelho afetam o template. Escala afeta os UVs métricos quando houver override de textura; posição e giro externos não mudam essa projeção do editor.
- Usar nomes internos determinísticos e cache de variantes por modelo/conteúdo/aparência/espelho/escala pertinente. Deduplicar arquivos por bytes/hash. Não assar as coordenadas mundiais em uma cópia de GLB para cada casa igual.
- Cor de instância multiplica a cor do material como no lote atual. Projeção de textura usa `geometriaParaTextura` e `materializarUvDaTextura`. Materiais/texturas originais permanecem no dono dos recursos. Cópias temporárias devem ser descartadas após cada template.
- Atores, skins, morphs e modelos com clipes seguem `normalizarRaizAnimavel`, nunca a geometria da pose inicial. Clonar o esqueleto, dividir por material e manter binds/clipes; isso já foi provado com fixture acima de 65.000 vértices e Cute real. Ainda integrar aparência/reflexo e projeção portátil de UV de atores, sem perder canais ou expressão.
- Para UV de ator, usar a pose inicial apenas como referencial de projeção: a geometria exportada continua com posições-base, juntas, pesos e morphs. Preservar triângulos inclusive se uma pose temporariamente os colapsar. O remapeamento precisa distribuir canais de morph às partes e conservar a hierarquia dos ossos.

**Recortes conferidos:** [objetos/metadados](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-objetos-metadados.md) e [acabamento de atores](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-acabamento-atores.md) implementam os itens acima. A integração final permanece pendente; o estado de 8.2 não muda para concluído.

## Terreno, caminhos e colisões

- Extrair todas as superfícies dos geradores próprios da execução, sem câmera/LOD. O piso de reserva do terreno pode conter várias peças em um mesh: separar por setores a partir dos triângulos existentes antes de assar texturas. Não regerar terreno por um segundo algoritmo.
- Pintura usa os pesos reais da malha, incluindo vértices de recorte, e as imagens carregadas. Aplicar os UVs derivados e remover canais de pintura/cores que seriam multiplicados uma segunda vez no glTF. Solo sem camadas mantém suas cores de vértice.
- **Não perder a solução de profundidade dos caminhos planos.** `polygonOffset` e `depthWrite=false` não pertencem ao glTF comum. Estudar o recorte do terreno visual sob as superfícies coplanares, reutilizando `recortarMalha`/núcleo e a geometria final dos caminhos. Sem deslocamentos arbitrários em Y. Conservar a física completa do chão sob a trilha e as colisões estruturais existentes. Comparar junções/recortes em movimento e no GLB reaberto.
- Colisões vêm de `prepararColisoesDoTeste`, `TerrenoDoPalco`, `CaminhosDoPalco` e `AguasDoPalco`. O collider não deve usar textura/pintura e nunca incluir guias ou lâmina d'água como piso sólido.
- Alturas Float32 LE, PNG16, máscara por célula, cobertura, recortes e fundo já têm escritor. Conservar correspondência com a malha e as consultas dos runtimes.

## Água portátil

- Água de catálogo mantém margens sólidas do modelo e consulta do fundo; água procedural usa o mesmo gerador. Nenhuma água/lago duplicado, nenhum piso sólido inventado sob a lâmina.
- Os shaders de profundidade/espuma/normal não são serializados por GLTFExporter. Preparar um material estático portátil coerente e conservar parâmetros no manifesto para os runtimes dinâmicos. Comparar o material estático com o original; não exportar simplesmente o material branco cujas cores só existem em `onBeforeCompile`.
- Se for necessário assar mapas, reutilizar um rasterizador compartilhado e as mesmas consultas/expressões do material. Tratar queda vertical à parte da projeção XZ. Provar bordas secas, margens, transparência, ilhas e física de nado.
- Oceano pode ser muito maior que o terreno. Evitar um PNG gigante ou milhares de mapas uniformes: separar região próxima do terreno e superfícies externas uniformes, a partir da mesma lâmina. Ajustar apenas após comparação do shader/consultas reais.

## Montagem e prova final de 8.2

- `compilarCenario` deve carregar/conferir recursos, materializar as superfícies, resolver apoios reais de caminho, construir templates, colisões e manifesto, verificar inventário **e conteúdo dos arquivos**, e retornar o pacote completo. Falha/cancelamento não retornam manifesto parcial; descarte de todos os donos em `finally`.
- Registrar textos/sky como dependências usadas com dimensões reais. Procedência das formas não exige um arquivo original inexistente. Modelos e conjuntos mantêm IDs/revisões/licenças reais.
- API de progresso/cancelamento não altera autoria. Entre partes de trabalho, permitir que o navegador processe cancelamento; não prometer interrupção no meio de uma operação síncrona indivisível.
- Ensaiar terreno com relevo/buracos/recortes/pintura, encontros, piso conformado, ponte/apoios, lago de catálogo, água procedural, conjunto e atores/reflexos. Reabrir o pacote sem o palco autoral. Comparar superfícies, física e metadados e fazer três ciclos de compilação/cancelamento/descarte.
- Só fechar 8.2 depois da integração e dessas provas; seguir então para 8.3. O subpath público `motor/compilar` ainda não existe porque o compilador completo não está entregue. Não antecipar lotes 9–10 ou implantação.

**Conferência já implementada e testada em recorte:** [conteúdo/alturas](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-conteudo-alturas.md). A montagem final ainda precisa chamar essa conferência; não tratar a existência do leitor como entrega do pacote completo.

**Superfícies de solo já conferidas em recorte:** [setores, pintura portátil e encontros](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-solo-caminhos.md). Partição do piso/detalhes e solução portátil dos decals foram comparadas com o palco e o GLB reaberto; água e montagem continuam pendentes.

**Água em recorte:** [acabamento e leitura exata na GPU](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-agua-portatil.md). A comparação encontrou/corrigiu um erro de endereçamento do shader existente. Gradiente, alpha e espuma estáticos passaram no GLB reaberto; oceano, restauração dos efeitos e integração final continuam pendentes.

## Atualização — compilador integrado

[Primeiro pacote integrado](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-integracao.md): `compilarCenario` e o subpath público `motor/compilar` existem, e o oceano está integrado. Piso próprio e terreno/catálogo passaram em três ciclos completos/cancelados, reabertura independente, consultas físicas, mesmas câmeras e validação Khronos. Foram corrigidos o recorte de piso com rotação no nó e a recompressão WebP. As afirmações acima sobre montagem/subpath inexistentes descrevem o ponto inicial deste plano.

8.2 permanece ativo até a junção estática com identidade e as provas restantes. Não iniciar outro lote ou implantação. A restauração das ondas e os consumidores pertencem à sequência planejada do próprio lote 8.
