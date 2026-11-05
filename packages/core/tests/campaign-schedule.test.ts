import { describe, expect, test } from 'bun:test'
import { campaignScheduleWindows } from '../src/referrals'

describe('calendário de campanha em Brasília', () => {
  test('presente e cupom têm encerramentos independentes, inclusivos no último dia civil', () => {
    expect(
      campaignScheduleWindows({ eventDate: '2026-11-06', giftClaimDays: 3, couponClaimDays: 7 }),
    ).toEqual({
      startsAt: '2026-11-06T03:00:00.000Z',
      giftEndsAt: '2026-11-09T03:00:00.000Z',
      couponEndsAt: '2026-11-13T03:00:00.000Z',
    })
  })
  test('recalcula ambos os prazos ao mudar o evento, inclusive ano e fevereiro bissexto', () => {
    expect(
      campaignScheduleWindows({ eventDate: '2026-12-30', giftClaimDays: 3, couponClaimDays: 7 })
        .couponEndsAt,
    ).toBe('2027-01-06T03:00:00.000Z')
    expect(
      campaignScheduleWindows({ eventDate: '2028-02-28', giftClaimDays: 3, couponClaimDays: 7 })
        .giftEndsAt,
    ).toBe('2028-03-02T03:00:00.000Z')
  })
  test('recusa datas normalizadas pelo Date, sem fuso do computador e prazos inválidos', () => {
    for (const eventDate of [
      '2026-02-29',
      '2026-04-31',
      '2026-13-01',
      '06/11/2026',
      '2018-11-04',
      '2026-11-06T00:00:00Z',
    ]) {
      expect(() =>
        campaignScheduleWindows({ eventDate, giftClaimDays: 3, couponClaimDays: 7 }),
      ).toThrow()
    }
    for (const days of [0, -1, 1.5, 366, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        campaignScheduleWindows({
          eventDate: '2026-11-06',
          giftClaimDays: days,
          couponClaimDays: 7,
        }),
      ).toThrow()
      expect(() =>
        campaignScheduleWindows({
          eventDate: '2026-11-06',
          giftClaimDays: 3,
          couponClaimDays: days,
        }),
      ).toThrow()
    }
  })
})
