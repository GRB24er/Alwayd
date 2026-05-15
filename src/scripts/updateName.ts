// src/scripts/updateName.ts
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

async function updateName() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");
    
    const email = "hajand@horizonbank.com";
    const newName = "Hajand Morgan";
    
    const user = await User.findOne({ email });
    
    if (user) {
      user.name = newName;
      await user.save();
      console.log(`✅ Updated user name to: ${newName}`);
      console.log("Current user details:");
      console.log("  Name:", user.name);
      console.log("  Email:", user.email);
      console.log("  Checking:", user.checkingBalance);
      console.log("  Savings:", user.savingsBalance);
      console.log("  Investment:", user.investmentBalance);
    } else {
      console.log("❌ User not found");
    }
    
  } catch (error) {
    console.error("❌ Error updating name:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

updateName();