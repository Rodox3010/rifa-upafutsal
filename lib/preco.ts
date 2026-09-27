// Regras de preço da rifa. Os valores podem ser trocados por variáveis de
// ambiente (sem precisar mexer no código), mas já têm um padrão sensato.
export const PRECO_UNITARIO = Number(process.env.NEXT_PUBLIC_PRECO_UNITARIO || 6);
export const PRECO_PROMOCIONAL = Number(process.env.NEXT_PUBLIC_PRECO_PROMOCIONAL || 5);
export const QTD_MINIMA_PROMOCAO = Number(process.env.NEXT_PUBLIC_PROMOCAO_QTD_MINIMA || 2);

export function precoPorNumero(quantidade: number): number {
  return quantidade >= QTD_MINIMA_PROMOCAO ? PRECO_PROMOCIONAL : PRECO_UNITARIO;
}

export function valorTotal(quantidade: number): number {
  return precoPorNumero(quantidade) * quantidade;
}
