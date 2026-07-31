import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;
let clientInitAttempted = false;

function getClient() {
  if (clientInitAttempted) return client;
  clientInitAttempted = true;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

export interface SendWhatsAppResult {
  sent: boolean;
  error?: string;
}

/** `to` must be an E.164 phone number, e.g. +351912345678 */
export async function sendWhatsApp(to: string, message: string): Promise<SendWhatsAppResult> {
  const c = getClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!c || !from) {
    return { sent: false, error: "Twilio não está configurado (defina TWILIO_ACCOUNT_SID/AUTH_TOKEN/TWILIO_WHATSAPP_FROM)." };
  }
  try {
    await c.messages.create({
      from,
      to: `whatsapp:${to}`,
      body: message,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}
