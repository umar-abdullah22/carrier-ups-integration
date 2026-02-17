export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "TIMEOUT_ERROR"
  | "RATE_LIMIT_ERROR"
  | "UPSTREAM_HTTP_ERROR"
  | "MALFORMED_RESPONSE"
  | "NETWORK_ERROR"
  | "CONFIG_ERROR";

export interface ErrorDetails {
  carrier?: string;
  operation?: string;
  httpStatus?: number;
  upstreamCode?: string;
  cause?: unknown;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}

export class CarrierIntegrationError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetails;

  constructor(message: string, code: ErrorCode, details: ErrorDetails = {}) {
    super(message);
    this.name = "CarrierIntegrationError";
    this.code = code;
    this.details = details;
  }
}
