// src/scripts/fixBalances.ts
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

async function fixBalances() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");
    
    const email = "hajand@horizonbank.com";
    
    // EXACT values that should be set
    const CORRECT_BALANCES = {
      checking: 4000.00,
      savings: 1000.00,
      investment: 45458575.89  // This is $45.46M, NOT $78M
    };
    
    const user = await User.findOne({ email });
    
    if (user) {
      console.log("❌ CURRENT WRONG BALANCES:");
      console.log("  Checking:", user.checkingBalance);
      console.log("  Savings:", user.savingsBalance);
      console.log("  Investment:", user.investmentBalance);
      console.log("  Wrong Total:", user.checkingBalance + user.savingsBalance + user.investmentBalance);
      
      // FIX THE BALANCES
      user.checkingBalance = CORRECT_BALANCES.checking;
      user.savingsBalance = CORRECT_BALANCES.savings;
      user.investmentBalance = CORRECT_BALANCES.investment;
      user.name = "Hajand Morgan";
      
      await user.save();
      
      console.log("\n✅ FIXED BALANCES:");
      console.log("  Name:", user.name);
      console.log("  Checking:", user.checkingBalance);
      console.log("  Savings:", user.savingsBalance);
      console.log("  Investment:", user.investmentBalance);
      console.log("  Correct Total:", user.checkingBalance + user.savingsBalance + user.investmentBalance);
      console.log("  Should show as: $45.46M");
    } else {
      console.log("❌ User not found");
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected");
  }
}

fixBalances();