type ClassValue = string | false | null | undefined

/** Junta classes condicionais sem dependência externa. */
export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(' ')
