import type { StudioProRuntimeAdapter } from '../../studio/pro-runtime'

/**
 * A escolha da execução do Pro em JavaScript (etapa 3 do plano; o porquê está em
 * `docs/estudio-evolucao/pro-execucao.md`): com o compilador do servidor disponível, o projeto que
 * o navegador consegue montar igual ao Vite é montado aqui (execução leve) e o resto vai ao
 * servidor (execução hospedada), com a mesma política do documento e o mesmo quadro isolado.
 * Sem o compilador do servidor, o host escolheu o ambiente completo (WebContainer), que não passa
 * por aqui. O montador é carregado só no primeiro Rodar: o parser e o Sucrase não entram na
 * abertura do editor.
 */
export function withLightProBuild(remote: StudioProRuntimeAdapter): StudioProRuntimeAdapter {
  return {
    ...remote,
    async build(input) {
      const started = performance.now()
      const { planLightProBuild } = await import('./lightProBuild')
      input.signal?.throwIfAborted()
      const plan = planLightProBuild(input.project, remote.limits)
      if (plan.kind === 'hosted') return remote.build(input)
      return {
        html: plan.html,
        output: 'Montado aqui no navegador, sem esperar o servidor.',
        durationMs: Math.round(performance.now() - started),
      }
    },
  }
}
