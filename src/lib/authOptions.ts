// src/lib/authOptions.ts
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    checkingBalance?: number;
    savingsBalance?: number;
    investmentBalance?: number;
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      checkingBalance?: number;
      savingsBalance?: number;
      investmentBalance?: number;
    };
  }
}

export const authOptions: NextAuthOptions = {
  // FIX: Use environment variable, not hardcoded secret
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing credentials');
            throw new Error('Email and password required');
          }

          await dbConnect();

          // Use lowercase email for consistency
          const email = credentials.email.toLowerCase().trim();
          const password = credentials.password.trim();

          console.log('🔍 Auth attempt for:', email);

          const user = await User.findOne({ email }).select('+password');
          
          if (!user) {
            console.log('❌ User not found:', email);
            throw new Error('Invalid credentials');
          }

          console.log('✅ User found:', user.email);

          // Compare password
          const isMatch = await bcrypt.compare(password, user.password);
          
          console.log('🔐 Password match:', isMatch);

          if (!isMatch) {
            console.log('❌ Password mismatch');
            throw new Error('Invalid credentials');
          }

          console.log('✅ Authentication successful for:', user.email);

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            checkingBalance: user.checkingBalance || 0,
            savingsBalance: user.savingsBalance || 0,
            investmentBalance: user.investmentBalance || 0,
          };
        } catch (error) {
          console.error('❌ Auth error:', error);
          return null;
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.checkingBalance = (user as any).checkingBalance;
        token.savingsBalance = (user as any).savingsBalance;
        token.investmentBalance = (user as any).investmentBalance;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.checkingBalance = token.checkingBalance;
      session.user.savingsBalance = token.savingsBalance;
      session.user.investmentBalance = token.investmentBalance;
      return session;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },

  events: {
    async signIn({ user }) {
      console.log(`✅ User signed in: ${user?.email}`);
    },
    async signOut({ token }) {
      console.log(`❌ User signed out: ${token?.email}`);
    }
  },

  debug: process.env.NODE_ENV === 'development',
};