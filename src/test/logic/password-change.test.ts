import { describe, expect, it } from "vitest";
import { validatePasswordChangeInput } from "@/lib/password-change";

describe("validatePasswordChangeInput", () => {
  it("requires the current password", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "",
        newPassword: "nova-senha",
        confirmPassword: "nova-senha",
      }),
    ).toBe("Informe sua senha atual.");
  });

  it("requires at least 6 characters for the new password", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "senha-atual",
        newPassword: "12345",
        confirmPassword: "12345",
      }),
    ).toBe("Nova senha precisa de pelo menos 6 caracteres.");
  });

  it("requires matching confirmation", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "senha-atual",
        newPassword: "nova-senha",
        confirmPassword: "outra-senha",
      }),
    ).toBe("As senhas nao coincidem.");
  });

  it("rejects reusing the current password", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "mesma-senha",
        newPassword: "mesma-senha",
        confirmPassword: "mesma-senha",
      }),
    ).toBe("Escolha uma senha diferente da atual.");
  });

  it("accepts a valid password change", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "senha-atual",
        newPassword: "nova-senha",
        confirmPassword: "nova-senha",
      }),
    ).toBeNull();
  });
});
