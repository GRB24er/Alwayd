// src/models/Chat.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  adminId?: mongoose.Types.ObjectId;
  adminName?: string;
  status: 'active' | 'closed' | 'pending';
  subject: string;
  messages: IMessage[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
}, { _id: false });

const ChatSchema = new Schema<IChat>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User' },
  adminName: { type: String },
  status: { type: String, enum: ['active', 'closed', 'pending'], default: 'pending' },
  subject: { type: String, required: true },
  messages: [MessageSchema],
  lastMessageAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
 toJSON: {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete (ret as any).__v;
    return ret;
  }
}
});

const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);
export default Chat;