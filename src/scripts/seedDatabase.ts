// src/scripts/seedDatabase.ts
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { mockTransactions, checkingTransactions, savingsTransactions } from "@/data/mockTransactions";

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Create or update demo user
    const email = "hajand@horizonbank.com";
    const plainPassword = "Valmont15#";
    const userName = "Hajand Morgan"; // Changed from Alexander Mitchell
    
    console.log("📧 Creating/updating user with:");
    console.log("   Name:", userName);
    console.log("   Email:", email);
    console.log("   Password:", plainPassword);
    
    // Calculate final investment balance (this is correct - $45.4M)
    const totalInvestmentValue = 45458575.89; // Exact amount
    
    console.log("💰 Investment value:", totalInvestmentValue.toLocaleString());
    
    // Delete existing user to ensure clean state
    await User.deleteOne({ email });
    console.log("🗑️ Cleared existing user");
    
    // Create new user with CORRECT balances and name
    const user = new User({
      email,
      password: plainPassword,
      name: userName, // Updated name
      checkingBalance: 4000.00,        // $4,000
      savingsBalance: 1000.00,         // $1,000
      investmentBalance: totalInvestmentValue, // $45,458,575.89
      role: 'user',
      verified: true
    });
    
    await user.save();
    console.log("✅ Created new user:", userName);

    // Verify the saved balances
    console.log("\n✅ Verified Account Balances for", userName + ":");
    console.log(`   Checking:   $${user.checkingBalance.toLocaleString()}`);
    console.log(`   Savings:    $${user.savingsBalance.toLocaleString()}`);
    console.log(`   Investment: $${user.investmentBalance.toLocaleString()}`);
    console.log(`   ─────────────────────────────────`);
    console.log(`   Liquid Total: $${(user.checkingBalance + user.savingsBalance).toLocaleString()}`);
    console.log(`   Net Worth:    $${(user.checkingBalance + user.savingsBalance + user.investmentBalance).toLocaleString()}`);

    // Delete existing transactions
    await Transaction.deleteMany({ userId: user._id });
    console.log("🗑️ Cleared existing transactions");

    // Create transactions with correct data
    // Investment transactions
    for (const txData of mockTransactions) {
      await Transaction.create({
        userId: user._id,
        type: txData.type || "interest",
        currency: "USD",
        amount: txData.amount,
        description: txData.description,
        status: "completed",
        date: new Date(txData.date),
        accountType: "investment",
        posted: true,
        postedAt: new Date(txData.date),
        reference: txData.reference,
        category: txData.category,
        channel: "system",
        origin: "investment_platform"
      });
    }
    console.log(`✅ Created ${mockTransactions.length} investment transactions`);

    // Checking account transaction - $4,000 deposit
    await Transaction.create({
      userId: user._id,
      type: "deposit",
      currency: "USD",
      amount: 4000.00,
      description: "Wire Transfer Deposit",
      status: "completed",
      date: new Date("2025-05-29"),
      accountType: "checking",
      posted: true,
      postedAt: new Date("2025-05-29"),
      reference: "DEP-2025-05-29",
      category: "Deposit",
      channel: "wire",
      origin: "bank_transfer"
    });
    console.log("✅ Created $4,000 checking deposit");

    // Savings account credit - $1,000
    await Transaction.create({
      userId: user._id,
      type: "deposit",
      currency: "USD",
      amount: 1000.00,
      description: "Account Credit - Initial Funding",
      status: "completed",
      date: new Date("2003-06-15"),
      accountType: "savings",
      posted: true,
      postedAt: new Date("2003-06-15"),
      reference: "CR-2003-INITIAL",
      category: "Account Credit",
      channel: "system",
      origin: "account_credit"
    });
    console.log("✅ Created $1,000 savings credit");
    
    console.log("\n✅ Database seeding completed successfully!");
    console.log("\n📧 Login credentials:");
    console.log("   Name: Hajand Morgan");
    console.log("   Email: hajand@horizonbank.com");
    console.log("   Password: Valmont15#");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the seeder
seedDatabase();