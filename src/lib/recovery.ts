// Recovery code is the stable identifier for a user's Firestore data path.
// It never changes unless the user explicitly restores from a different code.
// Format: XXXX-XXXX-XXXX (12 chars, 3 groups of 4, unambiguous alphabet)

export const RECOVERY_CODE_KEY = 'unhookd_recovery_code'

// Excludes 0, 1, I, O to avoid confusion when reading/writing the code
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join('')
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`
}

export function getOrCreateRecoveryCode(): string {
  if (typeof window === 'undefined') return ''
  let code = localStorage.getItem(RECOVERY_CODE_KEY)
  if (!code) {
    code = generateCode()
    localStorage.setItem(RECOVERY_CODE_KEY, code)
  }
  return code
}

export function setRecoveryCode(code: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RECOVERY_CODE_KEY, normalize(code))
}

// Normalizes user input: uppercase, strip non-alphanumeric, insert dashes
export function normalize(input: string): string {
  const stripped = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const parts = [stripped.slice(0, 4), stripped.slice(4, 8), stripped.slice(8, 12)].filter(Boolean)
  return parts.join('-')
}

export function isValidCode(input: string): boolean {
  return /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalize(input))
}
