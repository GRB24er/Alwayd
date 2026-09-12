// src/lib/statementAuth.ts
// Shared admin gate for the statement endpoints.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export interface AdminGateResult {
  ok: boolean;
  status: number;
  error?: string;
  admin?: Record<string, any>;
}

export async function requireAdmin(): Promise<AdminGateResult> {
  const session: any = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  await connectDB();

  const admin: any = await User.findOne({ email: session.user.email });
  if (!admin) {
    return { ok: false, status: 404, error: "User not found" };
  }
  if (admin.role !== "admin") {
    return { ok: false, status: 403, error: "Admin access required" };
  }
  return { ok: true, status: 200, admin };
}
