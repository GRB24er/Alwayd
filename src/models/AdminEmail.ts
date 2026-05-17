// Log of every admin-composed email sent to a customer (or arbitrary address).
// Used for audit, compliance review, and the admin's "sent" inbox view.
// We never store the full HTML body of marketing emails forever — we keep the
// metadata + a redacted preview so we can prove what was said without bloating Mongo.

import mongoose, { Document, Model, Schema } from "mongoose";

export type AdminEmailCategory =
  | "general"           // Free-form note to a customer
  | "notice"            // Formal correspondence (re. a case, etc.)
  | "marketing"         // Promotional message
  | "support"           // Reply to support thread
  | "operational";      // System operations note (statement attached, etc.)

export type AdminEmailStatus = "queued" | "sent" | "failed" | "bounced";

export interface IAdminEmail extends Document {
  // Issuer
  senderId: mongoose.Types.ObjectId;
  senderEmail: string;
  senderName: string;

  // Recipient: ALWAYS the resolved email address that actually went out.
  // If a userId was selected in the UI, we also record it so we can link to
  // the customer in audit views.
  recipientEmail: string;
  recipientUserId?: mongoose.Types.ObjectId | null;
  cc?: string[];
  bcc?: string[];

  subject: string;
  bodyText: string;
  bodyHtmlPreview: string; // first 4 KB of the rendered HTML for evidence

  category: AdminEmailCategory;
  status: AdminEmailStatus;
  errorReason?: string;

  // SMTP / provider tracking
  messageId?: string;
  sentAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AdminEmailSchema = new Schema<IAdminEmail>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderEmail: { type: String, required: true },
    senderName: { type: String, required: true },

    recipientEmail: { type: String, required: true, index: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },

    subject: { type: String, required: true, maxlength: 400 },
    bodyText: { type: String, required: true, maxlength: 50000 },
    bodyHtmlPreview: { type: String, maxlength: 4096 },

    category: {
      type: String,
      enum: ["general", "notice", "marketing", "support", "operational"],
      default: "general",
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "bounced"],
      default: "queued",
      index: true,
    },
    errorReason: { type: String },
    messageId: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

AdminEmailSchema.index({ recipientEmail: 1, createdAt: -1 });

const AdminEmail: Model<IAdminEmail> =
  mongoose.models.AdminEmail || mongoose.model<IAdminEmail>("AdminEmail", AdminEmailSchema);

export default AdminEmail;
