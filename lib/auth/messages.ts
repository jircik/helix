const BY_CODE: Record<string, string> = {
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail.',
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  INVALID_PASSWORD: 'Senha atual incorreta.',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
};

export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  if (error?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  return (error?.code && BY_CODE[error.code]) || 'Não foi possível concluir. Tente novamente.';
}
