/**
 * Utilitários de segurança para o projeto Standard.
 */

/**
 * Sanitiza uma string removendo tags HTML e scripts.
 * Faz APENAS strip de tags, sem escape duplo para evitar corrupção de dados.
 * @param str A string a ser sanitizada.
 * @returns A string limpa.
 */
export const sanitizeString = (str: any): string => {
  if (typeof str !== 'string') {
    return str ? String(str) : '';
  }

  // Remove tags HTML apenas (sem escape duplo que corrompe dados com &)
  return str.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Sanitiza um objeto recursivamente (útil para linhas de planilha).
 */
export const sanitizeObject = <T extends object>(obj: T): T => {
  const newObj = { ...obj } as any;
  for (const key in newObj) {
    if (typeof newObj[key] === 'string') {
      newObj[key] = sanitizeString(newObj[key]);
    } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
      newObj[key] = sanitizeObject(newObj[key]);
    }
  }
  return newObj;
};
