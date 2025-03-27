import * as crypto from 'crypto';

export function signAlchemyWebhook(data: any) {
  if (!process.env.ALCHEMY_WEBHOOK_KEY) {
    throw new Error('ALCHEMY_KEY environment variable is not set');
  }
  const payload = JSON.stringify(data);

  // Generate HMAC-SHA256 signature using hex digest to match verification
  const hmac = crypto.createHmac('sha256', process.env.ALCHEMY_WEBHOOK_KEY);
  const signature = hmac.update(payload).digest('hex');

  return {
    payload,
    signature,
  };
}
