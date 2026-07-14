/** Utilitários de CPF (validação por dígitos verificadores). */

export function somenteDigitos(cpf: string): string {
  return (cpf || '').replace(/\D/g, '');
}

export function cpfValido(cpf: string): boolean {
  const c = somenteDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let i = 9; i < 11; i++) {
    let soma = 0;
    for (let num = 0; num < i; num++) soma += parseInt(c[num]) * (i + 1 - num);
    let dig = (soma * 10) % 11;
    if (dig === 10) dig = 0;
    if (dig !== parseInt(c[i])) return false;
  }
  return true;
}

/** Formata como 000.000.000-00 (parcial enquanto digita). */
export function formatarCpf(cpf: string): string {
  const c = somenteDigitos(cpf).slice(0, 11);
  return c
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
