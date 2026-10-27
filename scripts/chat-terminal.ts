/**
 * Terminal-based admin chat client
 * Usage: tsx scripts/chat-terminal.ts [adminEmail]
 *
 * Allows admins to list open support chats and send replies directly from the terminal.
 */

import * as readline from 'readline';
import connectDB from '../src/lib/mongodb';
import Chat from '../src/models/Chat';
import User from '../src/models/User';

const ADMIN_EMAIL = process.argv[2] || 'admin@aldwycheuropeancapital.com';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise(res => rl.question(q, res));

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

function c(color: keyof typeof colors, text: string) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatTime(date: Date) {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function printHeader() {
  console.clear();
  console.log(c('cyan', '═'.repeat(60)));
  console.log(c('bold', c('cyan', '  ALDWYCH EUROPEAN CAPITAL — Admin Chat Terminal')));
  console.log(c('dim', `  Logged in as: ${ADMIN_EMAIL}`));
  console.log(c('cyan', '═'.repeat(60)));
  console.log();
}

async function listChats(adminUser: any) {
  const chats = await Chat.find({ status: { $in: ['pending', 'active'] } })
    .sort({ lastMessageAt: -1 })
    .lean();

  if (chats.length === 0) {
    console.log(c('yellow', '  No open chats.\n'));
    return [];
  }

  console.log(c('bold', '  Open Support Chats:\n'));
  chats.forEach((chat: any, i) => {
    const unread = chat.messages.filter((m: any) => m.senderRole === 'user' && !m.read).length;
    const badge = unread > 0 ? c('red', ` [${unread} unread]`) : '';
    const statusColor = chat.status === 'pending' ? 'yellow' : 'green';
    console.log(
      `  ${c('bold', `${i + 1}.`)} ${c('white', chat.userName)} ${c('dim', `<${chat.userEmail}>`)}${badge}\n` +
      `     ${c('dim', 'Subject:')} ${chat.subject}\n` +
      `     ${c(statusColor, chat.status.toUpperCase())}  ${c('dim', formatTime(chat.lastMessageAt))}\n`
    );
  });

  return chats;
}

async function viewChat(chat: any) {
  console.log(c('cyan', '─'.repeat(60)));
  console.log(c('bold', `  Chat: ${chat.subject}`));
  console.log(c('dim', `  User: ${chat.userName} <${chat.userEmail}>`));
  console.log(c('cyan', '─'.repeat(60)));
  console.log();

  if (!chat.messages || chat.messages.length === 0) {
    console.log(c('dim', '  No messages yet.\n'));
    return;
  }

  for (const msg of chat.messages) {
    const isAdmin = msg.senderRole === 'admin';
    const prefix = isAdmin
      ? c('blue', `  [Admin - ${msg.senderName}]`)
      : c('green', `  [${msg.senderName}]`);
    const time = c('dim', ` ${formatTime(msg.timestamp)}`);
    console.log(`${prefix}${time}`);
    console.log(`  ${msg.message}\n`);
  }
}

async function sendMessage(chat: any, adminUser: any, message: string) {
  await Chat.findByIdAndUpdate(chat._id, {
    $push: {
      messages: {
        senderId: adminUser._id.toString(),
        senderName: adminUser.name || 'Admin',
        senderRole: 'admin',
        message,
        timestamp: new Date(),
        read: false,
      }
    },
    $set: {
      status: 'active',
      adminId: adminUser._id,
      adminName: adminUser.name || 'Admin',
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    }
  });
}

async function markRead(chatId: string) {
  await Chat.updateOne(
    { _id: chatId },
    { $set: { 'messages.$[elem].read': true } },
    { arrayFilters: [{ 'elem.senderRole': 'user' }] }
  );
}

async function chatLoop(chats: any[], adminUser: any) {
  const input = await ask(c('cyan', '\n  Enter chat number (or q to quit): '));

  if (input.trim().toLowerCase() === 'q') return false;

  const idx = parseInt(input.trim()) - 1;
  if (isNaN(idx) || idx < 0 || idx >= chats.length) {
    console.log(c('red', '  Invalid selection.\n'));
    return true;
  }

  const chat = chats[idx];
  await markRead(chat._id.toString());
  const freshChat = await Chat.findById(chat._id).lean();

  printHeader();
  await viewChat(freshChat);

  while (true) {
    const msg = await ask(c('cyan', '  Your message (or /back, /close, /refresh): '));

    if (msg.trim() === '/back') break;

    if (msg.trim() === '/close') {
      await Chat.findByIdAndUpdate(chat._id, { status: 'closed' });
      console.log(c('yellow', '  Chat closed.\n'));
      break;
    }

    if (msg.trim() === '/refresh') {
      const updated = await Chat.findById(chat._id).lean();
      printHeader();
      await viewChat(updated);
      continue;
    }

    if (!msg.trim()) continue;

    await sendMessage(chat, adminUser, msg.trim());
    console.log(c('dim', `  ✓ Sent at ${formatTime(new Date())}\n`));
  }

  return true;
}

async function main() {
  printHeader();

  await connectDB();

  const adminUser = await User.findOne({ email: ADMIN_EMAIL });
  if (!adminUser) {
    console.error(c('red', `  Admin user not found: ${ADMIN_EMAIL}`));
    console.error(c('dim', '  Run: tsx scripts/chat-terminal.ts <email>'));
    process.exit(1);
  }

  if (adminUser.role !== 'admin') {
    console.error(c('red', `  ${ADMIN_EMAIL} does not have admin role.`));
    process.exit(1);
  }

  while (true) {
    printHeader();
    const chats = await listChats(adminUser);

    if (chats.length === 0) {
      const again = await ask(c('cyan', '  Press Enter to refresh or q to quit: '));
      if (again.trim().toLowerCase() === 'q') break;
      continue;
    }

    const cont = await chatLoop(chats, adminUser);
    if (!cont) break;
  }

  console.log(c('cyan', '\n  Goodbye.\n'));
  rl.close();
  process.exit(0);
}

main().catch(err => {
  console.error(c('red', `\n  Error: ${err.message}`));
  process.exit(1);
});
