import type { Express, Request, Response } from "express";
import { generateReceiptPDF, type ReceiptData } from "./receipt-pdf";

export function registerReceiptRoutes(app: Express) {
  app.post("/api/receipt/generate", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body || !body.receiptNumber || !body.amount) {
        res.status(400).json({ error: "Missing required receipt data" });
        return;
      }

      const receiptData: ReceiptData = {
        receiptNumber: body.receiptNumber,
        reference: body.reference || body.receiptNumber,
        status: body.status || "completed",
        direction: body.direction || "debit",
        transferKind: body.transferKind || "Wire Transfer",
        rail: body.rail || "FEDWIRE",
        channel: body.channel || "Mobile Banking",
        amount: parseFloat(body.amount) || 0,
        currency: body.currency || "USD",
        fee: parseFloat(body.fee) || 0,
        totalSettled: parseFloat(body.totalSettled) || parseFloat(body.amount) || 0,
        initiatedAt: body.initiatedAt ? new Date(body.initiatedAt) : new Date(),
        completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
        purpose: body.purpose || undefined,
        narrative: body.narrative || body.description || undefined,
        sender: {
          name: body.sender?.name || "Account Holder",
          accountMasked: body.sender?.accountMasked || undefined,
          accountType: body.sender?.accountType || undefined,
          bankName: body.sender?.bankName || "Aldwych European Capital",
          routingMasked: body.sender?.routingMasked || undefined,
          swiftBic: body.sender?.swiftBic || undefined,
          country: body.sender?.country || undefined,
          address: body.sender?.address || undefined,
        },
        beneficiary: {
          name: body.beneficiary?.name || "Beneficiary",
          accountMasked: body.beneficiary?.accountMasked || undefined,
          accountType: body.beneficiary?.accountType || undefined,
          bankName: body.beneficiary?.bankName || undefined,
          routingMasked: body.beneficiary?.routingMasked || undefined,
          swiftBic: body.beneficiary?.swiftBic || undefined,
          country: body.beneficiary?.country || undefined,
          address: body.beneficiary?.address || undefined,
        },
      };

      const pdfBytes = await generateReceiptPDF(receiptData);
      const filename = `AEC_Receipt_${receiptData.receiptNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBytes.length.toString());
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("[receipt] PDF generation failed:", error);
      res.status(500).json({ error: "Failed to generate receipt PDF" });
    }
  });

  app.get("/api/receipt/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "receipt-pdf", timestamp: Date.now() });
  });
}
