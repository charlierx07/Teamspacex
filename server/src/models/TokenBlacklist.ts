import mongoose, { Document, Schema } from 'mongoose';

export interface ITokenBlacklist extends Document {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const TokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0s' } // MongoDB TTL index automatically removes expired tokens
    }
  },
  {
    timestamps: true
  }
);

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', TokenBlacklistSchema);
