export type ThemePreference = 'light' | 'dark' | 'system'

/** { [número da casinha]: timestamp em ms de quando foi guardada } */
export type Entries = Record<number, number>

export interface ChallengeState {
  version: number
  challengeName: string
  /** "AAAA-MM-DD" ou null quando o usuário não definiu prazo. */
  targetDate: string | null
  entries: Entries
  /**
   * Lápides: { [número]: timestamp de quando foi DESmarcada }.
   *
   * Sem isso a sincronia entre dois aparelhos seria só união de `entries`, e
   * desmarcar num aparelho seria desfeito pelo outro na próxima sincronia.
   * Uma casinha vale quando entries[n] existe e é mais recente que removed[n].
   */
  removed: Entries
  theme: ThemePreference
}

export type ChallengeAction =
  | { type: 'mark'; number: number; at?: number }
  | { type: 'unmark'; number: number }
  | { type: 'markMany'; numbers: readonly number[]; at?: number }
  | { type: 'rename'; name: string }
  | { type: 'setTargetDate'; date: string | null }
  | { type: 'setTheme'; theme: ThemePreference }
  | { type: 'replace'; state: ChallengeState }
  | { type: 'reset' }
