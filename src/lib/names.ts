/** Palavras que ficam minúsculas no meio de um nome ("João da Silva"). */
const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du'])

const capitalize = (part: string) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1)

/**
 * Nome de pessoa com a primeira letra de cada palavra maiúscula: "maria EDNA" → "Maria Edna",
 * "joão DA silva" → "João da Silva", "ana-clara d'ávila" → "Ana-Clara D'Ávila".
 */
export function formatName(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean)
  return words
    .map((word, i) => {
      const lower = word.toLocaleLowerCase('pt-BR')
      if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower
      // Maiúscula também depois de hífen e apóstrofo
      return lower.split(/(?<=[-'’])/).map(capitalize).join('')
    })
    .join(' ')
}

/** Lista de nomes formatados (ignora vazios). */
export const formatNames = (names: string[]) => names.map(formatName).filter(Boolean)
