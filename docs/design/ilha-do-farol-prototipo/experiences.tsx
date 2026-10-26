import { useState } from 'react'
import { Frame, Note, SceneButton } from '../farol-antes-depois/shared'
import { type Point, World, type WorldState } from './stage'
export const views = [
  ['front', 'Ver de frente'],
  ['side', 'Ver de lado'],
  ['top', 'Ver de cima'],
] as const
export function Views({
  value,
  onChange,
  suggest,
}: {
  suggest?: WorldState['view']
  value: WorldState['view']
  onChange: (v: WorldState['view']) => void
}) {
  return (
    <fieldset className="ilha-buttons" aria-label="Ponto de vista">
      {views.map(([id, label]) => (
        <SceneButton
          key={id}
          tom={suggest === id ? 'gesto' : value === id ? 'ligado' : 'ferramenta'}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {label}
        </SceneButton>
      ))}
    </fieldset>
  )
}
export function Axes({
  value,
  onChange,
  suggest,
}: {
  suggest?: string
  value: Point
  onChange: (p: Point) => void
}) {
  return (
    <div className="ilha-axes">
      {(['x', 'z', 'y'] as const).map((axis) => (
        <label key={axis} data-axis={axis}>
          <span>
            <b>{axis.toUpperCase()}</b>{' '}
            {axis === 'y'
              ? 'Altura'
              : axis === 'x'
                ? 'Uma direção do chão'
                : 'Outra direção do chão'}
          </span>
          <div>
            <SceneButton
              tom={suggest === `${axis}-` ? 'gesto' : 'ferramenta'}
              aria-label={`Diminuir ${axis}`}
              onClick={() =>
                onChange({ ...value, [axis]: Math.max(axis === 'y' ? 0.5 : -4, value[axis] - 0.5) })
              }
            >
              −
            </SceneButton>
            <input
              aria-label={`Posição ${axis}`}
              type="range"
              min={axis === 'y' ? 0.5 : -4}
              max="4"
              step=".5"
              value={value[axis]}
              onChange={(e) => onChange({ ...value, [axis]: Number(e.target.value) })}
            />
            <SceneButton
              tom={suggest === `${axis}+` ? 'gesto' : 'ferramenta'}
              aria-label={`Aumentar ${axis}`}
              onClick={() => onChange({ ...value, [axis]: Math.min(4, value[axis] + 0.5) })}
            >
              +
            </SceneButton>
            <input
              aria-label={`Valor ${axis}`}
              type="number"
              min={axis === 'y' ? 0.5 : -4}
              max="4"
              step=".5"
              value={value[axis]}
              onChange={(e) => {
                const n = e.target.valueAsNumber
                if (Number.isFinite(n))
                  onChange({ ...value, [axis]: Math.max(axis === 'y' ? 0.5 : -4, Math.min(4, n)) })
              }}
            />
          </div>
        </label>
      ))}
    </div>
  )
}
const base: Point = { x: -2, y: 1, z: -3 }
type Trial = {
  key: Point
  view: WorldState['view']
  hero: { x: number; z: number }
  seen: string[]
  answer: string
  bounds: boolean
  tested: boolean
  result?: boolean
}
function initial(mode: string): Trial {
  return {
    key: mode === 'contact' ? { x: 0, y: 3, z: 1 } : { ...base },
    view: 'front',
    hero: { x: 0, z: 1 },
    seen: [],
    answer: '',
    bounds: false,
    tested: false,
  }
}
export function Experience({ mode }: { mode: 'view' | 'position' | 'contact' }) {
  const [s, set] = useState(() => initial(mode)),
    [past, history] = useState<Trial[]>([]),
    [contact, setContact] = useState<boolean | null>(null)
  const change = (next: Trial) => {
    setContact(null)
    history((h) => [...h, s].slice(-100))
    set(next)
  }
  const mark = (next: Trial, ...ids: string[]) =>
    change({ ...next, seen: [...new Set([...next.seen, ...ids])] })
  const camera = (view: Trial['view']) => {
    if (mode === 'view' && view !== 'front') mark({ ...s, view }, 'other')
    else change({ ...s, view })
  }
  const move = (key: Point) => {
    const ids = (['x', 'y', 'z'] as const)
      .filter((a) => key[a] !== s.key[a])
      .map((a) => `${a}${key[a] > s.key[a] ? '+' : '-'}`)
    mark({ ...s, key, tested: false }, ...ids)
  }
  const goals =
    mode === 'view'
      ? ['Veja a chave por outro ponto de vista.', 'Reconheça o que mudou na comparação.']
      : mode === 'position'
        ? [
            'Explore os dois sentidos do x.',
            'Explore os dois sentidos do z.',
            'Compare subir e descer no y.',
          ]
        : [
            'Teste um encontro com a chave fora de alcance.',
            'Teste um encontro com a chave ao alcance.',
          ]
  const completed =
    mode === 'view'
      ? [s.seen.includes('other'), s.seen.includes('understood')]
      : mode === 'position'
        ? ['x', 'z', 'y'].map((a) => s.seen.includes(`${a}+`) && s.seen.includes(`${a}-`))
        : [s.seen.includes('apart'), s.seen.includes('touch')]
  const all = completed.every(Boolean)
  const text =
    mode === 'view'
      ? all
        ? 'A vista mudou; a chave continuou no mesmo lugar. Você pode comparar de novo.'
        : s.view === 'front'
          ? 'A pedra está escondendo a chave deste lado. Experimente olhar de outro lugar.'
          : 'Agora procure a chave. Compare com a vista de frente: o que mudou?'
      : mode === 'position'
        ? all
          ? 'Você explorou as três direções. Continue mudando o lugar da chave e compare as vistas.'
          : !s.seen.includes('x+')
            ? 'Experimente aumentar o x e observe o caminho da chave no chão. Você também pode começar por outro eixo.'
            : !s.seen.includes('x-')
              ? 'Agora experimente diminuir o x. A chave volta pelo mesmo caminho?'
              : !s.seen.includes('z+')
                ? 'Experimente aumentar o z e compare com o caminho do x. Os dois ficam no chão.'
                : !s.seen.includes('z-')
                  ? 'Diminua o z para explorar o outro sentido. A altura continua igual.'
                  : !s.seen.includes('y+')
                    ? 'Aumente o y e observe a chave subir. A linha mostra a distância até o chão.'
                    : 'Experimente diminuir o y. Compare descer com andar pelo chão.'
        : all
          ? 'Você comparou um encontro e uma separação. Prepare outras posições e continue testando.'
          : s.tested
            ? s.result
              ? 'As áreas se encontraram. Afaste ou levante a chave para comparar.'
              : 'Ainda estão separados. Mude a altura ou o lugar da chave e teste novamente.'
            : 'A chave parece alinhada com o personagem. Veja de lado, mude a posição e teste se eles encostam.'
  const reset = () => {
    setContact(null)
    set(initial(mode))
    history([])
  }
  return (
    <Frame
      title={
        mode === 'view'
          ? 'Mudou a ilha ou mudou o nosso olhar?'
          : mode === 'position'
            ? 'Onde fica cada coisa?'
            : 'Parece que encostou. Encostou mesmo?'
      }
      activity={null}
      state={null}
      kind="ilha"
      text={text}
      goals={goals}
      done={completed.filter(Boolean).length}
      completed={completed}
      reset={reset}
      hud={
        <strong>
          {mode === 'view'
            ? 'A mesma ilha, três pontos de vista'
            : mode === 'position'
              ? 'Dois caminhos no chão. Um para a altura.'
              : 'O encontro acontece no espaço.'}
        </strong>
      }
      stage={
        <World
          state={{
            mode,
            view: s.view,
            key: s.key,
            hero: s.hero,
            axes: mode !== 'view',
            bounds: s.bounds,
          }}
          onContact={setContact}
        />
      }
      after={
        <Note
          label={
            mode === 'view'
              ? 'Observe'
              : mode === 'position'
                ? 'Lugar da chave'
                : 'Resultado do último teste'
          }
          tone={s.tested && s.result ? 'green' : 'blue'}
        >
          {mode === 'view'
            ? all
              ? 'A chave e a pedra continuaram no mesmo lugar.'
              : 'Procure a chave e compare o que você vê de cada lado.'
            : mode === 'position'
              ? `X ${s.key.x} · Z ${s.key.z} · altura Y ${s.key.y}`
              : s.tested
                ? s.result
                  ? 'Encostaram!'
                  : 'Ainda estão separados.'
                : 'Prepare a posição e clique em Testar o encontro.'}
        </Note>
      }
    >
      <div className="ilha-control-title">
        {mode === 'view' ? 'Mudar o ponto de vista' : 'Olhar a cena'}
      </div>
      <Views
        value={s.view}
        onChange={camera}
        suggest={!all && s.view === 'front' ? 'side' : undefined}
      />
      {mode === 'view' ? (
        <div className="ilha-question">
          <b>Quando a chave apareceu, o que mudou?</b>
          <div className="ilha-buttons">
            <SceneButton
              tom="ferramenta"
              onClick={() => {
                if (!s.seen.includes('other'))
                  change({ ...s, answer: 'Primeiro compare com outra vista para observar.' })
                else
                  mark(
                    {
                      ...s,
                      answer: 'Isso! A chave ficou no mesmo lugar. Mudou o nosso ponto de vista.',
                    },
                    'understood',
                  )
              }}
            >
              O lugar de onde olhamos
            </SceneButton>
            <SceneButton
              tom="ferramenta"
              onClick={() =>
                change({
                  ...s,
                  answer: 'Compare as vistas novamente. Nenhum controle moveu a chave.',
                })
              }
            >
              O lugar da chave
            </SceneButton>
          </div>
          <p aria-live="polite">{s.answer}</p>
        </div>
      ) : (
        <>
          <div className="ilha-control-title">Mudar a posição da chave</div>
          <Axes
            value={s.key}
            onChange={move}
            suggest={
              mode === 'position'
                ? ['x+', 'x-', 'z+', 'z-', 'y+', 'y-'].find((id) => !s.seen.includes(id))
                : undefined
            }
          />
          <SceneButton
            onClick={() =>
              change({
                ...s,
                key: mode === 'contact' ? { x: 0, y: 3, z: 1 } : { ...base },
                tested: false,
              })
            }
          >
            Voltar à posição inicial
          </SceneButton>
        </>
      )}
      {mode === 'contact' && (
        <>
          <div className="ilha-control-title">Mover o personagem no chão</div>
          <div className="ilha-pad">
            {[
              ['X −', -0.5, 0],
              ['Z −', 0, -0.5],
              ['Z +', 0, 0.5],
              ['X +', 0.5, 0],
            ].map(([label, x, z]) => (
              <SceneButton
                key={label}
                aria-label={`Mover personagem ${label}`}
                onClick={() =>
                  change({
                    ...s,
                    hero: {
                      x: Math.max(-4, Math.min(4, s.hero.x + Number(x))),
                      z: Math.max(-4, Math.min(4, s.hero.z + Number(z))),
                    },
                    tested: false,
                  })
                }
              >
                {label}
              </SceneButton>
            ))}
          </div>
          <small>
            Cada clique move um passo no eixo escolhido. Mudar a vista não muda esses caminhos.
          </small>
          <div className="ilha-buttons">
            <SceneButton
              tom="gesto"
              disabled={contact === null}
              onClick={() =>
                mark({ ...s, tested: true, result: !!contact }, contact ? 'touch' : 'apart')
              }
            >
              Testar o encontro
            </SceneButton>
            <SceneButton
              aria-pressed={s.bounds}
              onClick={() => change({ ...s, bounds: !s.bounds })}
            >
              {s.bounds ? 'Esconder áreas de contato' : 'Mostrar onde encosta'}
            </SceneButton>
          </div>
        </>
      )}
      <p className="ilha-free">
        Experimente na ordem que quiser. As descobertas continuam marcadas ao preparar outro teste.
      </p>
      <SceneButton
        disabled={!past.length}
        onClick={() => {
          const prev = past.at(-1)
          if (prev) {
            setContact(null)
            set(prev)
            history(past.slice(0, -1))
          }
        }}
      >
        Desfazer
      </SceneButton>
    </Frame>
  )
}
