import { Request } from "express";
import { ApiKeyModel } from "../models";

/**
 * Error code constants and type definition
 */
export const ErrorCode = {
  // Idempotency key errors
  IDEMPOTENCY_MISMATCH: "IDEMPOTENCY_MISMATCH",
  IDEMPOTENCY_ERROR: "IDEMPOTENCY_ERROR",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  IDEMPOTENCY_TIMEOUT: "IDEMPOTENCY_TIMEOUT",

  // API key errors
  API_KEY_MISSING: "API_KEY_MISSING",
  API_KEY_INVALID: "API_KEY_INVALID",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * API key authentication request interface
 */
export interface ApiKeyRequest extends Request {
  apiKey?: ApiKeyModel;
}

/**
 * API response interface
 */
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: ErrorCode;
}
