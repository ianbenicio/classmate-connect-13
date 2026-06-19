export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function validatePasswordChangeInput(input: PasswordChangeInput): string | null {
  if (!input.currentPassword) return "Informe sua senha atual.";
  if (input.newPassword.length < 6) return "Nova senha precisa de pelo menos 6 caracteres.";
  if (input.newPassword !== input.confirmPassword) return "As senhas nao coincidem.";
  if (input.newPassword === input.currentPassword) return "Escolha uma senha diferente da atual.";
  return null;
}
