import { expect, test } from 'bun:test'
import { type CapturedPaintActions, CapturedPaintInput } from './CapturedPaintInput'
import { paintPointerPath } from './paintPointerPath'

function setup(
  actions: CapturedPaintActions<number>,
  interpolate = false,
  onPick?: (x: number) => void,
) {
  const canvas = document.createElement('canvas'),
    captured = new Set<number>()
  document.body.append(canvas)
  canvas.setPointerCapture = (id) => {
    captured.add(id)
  }
  canvas.releasePointerCapture = (id) => {
    captured.delete(id)
    canvas.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: id }))
  }
  canvas.hasPointerCapture = (id) => captured.has(id)
  const input = new CapturedPaintInput(
    canvas,
    (event) => {
      onPick?.(event.clientX)
      return event.clientX < 0 ? null : event.clientX
    },
    actions,
    interpolate
      ? (from, to) => paintPointerPath(from, to, { left: 0, top: -1, right: 100, bottom: 1 }, 4)
      : undefined,
  )
  input.setEnabled(true)
  return {
    input,
    canvas,
    captured,
    event: (type: string, id = 1, x = 10) =>
      canvas.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          button: 0,
          clientX: x,
          bubbles: true,
          cancelable: true,
        }),
      ),
    close: () => {
      input.dispose()
      canvas.remove()
    },
  }
}

test.each([
  'cancel',
  'disable',
  'dispose',
  'replace',
])('interpolated picking respects %s inside a callback', (kind) => {
  const samples: Array<number | null> = [],
    ends: boolean[] = []
  const f = setup(
    {
      begin(value) {
        samples.push(value)
        return true
      },
      move(value) {
        samples.push(value)
        if (value !== 14) return
        if (kind === 'disable') f.input.setEnabled(false)
        else if (kind === 'dispose') f.input.dispose()
        else f.input.cancel()
        if (kind === 'replace') f.event('pointerdown', 1, 7)
      },
      end(value) {
        ends.push(value)
      },
    },
    true,
  )
  try {
    f.event('pointerdown', 1, 10)
    f.event('pointermove', 1, 30)
    expect(samples).toEqual(kind === 'replace' ? [10, 14, 7] : [10, 14])
    expect(ends).toEqual([false])
    f.event('pointerup', 1, 8)
    expect(samples).toEqual(kind === 'replace' ? [10, 14, 7, 8] : [10, 14])
    expect(ends).toEqual(kind === 'replace' ? [false, true] : [false])
  } finally {
    f.close()
  }
})

test.each([
  'cancel',
  'disable',
  'dispose',
])('a %s during the initial picking cannot begin an orphan gesture', (kind) => {
  const samples: number[] = [],
    ends: boolean[] = []
  const f = setup(
    {
      begin(value) {
        samples.push(value)
        return true
      },
      move() {},
      end(value) {
        ends.push(value)
      },
    },
    true,
    () => {
      if (kind === 'disable') f.input.setEnabled(false)
      else if (kind === 'dispose') f.input.dispose()
      else f.input.cancel()
    },
  )
  try {
    f.event('pointerdown')
    f.event('pointerup')
    expect(samples).toEqual([])
    expect(ends).toEqual([])
    expect(f.captured.size).toBe(0)
  } finally {
    f.close()
  }
})

test('cancellation during an intermediate picking prevents its returned sample from reaching the gesture', () => {
  const samples: Array<number | null> = [],
    ends: boolean[] = []
  const f = setup(
    {
      begin(value) {
        samples.push(value)
        return true
      },
      move(value) {
        samples.push(value)
      },
      end(value) {
        ends.push(value)
      },
    },
    true,
    (x) => {
      if (x === 14) f.input.cancel()
    },
  )
  try {
    f.event('pointerdown', 1, 10)
    f.event('pointermove', 1, 30)
    expect(samples).toEqual([10])
    expect(ends).toEqual([false])
    expect(f.captured.size).toBe(0)
  } finally {
    f.close()
  }
})

function coalesced(canvas: HTMLCanvasElement, xs: number[], type = 'pointermove', pointerId = 1) {
  const event = new PointerEvent(type, {
      pointerId,
      button: 0,
      clientX: 99,
      bubbles: true,
      cancelable: true,
    }),
    points = xs.map((clientX) => new PointerEvent('pointermove', { pointerId, clientX }))
  Object.defineProperty(event, 'getCoalescedEvents', { value: () => points })
  Object.defineProperty(event, 'getPredictedEvents', {
    value: () => {
      throw new Error('Predictions must not paint')
    },
  })
  canvas.dispatchEvent(event)
  return { event, points }
}

test('recorded coalesced samples retain order and misses, without painting the parent summary or predictions', () => {
  const samples: Array<number | null> = [],
    ends: boolean[] = [],
    f = setup({
      begin: (value) => {
        samples.push(value)
        return true
      },
      move: (value) => {
        samples.push(value)
      },
      end: (value) => {
        ends.push(value)
      },
    })
  try {
    coalesced(f.canvas, [1, 2, 3])
    expect(samples).toEqual([])
    f.event('pointerdown')
    const { event, points } = coalesced(f.canvas, [20, -1, 30])
    expect(samples).toEqual([10, 20, null, 30])
    expect(event.defaultPrevented).toBe(true)
    expect(points.every((point) => !point.defaultPrevented)).toBe(true)
    coalesced(f.canvas, [], 'pointermove')
    expect(samples.at(-1)).toBe(99)
    coalesced(f.canvas, [40, 50], 'pointermove', 2)
    expect(samples).toEqual([10, 20, null, 30, 99])
    coalesced(f.canvas, [40, 50], 'pointerup')
    expect(samples).toEqual([10, 20, null, 30, 99, 99])
    expect(ends).toEqual([true])
  } finally {
    f.close()
  }
})

for (const interruption of ['cancel', 'dispose', 'disable', 'replace'] as const)
  test(`${interruption} inside a subevent prevents remaining old positions from reaching any owner`, () => {
    const samples: Array<number | null> = [],
      ends: boolean[] = [],
      f = setup({
        begin: (value) => {
          samples.push(value)
          return true
        },
        move: (value) => {
          samples.push(value)
          if (value !== 20) return
          if (interruption === 'disable') f.input.setEnabled(false)
          else if (interruption === 'dispose') f.input.dispose()
          else f.input.cancel()
          if (interruption === 'replace') f.event('pointerdown', 1, 7)
        },
        end: (value) => {
          ends.push(value)
        },
      })
    try {
      f.event('pointerdown')
      coalesced(f.canvas, [20, 30, 40])
      expect(samples).toEqual(interruption === 'replace' ? [10, 20, 7] : [10, 20])
      expect(ends).toEqual([false])
      f.event('pointerup', 1, 8)
      expect(ends).toEqual(interruption === 'replace' ? [false, true] : [false])
      expect(samples).toEqual(interruption === 'replace' ? [10, 20, 7, 8] : [10, 20])
      expect(f.captured.size).toBe(0)
    } finally {
      f.close()
    }
  })

test('one pointer owns the final sample, missing hits break the stroke, and declined begins have no end', () => {
  const samples: Array<number | null> = [],
    ends: boolean[] = []
  let accept = true
  const f = setup({
    begin: (value) => {
      samples.push(value)
      return accept
    },
    move: (value) => {
      samples.push(value)
    },
    end: (value) => {
      ends.push(value)
    },
  })
  try {
    f.event('pointerdown')
    f.event('pointermove', 2, 99)
    f.event('pointermove', 1, -1)
    f.event('pointerup', 1, 20)
    expect(samples).toEqual([10, null, 20])
    expect(ends).toEqual([true])
    expect(f.captured.size).toBe(0)
    accept = false
    f.event('pointerdown')
    f.event('pointerup')
    expect(ends).toEqual([true])
  } finally {
    f.close()
  }
})

for (const interrupt of ['cancel', 'dispose', 'disable'] as const)
  test(`${interrupt} during begin cannot acquire a pointer after the callback returns`, () => {
    const ends: boolean[] = [],
      f = setup({
        begin: () => {
          if (interrupt === 'disable') f.input.setEnabled(false)
          else f.input[interrupt]()
          return true
        },
        move: () => {},
        end: (value) => {
          ends.push(value)
        },
      })
    try {
      f.event('pointerdown')
      f.event('pointerup')
      expect(ends).toEqual([false])
      expect(f.captured.size).toBe(0)
    } finally {
      f.close()
    }
  })

test('cancelling in the final sample cannot commit it, and a new same-pointer capture from end remains owned', () => {
  const ends: boolean[] = []
  let cancel = true,
    reopen = false
  const f = setup({
    begin: () => true,
    move: () => {
      if (cancel) f.input.cancel()
    },
    end: (value) => {
      ends.push(value)
      if (reopen) {
        reopen = false
        f.event('pointerdown')
      }
    },
  })
  try {
    f.event('pointerdown')
    f.event('pointerup')
    expect(ends).toEqual([false])
    cancel = false
    reopen = true
    f.event('pointerdown')
    f.event('pointerup')
    expect(ends).toEqual([false, true])
    expect(f.captured.has(1)).toBe(true)
    f.event('pointerup')
    expect(ends).toEqual([false, true, true])
    expect(f.captured.size).toBe(0)
  } finally {
    f.close()
  }
})

test('a second touch cancels and later contacts cannot resume until the original contacts are lifted', () => {
  let begins = 0
  const ends: boolean[] = [],
    f = setup({
      begin: () => {
        begins++
        return true
      },
      move: () => {},
      end: (value) => {
        ends.push(value)
      },
    })
  try {
    f.event('pointerdown')
    f.event('pointerdown', 2)
    f.event('pointerup', 2)
    f.event('pointerdown', 3)
    f.event('pointerup', 3)
    f.event('pointerup')
    expect(begins).toBe(1)
    expect(ends).toEqual([false])
    f.event('pointerdown')
    f.event('pointerup')
    expect(begins).toBe(2)
    expect(ends).toEqual([false, true])
  } finally {
    f.close()
  }
})

test('navigation interruption keeps held contacts excluded until their real releases', () => {
  let begins = 0
  const ends: boolean[] = []
  const f = setup({
    begin() {
      begins++
      return true
    },
    move() {},
    end(value) {
      ends.push(value)
    },
  })
  try {
    f.event('pointerdown', 1)
    f.input.interrupt()
    f.event('pointerdown', 2)
    f.input.interrupt()
    f.event('pointerup', 2)
    f.event('pointerdown', 3)
    f.event('pointerup', 3)
    expect(begins).toBe(1)
    expect(ends).toEqual([false])
    f.event('pointerup', 1)
    f.event('pointerdown', 4)
    f.event('pointerup', 4)
    expect(begins).toBe(2)
    expect(ends).toEqual([false, true])
  } finally {
    f.close()
  }
})

test('a contact released outside the canvas after losing capture cannot block future fingers', () => {
  let begins = 0
  const ends: boolean[] = [],
    f = setup({
      begin: () => {
        begins++
        return true
      },
      move: () => {},
      end: (commit) => {
        ends.push(commit)
      },
    })
  try {
    f.event('pointerdown')
    f.canvas.releasePointerCapture(1)
    document.body.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }))
    f.event('pointerdown', 2)
    f.event('pointerup', 2)
    expect(begins).toBe(2)
    expect(ends).toEqual([false, true])
  } finally {
    f.close()
  }
})

test('sem engolir os erros: só o toque que acerta é da pintura; o resto segue para a câmera', () => {
  const ends: boolean[] = []
  const f = setup({ begin: () => true, move: () => {}, end: (commit) => ends.push(commit) })
  const camera: number[] = []
  f.canvas.addEventListener('pointerdown', (event) => camera.push(event.pointerId))
  try {
    // O de sempre: todo toque primário é da pintura, acerte ou não.
    f.event('pointerdown', 1, -5)
    f.event('pointerup', 1, -5)
    expect(camera).toEqual([])
    f.input.setClaimMisses(false)
    f.event('pointerdown', 2, -5)
    expect(camera).toEqual([2])
    // Segundo dedo de um giro de câmera é da câmera (pinça), e não começa traço nenhum.
    f.event('pointerdown', 3, 10)
    expect(camera).toEqual([2, 3])
    expect(ends).toEqual([])
    f.event('pointerup', 3, 10)
    f.event('pointerup', 2, -5)
    // O toque que acerta continua sendo da pintura, e o segundo dedo encerra o traço.
    f.event('pointerdown', 4, 10)
    expect(camera).toEqual([2, 3])
    expect(f.captured.has(4)).toBe(true)
    f.event('pointerdown', 5, 10)
    expect(camera).toEqual([2, 3])
    expect(ends).toEqual([false])
  } finally {
    f.close()
  }
})
