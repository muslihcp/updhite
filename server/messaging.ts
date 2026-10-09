import type { MessageDeliveryStatus, MessageLog, MessagingConfigStatus } from '../src/types.ts';

export function getMessagingConfigStatus(): MessagingConfigStatus {
  const twilioSid = !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.trim() !== '';
  const twilioToken = !!process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN.trim() !== '';
  const twilioPhone = !!process.env.TWILIO_FROM_PHONE && process.env.TWILIO_FROM_PHONE.trim() !== '';
  const twilioWhatsApp = !!process.env.TWILIO_WHATSAPP_FROM && process.env.TWILIO_WHATSAPP_FROM.trim() !== '';
  const gatewayUrl = !!process.env.SMS_GATEWAY_URL && process.env.SMS_GATEWAY_URL.trim() !== '';

  const twilioReady = twilioSid && twilioToken && (twilioPhone || twilioWhatsApp);
  const isConfigured = twilioReady || gatewayUrl;

  let providerName = 'None (Unconfigured)';
  if (twilioReady) {
    providerName = twilioWhatsApp ? 'Twilio (SMS & WhatsApp)' : 'Twilio SMS';
  } else if (gatewayUrl) {
    providerName = 'Custom SMS Gateway Webhook';
  }

  const notice = isConfigured
    ? 'Messaging provider active. Real outbound SMS/WhatsApp messages will be dispatched.'
    : 'Messaging provider credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE or SMS_GATEWAY_URL) are not set. Outbound messages are recorded in audit logs with UNCONFIGURED_PROVIDER status until API keys are configured.';

  return {
    isConfigured,
    providerName,
    twilioSidSet: twilioSid,
    twilioTokenSet: twilioToken,
    twilioPhoneSet: twilioPhone,
    whatsappSenderSet: twilioWhatsApp,
    gatewayUrlSet: gatewayUrl,
    notice,
  };
}

export async function dispatchMessage(params: {
  id: string;
  type: MessageLog['type'];
  workId: string;
  ticketNumber: string;
  recipientRole: string;
  recipientName: string;
  recipientPhone: string;
  messageText: string;
}): Promise<MessageLog> {
  const timestamp = new Date().toISOString();
  const phone = params.recipientPhone?.trim() || '';

  if (!phone) {
    return {
      id: params.id,
      type: params.type,
      workId: params.workId,
      ticketNumber: params.ticketNumber,
      recipientRole: params.recipientRole,
      recipientName: params.recipientName,
      recipientPhone: '(None configured)',
      messageText: params.messageText,
      status: 'FAILED',
      provider: 'none',
      statusDetails: 'Recipient has no contact phone number configured.',
      timestamp,
    };
  }

  const config = getMessagingConfigStatus();

  // 1. Check Twilio integration
  if (config.twilioSidSet && config.twilioTokenSet) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID!;
      const token = process.env.TWILIO_AUTH_TOKEN!;
      const fromPhone = process.env.TWILIO_FROM_PHONE || process.env.TWILIO_WHATSAPP_FROM;

      if (!fromPhone) {
        return {
          id: params.id,
          type: params.type,
          workId: params.workId,
          ticketNumber: params.ticketNumber,
          recipientRole: params.recipientRole,
          recipientName: params.recipientName,
          recipientPhone: phone,
          messageText: params.messageText,
          status: 'UNCONFIGURED_PROVIDER',
          provider: 'twilio',
          statusDetails: 'TWILIO_FROM_PHONE or TWILIO_WHATSAPP_FROM is missing in environment.',
          timestamp,
        };
      }

      // Basic Auth header for Twilio API
      const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

      const bodyData = new URLSearchParams();
      bodyData.append('To', phone);
      bodyData.append('From', fromPhone);
      bodyData.append('Body', params.messageText);

      const resp = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      });

      const responseJson: any = await resp.json().catch(() => ({}));

      if (resp.ok && responseJson.sid) {
        return {
          id: params.id,
          type: params.type,
          workId: params.workId,
          ticketNumber: params.ticketNumber,
          recipientRole: params.recipientRole,
          recipientName: params.recipientName,
          recipientPhone: phone,
          messageText: params.messageText,
          status: 'DELIVERED',
          provider: fromPhone.startsWith('whatsapp:') ? 'whatsapp' : 'twilio',
          providerMessageId: responseJson.sid,
          statusDetails: `Dispatched successfully via Twilio. Message SID: ${responseJson.sid}. Status: ${responseJson.status}`,
          timestamp,
        };
      } else {
        return {
          id: params.id,
          type: params.type,
          workId: params.workId,
          ticketNumber: params.ticketNumber,
          recipientRole: params.recipientRole,
          recipientName: params.recipientName,
          recipientPhone: phone,
          messageText: params.messageText,
          status: 'FAILED',
          provider: 'twilio',
          statusDetails: `Twilio API error HTTP ${resp.status}: ${responseJson.message || 'Transmission failed'}`,
          timestamp,
        };
      }
    } catch (err: any) {
      return {
        id: params.id,
        type: params.type,
        workId: params.workId,
        ticketNumber: params.ticketNumber,
        recipientRole: params.recipientRole,
        recipientName: params.recipientName,
        recipientPhone: phone,
        messageText: params.messageText,
        status: 'FAILED',
        provider: 'twilio',
        statusDetails: `Network error connecting to Twilio: ${err.message || String(err)}`,
        timestamp,
      };
    }
  }

  // 2. Check Custom SMS Gateway
  if (config.gatewayUrlSet) {
    try {
      const gatewayUrl = process.env.SMS_GATEWAY_URL!;
      const apiKey = process.env.SMS_GATEWAY_API_KEY || '';

      const resp = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          to: phone,
          message: params.messageText,
          ticketNumber: params.ticketNumber,
          type: params.type,
        }),
      });

      const respData: any = await resp.json().catch(() => ({}));

      if (resp.ok) {
        return {
          id: params.id,
          type: params.type,
          workId: params.workId,
          ticketNumber: params.ticketNumber,
          recipientRole: params.recipientRole,
          recipientName: params.recipientName,
          recipientPhone: phone,
          messageText: params.messageText,
          status: 'DELIVERED',
          provider: 'sms_gateway',
          providerMessageId: respData.id || respData.messageId || 'GATEWAY-OK',
          statusDetails: 'Delivered to custom SMS gateway endpoint.',
          timestamp,
        };
      } else {
        return {
          id: params.id,
          type: params.type,
          workId: params.workId,
          ticketNumber: params.ticketNumber,
          recipientRole: params.recipientRole,
          recipientName: params.recipientName,
          recipientPhone: phone,
          messageText: params.messageText,
          status: 'FAILED',
          provider: 'sms_gateway',
          statusDetails: `SMS gateway returned error ${resp.status}: ${respData.error || 'Failed'}`,
          timestamp,
        };
      }
    } catch (err: any) {
      return {
        id: params.id,
        type: params.type,
        workId: params.workId,
        ticketNumber: params.ticketNumber,
        recipientRole: params.recipientRole,
        recipientName: params.recipientName,
        recipientPhone: phone,
        messageText: params.messageText,
        status: 'FAILED',
        provider: 'sms_gateway',
        statusDetails: `Network error contacting SMS gateway: ${err.message || String(err)}`,
        timestamp,
      };
    }
  }

  // 3. Provider credentials not configured
  return {
    id: params.id,
    type: params.type,
    workId: params.workId,
    ticketNumber: params.ticketNumber,
    recipientRole: params.recipientRole,
    recipientName: params.recipientName,
    recipientPhone: phone,
    messageText: params.messageText,
    status: 'UNCONFIGURED_PROVIDER',
    provider: 'none',
    statusDetails:
      'Provider unconfigured: Outbound messaging requires TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN or SMS_GATEWAY_URL in environment. Carrier delivery held.',
    timestamp,
  };
}
