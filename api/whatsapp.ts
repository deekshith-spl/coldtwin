import { Redis } from '@upstash/redis';
import twilio from 'twilio';
import { handleCommand } from '../src/whatsapp/commands';

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
  const signature = req.headers['x-twilio-signature'];

  // Reject requests that cannot be authenticated as Twilio requests.
  if (
    !authToken ||
    !webhookUrl ||
    !signature ||
    !twilio.validateRequest(
      authToken,
      String(signature),
      webhookUrl,
      req.body
    )
  ) {
    return res.status(403).send('Invalid Twilio signature');
  }

  try {
    const incomingPhone = String(req.body?.From || '');
    const message = String(req.body?.Body || '');

    const snapshot = await redis.get<any>(
      'coldtwin:snapshot'
    );

    let reply: string;

    if (!snapshot) {
      reply = 'ColdTwin has no synchronized data yet.';
    } else {
      reply = handleCommand(
        message,
        incomingPhone,
        snapshot
      );
    }

    const twiml = new twilio.twiml.MessagingResponse();

    twiml.message(reply);

    res.setHeader(
      'Content-Type',
      'text/xml; charset=utf-8'
    );

    return res.status(200).send(twiml.toString());
  } catch (error) {
    console.error('WhatsApp webhook failed:', error);

    // Return a temporary failure rather than inventing a recommendation.
    return res.status(500).send('Unable to process message');
  }
}