import { NextRequest, NextResponse } from 'next/server';
import { sendSimpleEmail } from '@/lib/mail';

export const runtime = 'nodejs';

const CONTACT_RECIPIENT = 'support@aldwycheuropeancapital.com';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firstName = String(body?.firstName || '').trim();
    const lastName = String(body?.lastName || '').trim();
    const email = String(body?.email || '').trim();
    const phone = String(body?.phone || '').trim();
    const message = String(body?.message || '').trim();

    if (!firstName || !email || !message) {
      return NextResponse.json(
        { error: 'First name, email, and message are required.' },
        { status: 400 }
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const subject = `New Enquiry from ${fullName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d2440; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #c9a962; margin: 0;">New Website Enquiry</h2>
        </div>
        <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p style="color: #0d2440;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p style="color: #0d2440;"><strong>Email:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p style="color: #0d2440;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-top: 16px;">
            <div style="color: #64748b; font-size: 13px; margin-bottom: 6px;">Message</div>
            <div style="color: #0d2440; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Aldwych European Capital — Website contact form
          </p>
        </div>
      </div>
    `;

    const text = `New website enquiry from ${fullName} <${email}>${phone ? `\nPhone: ${phone}` : ''}\n\n${message}`;

    try {
      await sendSimpleEmail(CONTACT_RECIPIENT, subject, text, html);
    } catch (err) {
      console.error('[contact] Failed to send enquiry email:', err);
      return NextResponse.json(
        { error: 'Could not send your message right now. Please try again later.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/contact error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
