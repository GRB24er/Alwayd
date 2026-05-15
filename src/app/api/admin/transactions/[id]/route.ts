// src/app/api/admin/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

// GET - Get single transaction
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    // Await params first
    const { id } = await params;
    
    const transaction = await Transaction.findById(id)
      .populate('userId', 'name email checkingBalance savingsBalance investmentBalance');
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      transaction
    });
    
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch transaction',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PATCH - Update transaction
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    await connectDB();
    
    const transaction = await Transaction.findByIdAndUpdate(
      id,
      { 
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction
    });
    
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update transaction',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT - Update transaction (alias for PATCH for compatibility)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    await connectDB();
    
    console.log('Updating transaction:', id, body);
    
    // Handle date update specifically
    const updateData: any = {};
    
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    
    // Handle date field - ensure it's properly formatted
    if (body.date !== undefined) {
      updateData.date = new Date(body.date);
      updateData.originalDate = updateData.date; // Store the admin-edited date
      updateData.editedDateByAdmin = true; // Mark as edited by admin
    }
    
    updateData.updatedAt = new Date();
    
    const transaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // If status changed to approved/completed, apply balance changes
    if (body.status && ['approved', 'completed'].includes(body.status)) {
      // The Transaction model middleware should handle this automatically
      console.log('Transaction status changed to:', body.status);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction
    });
    
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update transaction',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await connectDB();
    
    const transaction = await Transaction.findByIdAndDelete(id);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete transaction',
        details: error.message
      },
      { status: 500 }
    );
  }
}
