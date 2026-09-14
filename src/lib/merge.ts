import type { ChallengeState, Entries } from '../state/types'

/**
 * Junta o desafio de dois aparelhos.
 *
 * `entries` e `removed` formam um LWW-element-set: para cada casinha vence o
 * carimbo mais recente entre "marcada" e "desmarcada". A operação é comutativa,
 * associativa e idempotente — mesclar A com B dá o mesmo que B com A, e mesclar
 * duas vezes não muda nada. Por isso não existe "quem ganha" nem relógio
 * central: dá para sincronizar em qualquer ordem, offline, sem coordenação.
 */
export function mesclarEstados(local: ChallengeState, remoto: ChallengeState): ChallengeState {
  const numeros = new Set<number>([
    ...Object.keys(local.entries).map(Number),
    ...Object.keys(remoto.entries).map(Number),
    ...Object.keys(local.removed).map(Number),
    ...Object.keys(remoto.removed).map(Number),
  ])

  const entries: Entries = {}
  const removed: Entries = {}

  for (const numero of numeros) {
    // Entre os dois lados, o carimbo mais antigo é o verdadeiro início.
    const marcada = menorDefinido(local.entries[numero], remoto.entries[numero])
    // Já para a remoção vale a mais recente.
    const apagada = maiorDefinido(local.removed[numero], remoto.removed[numero])

    if (marcada === undefined) {
      if (apagada !== undefined) removed[numero] = apagada
      continue
    }

    if (apagada !== undefined && apagada > marcada) {
      removed[numero] = apagada
      continue
    }

    entries[numero] = marcada
    // Lápide antiga vencida pela marcação: some, para não crescer sem limite.
  }

  // Nome, data-alvo e tema não têm carimbo próprio. O aparelho em uso decide,
  // exceto quando ele está zerado — aí o que veio da nuvem é o que existe.
  const localTemDados = Object.keys(local.entries).length > 0
  const preferido = localTemDados ? local : remoto

  return {
    version: local.version,
    challengeName: preferido.challengeName,
    targetDate: preferido.targetDate,
    theme: local.theme,
    entries,
    removed,
  }
}

const menorDefinido = (a?: number, b?: number): number | undefined =>
  a === undefined ? b : b === undefined ? a : Math.min(a, b)

const maiorDefinido = (a?: number, b?: number): number | undefined =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b)
