'use client'
import type { CommerceContact } from '@sistemazero/core/commerce'
import { Button } from '@sistemazero/ui/button'
import {
  cardLengthFor,
  cvvLengthFor,
  isExpiryInFuture,
  isValidCpf,
  luhnCheck,
  normalizeBrand,
  onlyDigits,
} from '@sistemazero/ui/credit-card'
import { loadEfi, tokenizeEfiCard } from '@sistemazero/ui/efi-card-token'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { type FormEvent, useId, useRef, useState } from 'react'
import type { CommerceAddress, PurchaseView } from '../../lib/commerce'

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
const contactLabels: Record<keyof CommerceContact, string> = {
  nome: 'Nome completo',
  email: 'E-mail',
  cpf: 'CPF',
  telefone: 'Telefone',
}
const addressLabels: Record<keyof CommerceAddress, string> = {
  street: 'Rua',
  number: 'Número',
  neighborhood: 'Bairro',
  zipcode: 'CEP',
  city: 'Cidade',
  state: 'UF',
  complement: 'Complemento',
}
const emptyAddress: CommerceAddress = {
  street: '',
  number: '',
  neighborhood: '',
  zipcode: '',
  city: '',
  state: '',
}

export function PurchaseForm({
  view,
  busy,
  onPay,
}: {
  view: PurchaseView
  busy: boolean
  onPay: (data: Record<string, unknown>) => Promise<void>
}) {
  const id = useId()
  const recurring = view.offer.pricingMode === 'subscription'
  const pixAllowed = !recurring || view.offer.billingIntervalMonths === 12
  const [method, setMethod] = useState<'pix' | 'card'>(pixAllowed ? 'pix' : 'card')
  const [contact, setContact] = useState(view.contact)
  const [birth, setBirth] = useState(view.birth)
  const [address, setAddress] = useState(view.address ?? emptyAddress)
  const [edit, setEdit] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [card, setCard] = useState({ number: '', name: '', month: '', year: '', cvv: '' })
  const [installments, setInstallments] = useState('1')
  const [installmentOptions, setInstallmentOptions] = useState<
    { installment: number; value: number; has_interest: boolean }[]
  >([])
  const [quoting, setQuoting] = useState(false)
  const [tokenizing, setTokenizing] = useState(false)
  const [message, setMessage] = useState('')
  const submitting = useRef(false)
  async function quoteInstallments() {
    if (quoting || tokenizing || busy) return
    const config = view.cardConfig
    if (!config?.available || !config.accountIdentifier) {
      setMessage('O parcelamento não está disponível agora.')
      return
    }
    setQuoting(true)
    try {
      const sdk = await loadEfi()
      const brand = normalizeBrand(
        await sdk.CreditCard.setCardNumber(onlyDigits(card.number, 19)).verifyCardBrand(),
      )
      if (!brand) throw new Error('Informe o número do cartão para consultar o parcelamento.')
      const result = await sdk.CreditCard.setAccount(config.accountIdentifier)
        .setEnvironment(config.environment)
        .setBrand(brand)
        .setTotal(view.offer.priceCents)
        .getInstallments()
      if (!('installments' in result))
        throw new Error('Não foi possível consultar o parcelamento. Você pode pagar em uma vez.')
      setInstallmentOptions(
        result.installments.filter(
          (p) =>
            p.installment >= 1 &&
            p.installment <= (view.offer.installmentsMax ?? 12) &&
            Number.isFinite(p.value),
        ),
      )
      setMessage('')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar o parcelamento. Você pode pagar em uma vez.',
      )
    } finally {
      setQuoting(false)
    }
  }
  const missing = (key: keyof CommerceContact) =>
    key === 'cpf'
      ? !isValidCpf(view.contact.cpf)
      : key === 'telefone'
        ? onlyDigits(view.contact.telefone, 20).length < 10
        : view.contact[key].trim().length < 2
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current || busy || quoting || !accepted) return
    submitting.current = true
    setMessage('')
    setTokenizing(true)
    try {
      const data: Record<string, unknown> = {
        contact,
        method,
        acceptedTerms: accepted,
        termsVersion: view.termsVersion,
        expectedPriceCents: view.offer.priceCents,
      }
      if (method === 'card') {
        const config = view.cardConfig
        if (!config?.available || !config.accountIdentifier)
          throw new Error(
            'O pagamento por cartão está indisponível. Tente novamente em alguns instantes.',
          )
        const number = onlyDigits(card.number, 19)
        const sdk = await loadEfi()
        const brand = normalizeBrand(await sdk.CreditCard.setCardNumber(number).verifyCardBrand())
        if (
          !brand ||
          !luhnCheck(number) ||
          number.length !== cardLengthFor(brand) ||
          card.cvv.length !== cvvLengthFor(brand) ||
          !isExpiryInFuture(card.month, card.year, new Date())
        )
          throw new Error('Confira os dados e a validade do cartão.')
        const token = await tokenizeEfiCard(
          { accountIdentifier: config.accountIdentifier, environment: config.environment },
          {
            brand,
            number,
            cvv: card.cvv,
            expirationMonth: card.month,
            expirationYear: card.year,
            holderName: card.name.trim(),
            holderDocument: onlyDigits(contact.cpf, 11),
            reuse: recurring,
          },
        )
        Object.assign(data, {
          token: token.payment_token,
          brand,
          last4: number.slice(-4),
          installments: Number(installments),
        })
        setCard({ number: '', name: '', month: '', year: '', cvv: '' })
        if (recurring) Object.assign(data, { birth, address })
      }
      await onPay(data)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir. Confira o andamento antes de tentar novamente.',
      )
    } finally {
      submitting.current = false
      setTokenizing(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="rounded-2xl bg-muted/50 p-4">
        <p className="font-bold text-xl">
          {money(view.offer.priceCents)}
          {recurring
            ? view.offer.billingIntervalMonths === 1
              ? ' por mês'
              : view.offer.billingIntervalMonths === 12
                ? ' por ano'
                : ` a cada ${view.offer.billingIntervalMonths} meses`
            : ''}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {recurring && method === 'card'
            ? 'Assinatura com renovação automática no cartão.'
            : recurring
              ? 'Pagamento anual à vista, sem renovação automática.'
              : 'Pagamento único.'}
        </p>
        {view.offer.accessMode === 'fixed' ? (
          <p className="text-sm">
            Acesso por {view.offer.accessDurationValue}{' '}
            {view.offer.accessDurationUnit === 'days' ? 'dias' : 'meses'} após a confirmação.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          A compra será vinculada à sua conta:{' '}
          <strong className="text-foreground">{view.contact.email}</strong>.
        </p>
        {(['nome', 'cpf', 'telefone'] as const)
          .filter((key) => edit || missing(key))
          .map((key) => (
            <Field key={key} label={contactLabels[key]} htmlFor={`${id}-${key}`}>
              <Input
                id={`${id}-${key}`}
                required
                autoComplete={key === 'nome' ? 'name' : key === 'telefone' ? 'tel' : 'off'}
                inputMode={key === 'nome' ? 'text' : 'numeric'}
                value={contact[key]}
                onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
              />
            </Field>
          ))}
        <Button variant="link" className="self-start px-0" onClick={() => setEdit(!edit)}>
          {edit ? 'Usar formulário simplificado' : 'Conferir ou corrigir dados de cobrança'}
        </Button>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-bold">Forma de pagamento</legend>
        <div className="flex gap-2">
          {pixAllowed ? (
            <Button
              variant={method === 'pix' ? 'default' : 'outline'}
              aria-pressed={method === 'pix'}
              onClick={() => setMethod('pix')}
            >
              Pix
            </Button>
          ) : null}
          <Button
            variant={method === 'card' ? 'default' : 'outline'}
            aria-pressed={method === 'card'}
            onClick={() => setMethod('card')}
          >
            Cartão de crédito
          </Button>
        </div>
        {method === 'card' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número do cartão" htmlFor={`${id}-card`} className="col-span-2">
              <Input
                id={`${id}-card`}
                autoComplete="cc-number"
                inputMode="numeric"
                value={card.number}
                required
                maxLength={23}
                onChange={(e) => {
                  setCard((c) => ({ ...c, number: e.target.value }))
                  setInstallmentOptions([])
                  setInstallments('1')
                }}
              />
            </Field>
            <Field label="Nome no cartão" htmlFor={`${id}-holder`} className="col-span-2">
              <Input
                id={`${id}-holder`}
                autoComplete="cc-name"
                value={card.name}
                required
                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label="Mês" htmlFor={`${id}-month`}>
              <Input
                id={`${id}-month`}
                autoComplete="cc-exp-month"
                placeholder="MM"
                inputMode="numeric"
                maxLength={2}
                value={card.month}
                required
                onChange={(e) => setCard((c) => ({ ...c, month: e.target.value }))}
              />
            </Field>
            <Field label="Ano" htmlFor={`${id}-year`}>
              <Input
                id={`${id}-year`}
                autoComplete="cc-exp-year"
                placeholder="AAAA"
                inputMode="numeric"
                maxLength={4}
                value={card.year}
                required
                onChange={(e) => setCard((c) => ({ ...c, year: e.target.value }))}
              />
            </Field>
            <Field label="Código de segurança" htmlFor={`${id}-cvv`}>
              <Input
                id={`${id}-cvv`}
                autoComplete="cc-csc"
                inputMode="numeric"
                maxLength={4}
                type="password"
                value={card.cvv}
                required
                onChange={(e) => setCard((c) => ({ ...c, cvv: onlyDigits(e.target.value, 4) }))}
              />
            </Field>
            {!recurring && (view.offer.installmentsMax ?? 12) > 1 ? (
              <Field label="Parcelas" htmlFor={`${id}-installments`}>
                <Select
                  id={`${id}-installments`}
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                >
                  {installmentOptions.length ? (
                    installmentOptions.map((p) => (
                      <option key={p.installment} value={p.installment}>
                        {p.installment}x de {money(p.value)}
                        {p.has_interest ? ' (com juros)' : ' sem juros'}
                      </option>
                    ))
                  ) : (
                    <option value="1">1x de {money(view.offer.priceCents)}</option>
                  )}
                </Select>
                <Button
                  variant="link"
                  disabled={quoting || tokenizing || busy}
                  onClick={quoteInstallments}
                >
                  {quoting ? 'Consultando…' : 'Ver opções de parcelamento'}
                </Button>
              </Field>
            ) : null}
          </div>
        ) : null}
      </fieldset>
      {recurring && method === 'card' ? (
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-3 font-bold">Dados necessários para a assinatura</legend>
          {edit || !view.birth ? (
            <Field label="Seu nascimento" htmlFor={`${id}-birth`} className="col-span-2">
              <Input
                id={`${id}-birth`}
                type="date"
                value={birth}
                required
                onChange={(e) => setBirth(e.target.value)}
              />
            </Field>
          ) : null}
          {(Object.keys(addressLabels) as (keyof CommerceAddress)[])
            .filter((key) => edit || !view.address?.[key])
            .map((key) => (
              <Field
                key={key}
                label={addressLabels[key]}
                htmlFor={`${id}-${key}`}
                className={key === 'street' ? 'col-span-2' : ''}
              >
                <Input
                  id={`${id}-${key}`}
                  value={address[key] ?? ''}
                  required={key !== 'complement'}
                  maxLength={key === 'state' ? 2 : 200}
                  onChange={(e) =>
                    setAddress((a) => ({
                      ...a,
                      [key]: key === 'state' ? e.target.value.toUpperCase() : e.target.value,
                    }))
                  }
                />
              </Field>
            ))}
        </fieldset>
      ) : null}
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          Concordo com as condições desta {recurring ? 'assinatura' : 'compra'} e com os{' '}
          <a href={view.termsUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a href={view.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Política de Privacidade
          </a>
          .
        </span>
      </label>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy || tokenizing || quoting || !accepted}
        className="h-12 w-full rounded-full font-bold"
      >
        {busy || tokenizing
          ? 'Processando…'
          : method === 'pix'
            ? 'Gerar Pix'
            : recurring
              ? 'Confirmar assinatura'
              : 'Confirmar pagamento'}
      </Button>
    </form>
  )
}
