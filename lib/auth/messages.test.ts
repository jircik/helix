import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './messages';

describe('authErrorMessage', () => {
  it.each([
    [{ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' }, 'Já existe uma conta com este e-mail.'],
    [{ code: 'USER_ALREADY_EXISTS' }, 'Já existe uma conta com este e-mail.'],
    [{ code: 'INVALID_EMAIL_OR_PASSWORD' }, 'E-mail ou senha incorretos.'],
    [{ code: 'INVALID_PASSWORD' }, 'Senha atual incorreta.'],
    [{ code: 'PASSWORD_TOO_SHORT' }, 'A senha precisa ter pelo menos 8 caracteres.'],
    [{ status: 429 }, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    [{ code: 'QUALQUER_OUTRO' }, 'Não foi possível concluir. Tente novamente.'],
    [null, 'Não foi possível concluir. Tente novamente.'],
  ])('%j', (input, expected) => {
    expect(authErrorMessage(input)).toBe(expected);
  });
});
