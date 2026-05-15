// src/scripts/createAdmin.ts
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

async function createAdmin() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");
    
    // Create admin user
    const adminEmail = "admin@horizonbank.com";
    const adminPassword = "Admin123!";
    
    // Delete existing admin
    await User.deleteOne({ email: adminEmail });
    
    // Create new admin
    const admin = new User({
      email: adminEmail,
      password: adminPassword,
      name: "Admin User",
      checkingBalance: 0,
      savingsBalance: 0,
      investmentBalance: 0,
      role: "admin",
      verified: true
   });
   
   await admin.save();
   
   console.log("✅ Admin user created!");
   console.log("📧 Admin credentials:");
   console.log("   Email: admin@horizonbank.com");
   console.log("   Password: Admin123!");
   
 } catch (error) {
   console.error("❌ Error creating admin:", error);
 } finally {
   await mongoose.connection.close();
   console.log("🔌 Disconnected");
 }
}

createAdmin();