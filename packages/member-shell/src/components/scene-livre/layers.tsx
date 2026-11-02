'use client'

import { castText, discoveryGuidance, emCamadas } from '@sistemazero/core/learning/scene'
import { ArrowDown, ArrowUp, Layers, ScanEye } from 'lucide-react'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { semDino } from './dino/comum'
import { DicaLivre, LinhaDaIdeia, useMetasLivres } from './nave-a-comum'

/**
 * A experiência `layers` em exploração livre (Construtor, 02/11/2026): só a IDEIA ("quem é desenhado
 * por último fica na frente"), no molde de `Door`, `Memory` e dos Poderes. Duas apresentações:
 * - na Nave (Dia 1), a ordem de desenhar com "Desenhar a nave por último" e "Desenhar o fundo de
 *   estrelas por último", sem os blocos do Estúdio;
 * - no Meu Jeito (aula 5, `pilha: 'camadas'`), a lista Camadas do Pinta com os botões dele ("Uma camada
 *   para a frente" e "Uma camada para trás"), a ferramenta que a criança usa logo depois.
 * Os textos usam "o Dino" e "a floresta" para o elenco vestir (a nave e o fundo; a pedra e a chama).
 */

const O_QUE_COMPARAR = {
  blocos: {
    front: 'Compare a tela com o Dino desenhado por último.',
    covered: 'Compare a tela com a floresta desenhada por último de novo.',
    'back-in-front': 'Desenhe o Dino por último outra vez, como no jogo, e compare.',
  },
  camadas: {
    front: 'Compare o desenho com o Dino em cima na lista Camadas.',
    covered: 'Compare o desenho com o Dino embaixo na lista de novo.',
    'back-in-front': 'Deixe o Dino em cima na lista outra vez, como no jogo, e compare.',
  },
} as const

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora: levar o herói para a frente
 * (`heroi`) ou levar o cenário para a frente (`cenario`).
 */
export type GestoDasCamadas = 'heroi' | 'cenario' | null
export function proximoGestoDasCamadas(fala: string | undefined): GestoDasCamadas {
  switch (fala) {
    case 'layers-start':
    case 'layers-covered':
    case 'layers-camadas-start':
    case 'layers-camadas-covered':
      return 'heroi'
    case 'layers-front':
    case 'layers-camadas-front':
      return 'cenario'
    default:
      return null
  }
}

export function LivreLayers() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const camadas = emCamadas('layers', activity.pilha)
  const frente = state.world.front
  const textos = O_QUE_COMPARAR[camadas ? 'camadas' : 'blocos']
  const { tem, goals, completed, done } = useMetasLivres(textos)
  const gesto = proximoGestoDasCamadas(semDino(discoveryGuidance(activity, state)?.id))
  const vestir = (texto: string) => castText(texto, activity.cast)
  const heroi = vestir('Dino')
  const cenario = vestir('Floresta')
  const trocar = (front: boolean) => {
    if (front !== frente) dispatch({ type: 'layer', front })
  }
  const conclusao = camadas
    ? 'A de cima na lista Camadas fica na frente.'
    : 'Quem é desenhado por último fica na frente.'
  /** A lista de desenhar: o primeiro fica atrás. No Pinta a lista se lê ao contrário. */
  const ordem: ('heroi' | 'cenario')[] = frente ? ['cenario', 'heroi'] : ['heroi', 'cenario']
  const lista = camadas ? [...ordem].reverse() : ordem
  const nome = (peca: 'heroi' | 'cenario') => (peca === 'heroi' ? heroi : cenario)
  return (
    <Frame
      title="Quem fica na frente?"
      kind="layers"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals.map(vestir)}
      completed={completed}
      done={done}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <div className="position-hud">
          {camadas ? (
            <>
              <span>
                Em cima na lista <b>{nome(lista[0] ?? 'cenario')}</b>
              </span>
              <span>
                Embaixo <b>{nome(lista[1] ?? 'heroi')}</b>
              </span>
            </>
          ) : (
            <>
              <span>
                Desenhado primeiro <b>{nome(ordem[0] ?? 'heroi')}</b>
              </span>
              <span>
                Desenhado por último <b>{nome(ordem[1] ?? 'cenario')}</b>
              </span>
            </>
          )}
        </div>
      }
      stage={<ExplorationStage activity={activity} state={state} />}
      after={
        <figure className="sz-scene-regra door-rule">
          <figcaption className="sz-scene-regra-titulo">Quem fica na frente?</figcaption>
          <div className="memory-actions">
            <LinhaDaIdeia
              icone={<ScanEye size={19} />}
              caso={vestir(
                camadas ? 'O Dino em cima na lista Camadas' : 'O Dino desenhado por último',
              )}
              agora={frente}
              revelado={tem('front')}
              resultado={vestir('Nada fica na frente do Dino.')}
            />
            <LinhaDaIdeia
              icone={<Layers size={19} />}
              caso={vestir(
                camadas ? 'A floresta em cima na lista Camadas' : 'A floresta desenhada por último',
              )}
              agora={!frente}
              revelado={tem('covered')}
              resultado={vestir('A floresta cobre quase tudo do Dino, e nada foi apagado.')}
            />
          </div>
          <p className="sz-discovery-small">
            {tem('front') && tem('covered') ? conclusao : 'Compare os dois jeitos para descobrir.'}
          </p>
        </figure>
      }
    >
      {camadas ? (
        <div className="space-y-2 rounded-2xl border border-border p-3">
          <p className="text-sm font-semibold">Camadas</p>
          <ol className="space-y-2" data-pilha="camadas">
            {lista.map((peca, i) => {
              const emCima = i === 0
              const texto = emCima ? 'Uma camada para trás' : 'Uma camada para a frente'
              // Subir o herói ou descer o cenário levam o herói para a frente (e o contrário).
              const levaOHeroiParaFrente = (peca === 'heroi') !== emCima
              const destaque =
                peca === 'heroi' && gesto === (levaOHeroiParaFrente ? 'heroi' : 'cenario')
              return (
                <li
                  key={peca}
                  data-peca={peca}
                  className="flex items-center gap-3 rounded-xl border-2 border-border bg-background p-2"
                >
                  <span className="min-w-0 flex-1 font-semibold">{nome(peca)}</span>
                  <SceneButton
                    tom={destaque ? 'gesto' : 'ferramenta'}
                    aria-label={`${texto}: ${nome(peca)}`}
                    onClick={() => trocar(levaOHeroiParaFrente)}
                  >
                    {emCima ? <ArrowDown size={16} /> : <ArrowUp size={16} />} {texto}
                  </SceneButton>
                </li>
              )
            })}
          </ol>
        </div>
      ) : (
        <div className="sz-discovery-controls free-controls">
          <SceneButton
            aria-pressed={frente}
            tom={gesto === 'heroi' && !frente ? 'gesto' : frente ? 'ligado' : 'ferramenta'}
            onClick={() => trocar(true)}
          >
            {vestir('Desenhar o Dino por último')}
          </SceneButton>
          <SceneButton
            aria-pressed={!frente}
            tom={gesto === 'cenario' && frente ? 'gesto' : !frente ? 'ligado' : 'ferramenta'}
            onClick={() => trocar(false)}
          >
            {vestir('Desenhar a floresta por último')}
          </SceneButton>
        </div>
      )}
      <DicaLivre />
    </Frame>
  )
}
