// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendWelcomeEmail } from '@/lib/mail';

// Helper functions for generating account details
function generateAccountNumber() {
  return 'AC' + Math.floor(1e8 + Math.random() * 9e8);
}

function generateRoutingNumber() {
  return 'RT' + Math.floor(1e8 + Math.random() * 9e8);
}

function generateBitcoinAddress() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = '1'; // Bitcoin addresses start with 1 or 3
  for (let i = 0; i < 33; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Registration request body:', body);
    
    // Extract fields - handle both simple and enhanced forms
    const {
      // Simple form fields
      name,
      email,
      password,
      // Enhanced form fields
      firstName,
      lastName,
      confirmPassword,
      dob,
      nationality,
      idType,
      idNumber,
      address,
      city,
      postalCode,
      country,
      phone,
      employmentStatus,
      monthlyIncome,
      purpose,
      terms,
      privacy,
      marketing,
    } = body;

    // Determine form type and construct full name
    const isEnhancedForm = !!(firstName || lastName);
    const fullName = isEnhancedForm 
      ? `${firstName || ''} ${lastName || ''}`.trim()
      : name;

    // Normalize email
    const userEmail = email?.toLowerCase().trim();
    const userPassword = password;

    // Basic validation
    if (!fullName || !userEmail || !userPassword) {
      console.log('Missing basic fields:', { fullName, userEmail, hasPassword: !!userPassword });
      return NextResponse.json({ 
        message: 'Name, email, and password are required',
        errors: {
          name: !fullName ? 'Name is required' : undefined,
          email: !userEmail ? 'Email is required' : undefined,
          password: !userPassword ? 'Password is required' : undefined,
        }
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password validation
    if (userPassword.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Enhanced form specific validations
    if (isEnhancedForm) {
      // Check password match if confirmPassword is provided
      if (confirmPassword && userPassword !== confirmPassword) {
        return NextResponse.json(
          { message: 'Passwords do not match' },
          { status: 400 }
        );
      }

      // Age validation if DOB is provided
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 18) {
          return NextResponse.json(
            { message: 'You must be at least 18 years old to register' },
            { status: 400 }
          );
        }
      }

      // Phone validation if provided
      if (phone && !/^\+?\d{10,15}$/.test(phone.replace(/[\s-]/g, ''))) {
        return NextResponse.json(
          { message: 'Please enter a valid phone number' },
          { status: 400 }
        );
      }
    }

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: userEmail });
    if (existingUser) {
      console.log('User already exists:', userEmail);
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Generate account details
    const accountNumber = generateAccountNumber();
    const routingNumber = generateRoutingNumber();

    // Create initial transaction - INCLUDE IN userData, don't push after
    const initTransaction = {
      type: 'deposit' as const,
      amount: 0,
      description: 'Account opened',
      date: new Date(),
      balanceAfter: 0,
    };

    // Create user object with transactions included
    const userData: any = {
      name: fullName,
      email: userEmail,
      password: userPassword,
      role: 'user',
      verified: false,
      checkingBalance: 0,
      savingsBalance: 0,
      investmentBalance: 0,
      accountNumber,
      routingNumber,
      transactions: [initTransaction], // Include initial transaction here
    };

    // Store enhanced profile data if available
    if (isEnhancedForm) {
      userData.metadata = {
        firstName,
        lastName,
        dateOfBirth: dob ? new Date(dob) : undefined,
        nationality,
        identification: {
          type: idType || 'passport',
          number: idNumber
        },
        address: {
          street: address,
          city,
          postalCode,
          country
        },
        phone,
        employment: {
          status: employmentStatus,
          monthlyIncome
        },
        accountPurpose: purpose,
        consents: {
          terms: terms || false,
          privacy: privacy || false,
          marketing: marketing || false
        }
      };
    }

    // Create the user - transactions already included
    console.log('Creating user:', userEmail);
    const newUser = await User.create(userData);

    console.log('User created successfully:', newUser.email);

    // Send welcome email (don't fail registration if email fails)
    try {
      console.log('Attempting to send welcome email to:', userEmail);
      const emailResult = await sendWelcomeEmail(userEmail, { name: fullName });
      
      if (emailResult.failed) {
        console.warn('Welcome email failed but registration continues:', emailResult.error);
      } else if (emailResult.skipped) {
        console.log('Welcome email skipped (SMTP not configured)');
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (emailError) {
      console.error('Welcome email error (non-fatal):', emailError);
      // Continue with registration even if email fails
    }

    // Return success response
    return NextResponse.json({ 
      message: 'Account created successfully! You can now sign in.',
      success: true,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        accountNumber: newUser.accountNumber,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { message: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      { 
        message: 'Registration failed. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}