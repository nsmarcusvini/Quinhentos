/** Entrega um arquivo ao usuário sem passar por servidor nenhum. */
function entregar(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
}

export function downloadJson(filename: string, data: unknown): void {
  entregar(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }),
    filename,
  )
}

/**
 * Tabela em CSV, pronta para abrir no Excel brasileiro.
 *
 * Duas escolhas que parecem detalhe e não são: o separador é ponto e vírgula,
 * porque no pt-BR a vírgula é decimal e o Excel quebraria toda linha no lugar
 * errado; e o arquivo sai com BOM, senão acento vira caractere estranho na
 * abertura — o Excel assume a codificação do Windows quando não há marca.
 */
export function downloadCsv(filename: string, linhas: Array<Array<string | number>>): void {
  const escapar = (valor: string | number): string => {
    let texto = String(valor ?? '')

    // Célula que começa com =, +, - ou @ é FÓRMULA para o Excel, e aspas não
    // mudam isso — só o apóstrofo à frente. Hoje o único campo que vem de
    // fora é o e-mail, que termina em @dominio e por isso não chega a ser
    // avaliado; a proteção existe para o dia em que alguma coluna carregar
    // texto livre, quando o mesmo caminho vira execução na máquina de quem
    // abre o arquivo.
    if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`

    // \r entra no teste porque um CR sozinho quebra linha no Excel.
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }

  const conteudo = linhas.map((linha) => linha.map(escapar).join(';')).join('\r\n')
  entregar(new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' }), filename)
}

/** Nome de arquivo com a data de hoje: desafio-500-2026-09-13.json */
export function backupFilename(date: Date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `desafio-500-${date.getFullYear()}-${month}-${day}.json`
}

/** "usuarios" → "usuarios-2026-09-14.csv" */
export function nomeComData(prefixo: string, extensao = 'csv', date: Date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${prefixo}-${date.getFullYear()}-${month}-${day}.${extensao}`
}
