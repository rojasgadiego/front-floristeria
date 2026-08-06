/*
 * DateOnly de C# viaja como 'yyyy-MM-dd'. No usar toISOString(): convierte a
 * UTC y en Chile (UTC-3/-4) devuelve el día anterior para cualquier hora de
 * la mañana. Hay que armarlo con los componentes locales.
 */
export function aDateOnly (valor) {
  if (!valor) return undefined
  if (typeof valor === 'string') return valor.slice(0, 10)

  const f = valor instanceof Date ? valor : new Date(valor)
  const y = f.getFullYear()
  const m = String(f.getMonth() + 1).padStart(2, '0')
  const d = String(f.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const hoy = () => aDateOnly(new Date())

export function haceDias (n) {
  const f = new Date()
  f.setDate(f.getDate() - n)
  return aDateOnly(f)
}