import { Injectable } from '@nestjs/common';
import { ResendClientService } from './resend-client.service';

/**
 * Camada de mais alto nível sobre o cliente de email: monta os templates de cada
 * tipo de mensagem transacional e delega o envio ao ResendClientService.
 *
 * Os emails desta frente carregam um OTP de 6 dígitos (ver decisões em auth).
 */
@Injectable()
export class MailService {
  constructor(private readonly resend: ResendClientService) {}

  async sendEmailVerificationCode(
    to: string,
    name: string,
    code: string,
  ): Promise<boolean> {
    const firstName = name.split(' ')[0];
    return this.resend.send({
      to,
      subject: 'Confirme seu e-mail no LemonFin',
      text:
        `Olá, ${firstName}!\n\n` +
        `Seu código de confirmação é: ${code}\n\n` +
        `Ele expira em 15 minutos. Se você não criou uma conta no LemonFin, ignore este e-mail.`,
      html: this.otpTemplate({
        title: 'Confirme seu e-mail',
        greeting: `Olá, ${firstName}!`,
        intro: 'Use o código abaixo para confirmar seu e-mail no LemonFin:',
        code,
        footer:
          'O código expira em 15 minutos. Se você não criou uma conta no LemonFin, é só ignorar este e-mail.',
      }),
    });
  }

  async sendPasswordResetCode(
    to: string,
    name: string,
    code: string,
  ): Promise<boolean> {
    const firstName = name.split(' ')[0];
    return this.resend.send({
      to,
      subject: 'Redefinição de senha — LemonFin',
      text:
        `Olá, ${firstName}!\n\n` +
        `Seu código para redefinir a senha é: ${code}\n\n` +
        `Ele expira em 15 minutos. Se você não pediu para redefinir sua senha, ignore este e-mail — sua conta segue segura.`,
      html: this.otpTemplate({
        title: 'Redefinir senha',
        greeting: `Olá, ${firstName}!`,
        intro: 'Use o código abaixo para redefinir a senha da sua conta:',
        code,
        footer:
          'O código expira em 15 minutos. Se você não pediu para redefinir sua senha, ignore este e-mail — sua conta segue segura.',
      }),
    });
  }

  /**
   * Template HTML único para os emails de OTP. Estilos inline (clientes de email
   * descartam <style>/CSS externo). Paleta alinhada à marca LemonFin (limão).
   */
  private otpTemplate(p: {
    title: string;
    greeting: string;
    intro: string;
    code: string;
    footer: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f6f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;border:1px solid #e7e9e3;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <span style="font-size:20px;font-weight:800;color:#1a1d16;">🍋 LemonFin</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <h1 style="margin:0 0 4px;font-size:18px;color:#1a1d16;">${p.title}</h1>
              <p style="margin:0 0 16px;font-size:14px;color:#5b6150;">${p.greeting}</p>
              <p style="margin:0 0 20px;font-size:14px;color:#5b6150;line-height:1.5;">${p.intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <div style="background:#f3f6e9;border:1px solid #d9e6b8;border-radius:12px;padding:18px;text-align:center;">
                <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#3f5311;font-family:'Courier New',monospace;">${p.code}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;">
              <p style="margin:0;font-size:12px;color:#8a907c;line-height:1.5;">${p.footer}</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#a3a89a;">LemonFin · Suas finanças, no controle.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
