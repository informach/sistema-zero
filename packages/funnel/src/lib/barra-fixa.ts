/**
 * Barra fixa do celular das páginas do presente (Kids e adulto): aparece depois da primeira dobra e
 * some enquanto o alvo (o formulário) ou o rodapé estão à vista. Sem JS ela nunca aparece (nasce
 * escondida e `aria-hidden`); o CSS de cada página só a mostra abaixo de 760px. Client-only.
 */
export function ligarBarraFixa(seletor: string, alvoId: string): void {
  const barra = document.querySelector<HTMLElement>(seletor)
  const alvo = document.getElementById(alvoId)
  const rodape = document.querySelector('footer')
  if (!barra || !alvo || !('IntersectionObserver' in window)) return
  const link = barra.querySelector('a')
  let alvoAVista = false
  let rodapeAVista = false
  let roladoAlemDaDobra = false
  let ultimo: boolean | null = null
  const aplicar = () => {
    const mostra = roladoAlemDaDobra && !alvoAVista && !rodapeAVista
    if (mostra === ultimo) return
    ultimo = mostra
    barra.classList.toggle('is-visible', mostra)
    barra.setAttribute('aria-hidden', mostra ? 'false' : 'true')
    link?.setAttribute('tabindex', mostra ? '0' : '-1')
  }
  new IntersectionObserver(
    ([e]) => {
      alvoAVista = Boolean(e?.isIntersecting)
      aplicar()
    },
    { rootMargin: '0px 0px -40% 0px' },
  ).observe(alvo)
  if (rodape)
    new IntersectionObserver(([e]) => {
      rodapeAVista = Boolean(e?.isIntersecting)
      aplicar()
    }).observe(rodape)
  const aoRolar = () => {
    roladoAlemDaDobra = window.scrollY > window.innerHeight * 0.9
    aplicar()
  }
  window.addEventListener('scroll', aoRolar, { passive: true })
  aoRolar()
}
