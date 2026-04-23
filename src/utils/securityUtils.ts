/**
 * Utilitários de segurança para o projeto Trainify.
 */

/**
 * Sanitiza uma string removendo tags HTML e possíveis scripts.
 * @param str A string a ser sanitizada.
 * @returns A string limpa.
 */
export const sanitizeString = (str: any): string => {
  if (typeof str !== 'string') {
    return str ? String(str) : '';
  }

  // Remove tags HTML básicas
  return str
    .replace(/<[^>]*>?/gm, '') // Remove tags HTML
    .replace(/[&<>"']/g, (m) => { // Escapa caracteres especiais
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return map[m];
    })
    .trim();
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
