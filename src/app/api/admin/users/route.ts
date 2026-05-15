// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Define the User schema if not already defined
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  checkingBalance: { type: Number, default: 0 },
  savingsBalance: { type: Number, default: 0 },
  investmentBalance: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define User interface
interface IUser {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  password?: string;
  checkingBalance?: number;
  savingsBalance?: number;
  investmentBalance?: number;
  verified?: boolean;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET(req: NextRequest) {
  try {
    console.log('Users API route called');
    
    // Connect to database using your existing connectDB function
    await connectDB();
    console.log('Connected to database');
    
    // Get the User model (check if it already exists first)
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    // Fetch all users without password field
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .lean<IUser[]>();
    
    console.log(`Found ${users.length} users in database`);
    
    // Format the users data
    const formattedUsers = users.map(user => ({
      _id: user._id.toString(), // Fixed: Properly type the _id field
      name: user.name || 'Unknown User',
      email: user.email || 'no-email@example.com',
      checkingBalance: Number(user.checkingBalance) || 0,
      savingsBalance: Number(user.savingsBalance) || 0,
      investmentBalance: Number(user.investmentBalance) || 0,
      verified: Boolean(user.verified),
      role: user.role || 'user',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    // Return success response with users
    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length,
      message: `Successfully loaded ${formattedUsers.length} users`
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    console.error('Error in users API route:', error);
    
    // Return error response
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch users',
      users: [],
      total: 0
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}