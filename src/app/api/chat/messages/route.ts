// src/app/api/chat/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';
import User from '@/models/User';

const authOptions = {
  secret: '21b0133285c83665020046259b56217a7a787f1c9dd59fefe496f93dbba6deb2',
};

const ADMIN_EMAILS = ['admin@aldwycheuropeancapital.com', 'your-email@example.com'];

export async function POST(req: NextRequest) {
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

    const { chatId, message } = await req.json();

    if (!chatId || !message) {
      return NextResponse.json(
        { success: false, error: 'Chat ID and message are required' },
        { status: 400 }
      );
    }

    const chat: any = await Chat.findById(chatId);

    if (!chat) {
      return NextResponse.json({ success: false, error: 'Chat not found' }, { status: 404 });
    }

    // Add message with all required fields
    chat.messages.push({
      senderId: user._id.toString(),
      senderName: user.name || session.user.name || (isAdmin ? 'Admin' : 'User'),
      senderRole: isAdmin ? 'admin' : 'user',
      message,
      timestamp: new Date(),
      read: false
    });

    // Update status
    if (isAdmin && chat.status === 'pending') {
      chat.status = 'active';
      chat.adminId = user._id;
      chat.adminName = user.name || session.user.name || 'Admin';
    }

    chat.lastMessageAt = new Date();
    chat.updatedAt = new Date();
    await chat.save();

    return NextResponse.json({
      success: true,
      data: chat
    });

  } catch (error: any) {
    console.error('❌ Send message error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

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
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ success: false, error: 'Chat ID is required' }, { status: 400 });
    }

    const chat: any = await Chat.findById(chatId).populate('userId', 'name email');

    if (!chat) {
      return NextResponse.json({ success: false, error: 'Chat not found' }, { status: 404 });
    }

    // Mark messages as read
    chat.messages.forEach((msg: any) => {
      if (isAdmin && msg.senderRole === 'user') {
        msg.read = true;
      } else if (!isAdmin && msg.senderRole === 'admin') {
        msg.read = true;
      }
    });

    await chat.save();

    return NextResponse.json({
      success: true,
      data: chat
    });

  } catch (error: any) {
    console.error('❌ Get messages error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}