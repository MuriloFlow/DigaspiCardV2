export type DigitacaoQuantityLike = {
  quantity?: number | null;
};

export function getDigitacaoQuantity(digitacao: DigitacaoQuantityLike) {
  const quantity = Number(digitacao.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
}

export function sumDigitacoes(digitacoes: DigitacaoQuantityLike[]) {
  return digitacoes.reduce((total, digitacao) => total + getDigitacaoQuantity(digitacao), 0);
}
