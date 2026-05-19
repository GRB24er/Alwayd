// src/models/LoanDocumentFile.ts
// Stores the actual bytes of a loan-application document upload. A
// separate collection from Loan keeps the loan documents small even
// when borrowers upload large PDFs / images.
//
// Size limit is enforced at the API layer (10MB). MongoDB documents
// have a hard 16MB ceiling so we stay well inside that.

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoanDocumentFile extends Document {
  loanId: Types.ObjectId;
  ownerId: Types.ObjectId;
  key: string; // document type, e.g. id_document, proof_of_address
  name: string; // original filename
  mimeType: string;
  size: number; // bytes
  data: Buffer; // raw file bytes
  uploadedAt: Date;
}

const LoanDocumentFileSchema = new Schema<ILoanDocumentFile>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true, index: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

LoanDocumentFileSchema.index({ loanId: 1, uploadedAt: -1 });

const LoanDocumentFile =
  (mongoose.models.LoanDocumentFile as mongoose.Model<ILoanDocumentFile>) ||
  mongoose.model<ILoanDocumentFile>('LoanDocumentFile', LoanDocumentFileSchema);

export default LoanDocumentFile;
