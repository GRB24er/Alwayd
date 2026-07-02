// File: src/app/api/admin/register/route.ts
// DECOMMISSIONED — admin accounts must be provisioned via the database seed
// script or promoted by an existing superadmin, never via an open HTTP endpoint.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has been decommissioned. Admin accounts are provisioned internally.' },
    { status: 410 }
  );
}
