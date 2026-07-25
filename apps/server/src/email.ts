import { config } from "./config.js";
import { logger } from "./logger.js";

interface EmailInput { to: string; subject: string; text: string; html?: string; }
export function emailReady(): boolean { return config.emailProvider === "resend" && Boolean(config.resendApiKey && config.emailFrom); }
export async function sendEmail(input: EmailInput): Promise<boolean> {
  if (!emailReady()) { logger.info({ subject: input.subject }, "E-mail não enviado: provedor desativado"); return false; }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${config.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: config.emailFrom, to: [input.to], subject: input.subject, text: input.text, ...(input.html ? { html: input.html } : {}) })
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") ?? undefined;
    logger.warn({ status: response.status, requestId, subject: input.subject }, "Falha ao enviar e-mail");
    return false;
  }
  return true;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const link = `${config.appPublicUrl}/?admin=1&reset=${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: "Redefinição de senha do VibeVenue",
    text: `Recebemos um pedido para redefinir sua senha. Use o link abaixo em até ${config.passwordResetMinutes} minutos:\n\n${link}\n\nSe você não fez o pedido, ignore esta mensagem e revise seus dispositivos conectados.`,
    html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${link}">Redefinir minha senha</a></p><p>O link expira em ${config.passwordResetMinutes} minutos. Se você não fez o pedido, ignore esta mensagem e revise seus dispositivos conectados.</p>`
  });
}

export async function sendSecurityNotice(email: string, title: string, message: string): Promise<boolean> {
  return sendEmail({ to: email, subject: `Segurança VibeVenue: ${title}`, text: `${message}\n\nAcesse ${config.appPublicUrl}/?admin=1 para revisar sua conta.` });
}
