/** Validação client-side — mesmas regras do backend (app/services/validacao.py),
 *  para feedback imediato no campo. O backend revalida tudo. */

export const soDigitos = (v: string): string => (v || '').replace(/\D+/g, '');

export function nisValido(v: string): boolean {
  const nis = soDigitos(v);
  if (nis.length !== 11) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(nis[i]) * pesos[i];
  const resto = soma % 11;
  const dig = resto < 2 ? 0 : 11 - resto;
  return dig === Number(nis[10]);
}

export function dataBrValida(v: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  const hoje = new Date();
  if (d > hoje || hoje.getFullYear() - ano > 120) return null;
  return d;
}

export const emailValido = (v: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v || '');

export const cepValido = (v: string): boolean => soDigitos(v).length === 8;

export function nomeValido(v: string): boolean {
  const s = (v || '').trim();
  if (s.length < 5 || !/^[A-Za-zÀ-ÿ' ]+$/.test(s)) return false;
  return !/(.)\1{4,}/.test(s.toLowerCase());
}

export const mascaraCpf = (v: string): string =>
  soDigitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');

export const mascaraData = (v: string): string =>
  soDigitos(v)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');

export const mascaraCep = (v: string): string =>
  soDigitos(v)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
