// File: src/models/User.ts
// CLEAN VERSION - NO EMBEDDED TRANSACTIONS

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  verified: boolean;

  // Three separate account balances
  checkingBalance: number;
  savingsBalance: number;
  investmentBalance: number;

  // Account details
  accountNumber?: string;
  routingNumber?: string;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  email: {
    type: String, 
    required: true, 
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 8, 
    select: false 
  },

  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  verified: { 
    type: Boolean, 
    default: false 
  },

  // Three separate balances
  checkingBalance: { 
    type: Number, 
    default: 0 
  },
  savingsBalance: { 
    type: Number, 
    default: 0 
  },
  investmentBalance: { 
    type: Number, 
    default: 0 
  },

  // Account details
  accountNumber: { 
    type: String, 
    required: false 
  },
  routingNumber: { 
    type: String, 
    required: false 
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      ret._id = ret._id.toString() as any;
      delete (ret as any).password;
      delete (ret as any).__v;
      return ret;
    },
  },
});

// Password hashing
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as any);
  }
});

// Auto-generate account & routing numbers
UserSchema.pre<IUser>('save', function(next) {
  if (!this.accountNumber) {
    this.accountNumber = 'AC' + Math.floor(1e8 + Math.random() * 9e8);
  }
  if (!this.routingNumber) {
    this.routingNumber = 'RT' + Math.floor(1e8 + Math.random() * 9e8);
  }
  next();
});

UserSchema.methods.comparePassword = function(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;