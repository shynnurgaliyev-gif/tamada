import type { AppEnv } from '@octiqa/config';

export interface WhatsAppProvider {
  sendVerificationCode(phone: string, code: string, purpose: 'signup' | 'reset_password'): Promise<void>;
}

function createStubProvider(): WhatsAppProvider {
  return {
    async sendVerificationCode(phone, code, purpose) {
      // TODO: Replace with real WhatsApp provider
      console.log(`[WhatsApp STUB] phone=${phone} purpose=${purpose} code=${code}`);
    },
  };
}

export function createWhatsAppProvider(env: AppEnv): WhatsAppProvider {
  if (env.WHATSAPP_PROVIDER === 'stub') {
    return createStubProvider();
  }
  throw new Error(`WHATSAPP_PROVIDER '${env.WHATSAPP_PROVIDER}' not implemented`);
}
