// src/lib/authOptions.ts
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import jsonwebtoken from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { AUTH_SECRET } from '@/lib/authSecret';
import { check as rateCheck, POLICIES } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    checkingBalance?: number;
    savingsBalance?: number;
    investmentBalance?: number;
    /** True once the emailed login code has been verified for this session. */
    otpVerified?: boolean;
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
      otpVerified?: boolean;
    };
  }
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,

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
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing credentials');
            throw new Error('Email and password required');
          }

          await dbConnect();

          // Use lowercase email for consistency
          const email = credentials.email.toLowerCase().trim();
          const password = credentials.password.trim();

          const fwd = (req?.headers?.['x-forwarded-for'] as string) || '';
          const ip = fwd.split(',')[0].trim() || 'unknown';

          // Brute-force protection: limit attempts per IP and per account.
          const [ipLimit, emailLimit] = await Promise.all([
            rateCheck(`login:ip:${ip}`, POLICIES.authLogin),
            rateCheck(`login:email:${email}`, POLICIES.authLogin),
          ]);

          if (!ipLimit.allowed || !emailLimit.allowed) {
            await audit({
              action: 'auth.login_failed',
              actorEmail: email,
              outcome: 'blocked',
              severity: 'warning',
              details: { channel: 'web', reason: 'rate_limited', ip },
            });
            throw new Error('Too many sign-in attempts. Please try again later.');
          }

          console.log('🔍 Auth attempt for:', email);

          const user = await User.findOne({ email }).select('+password');

          if (!user) {
            console.log('❌ User not found:', email);
            await audit({
              action: 'auth.login_failed',
              actorEmail: email,
              outcome: 'failure',
              details: { channel: 'web', reason: 'unknown_user', ip },
            });
            throw new Error('Invalid credentials');
          }

          console.log('✅ User found:', user.email);

          // Compare password
          const isMatch = await bcrypt.compare(password, user.password);

          console.log('🔐 Password match:', isMatch);

          if (!isMatch) {
            console.log('❌ Password mismatch');
            await audit({
              action: 'auth.login_failed',
              actorId: user._id.toString(),
              actorEmail: email,
              outcome: 'failure',
              details: { channel: 'web', reason: 'bad_password', ip },
            });
            throw new Error('Invalid credentials');
          }

          console.log('✅ Authentication successful for:', user.email);

          await audit({
            action: 'auth.login',
            actorId: user._id.toString(),
            actorEmail: user.email,
            actorRole: user.role || 'user',
            outcome: 'success',
            details: { channel: 'web', ip },
          });

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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.checkingBalance = (user as any).checkingBalance;
        token.savingsBalance = (user as any).savingsBalance;
        token.investmentBalance = (user as any).investmentBalance;
        // Password alone is not enough: the emailed login code must be
        // verified before protected pages open (see middleware).
        token.otpVerified = false;
      }

      // Second factor completion. The client calls useSession().update with
      // an otpProof it received from /api/auth/otp/verify-login. The proof is
      // a short-lived JWT signed with AUTH_SECRET, so it cannot be forged by
      // the client — we verify signature, purpose, and that it was issued for
      // this exact user.
      if (trigger === 'update' && (session as any)?.otpProof) {
        try {
          const proof = jsonwebtoken.verify(
            (session as any).otpProof,
            AUTH_SECRET
          ) as { sub?: string; purpose?: string };
          if (proof.purpose === 'login-otp' && proof.sub && proof.sub === token.id) {
            token.otpVerified = true;
          }
        } catch {
          // Invalid or expired proof — leave otpVerified unchanged.
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.checkingBalance = token.checkingBalance;
      session.user.savingsBalance = token.savingsBalance;
      session.user.investmentBalance = token.investmentBalance;
      session.user.otpVerified = token.otpVerified === true;
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