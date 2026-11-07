function sentence(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
export function simpleEffect(text: string) {
  let value = text
  if (value.startsWith('Você contou que ')) {
    value = value.slice('Você contou que '.length)
    if (/^(acaba|assume|costuma|às vezes (reconstrói|monta))\b/.test(value)) value = 'Você ' + value
  }
  value = value
    .replace(/^Você (?:já )?percebe que,? /, '')
    .replace(/^às vezes precisam /, 'às vezes vocês precisam ')
  value = value.replace(
    'Você já percebeu uma ajuda que funciona: escolher a primeira questão junto, para que ele siga por um tempo.',
    'Escolher a primeira questão junto já ajuda a seguir por um tempo.',
  )
  return sentence(value)
}
export function flex(text: string, a: Record<string, string>) {
  if (a.genero !== 'filha') return text
  text = text.replace(/\b(do|no|pelo|o) seu filho\b/gi, (_, prefix) => {
    let value = ({ do: 'da', no: 'na', pelo: 'pela', o: 'a' } as Record<string, string>)[
      prefix.toLowerCase()
    ]!
    if (prefix[0] === prefix[0].toUpperCase()) value = sentence(value)
    return value + ' sua filha'
  })
  return text
    .replace(/seu filho/g, 'sua filha')
    .replace(/Seu filho/g, 'Sua filha')
    .replace(/\bdele\b/g, 'dela')
    .replace(/\bele\b/g, 'ela')
    .replace(/\bEle\b/g, 'Ela')
    .replace(/\bsozinho\b/g, 'sozinha')
    .replace(/\banimado\b/g, 'animada')
    .replace(/\bapoiado\b/g, 'apoiada')
    .replace(/ajudá-lo/g, 'ajudá-la')
    .replace(/vê-lo/g, 'vê-la')
    .replace(/interessá-lo/g, 'interessá-la')
}
