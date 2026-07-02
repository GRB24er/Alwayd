import type { Express, Request, Response } from "express";
import { generateStatementPDF, type StatementData, type StatementTransaction } from "./statement-pdf";

export function registerStatementRoutes(app: Express) {
  app.post("/api/statement/generate", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body || !body.accountHolder || !body.account) {
        res.status(400).json({ error: "Missing required statement data" });
        return;
      }

      const transactions: StatementTransaction[] = (body.transactions || []).map(
        (t: any) => ({
          date: t.date,
          description: t.description || "",
          debit: t.debit != null ? parseFloat(t.debit) : undefined,
          credit: t.credit != null ? parseFloat(t.credit) : undefined,
          balance: parseFloat(t.balance) || 0,
        })
      );

      const statementData: StatementData = {
        accountHolder: {
          name: body.accountHolder.name || "Account Holder",
          addressLine1: body.accountHolder.addressLine1,
          addressLine2: body.accountHolder.addressLine2,
          addressLine3: body.accountHolder.addressLine3,
        },
        account: {
          name: body.account.name || "Primary Account",
          number: body.account.number || "****",
          type: body.account.type || "Private Banking",
          currency: body.account.currency || "USD",
        },
        period: {
          startDate: body.period?.startDate || new Date().toISOString(),
          endDate: body.period?.endDate || new Date().toISOString(),
          label: body.period?.label || "Statement",
        },
        summary: {
          openingBalance: parseFloat(body.summary?.openingBalance) || 0,
          totalDebits: parseFloat(body.summary?.totalDebits) || 0,
          totalCredits: parseFloat(body.summary?.totalCredits) || 0,
          closingBalance: parseFloat(body.summary?.closingBalance) || 0,
        },
        transactions,
        bankInfo: {
          branchName: body.bankInfo?.branchName,
          branchAddress: body.bankInfo?.branchAddress,
          transitNumber: body.bankInfo?.transitNumber,
          phone: body.bankInfo?.phone,
          directLine: body.bankInfo?.directLine,
          website: body.bankInfo?.website,
          plan: body.bankInfo?.plan,
        },
      };

      const pdfBytes = await generateStatementPDF(statementData);
      const safeName = statementData.accountHolder.name.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `AEC_Statement_${safeName}_${statementData.period.label.replace(/\s+/g, "_")}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBytes.length.toString());
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("[statement] PDF generation failed:", error);
      res.status(500).json({ error: "Failed to generate statement PDF" });
    }
  });

  app.get("/api/statement/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "statement-pdf", timestamp: Date.now() });
  });
}
