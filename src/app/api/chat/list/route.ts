// src/app/api/chat/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';
import User from '@/models/User';

const authOptions = {
  secret: '21b0133285c83665020046259b56217a7a787f1c9dd59fefe496f93dbba6deb2',
};

const ADMIN_EMAILS = ['admin@aldwycheuropeancapital.com', 'your-email@example.com'];

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(session.user.email.toLowerCase());

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query: any = {};

    if (isAdmin) {
      // Admin sees all chats
      if (status && status !== 'all') {
        query.status = status;
      }
    } else {
      // Users see only their chats
      query.userId = user._id;
      if (status && status !== 'all') {
        query.status = status;
      }
    }

    const chats = await Chat.find(query)
      .populate('userId', 'name email')
      .sort({ lastMessageAt: -1 })
      .limit(isAdmin ? 100 : 20)
      .lean();

    // Calculate unread count based on role
    const chatsWithUnread = chats.map((chat: any) => {
      const unreadCount = chat.messages.filter((msg: any) => {
        if (isAdmin) {
          return msg.senderRole === 'user' && !msg.read;
        } else {
          return msg.senderRole === 'admin' && !msg.read;
        }
      }).length;

      return {
        ...chat,
        unreadCount
      };
    });

    return NextResponse.json({
      success: true,
      data: chatsWithUnread
    });

  } catch (error: any) {
    console.error('❌ Chat list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}