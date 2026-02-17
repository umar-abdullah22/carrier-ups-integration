import { CarrierIntegrationError } from "../domain/errors.js";

export function toCarrierError(
  error: unknown,
  fallbackMessage: string,
  operation: string,
  carrier = "UPS"
): CarrierIntegrationError {
  if (error instanceof CarrierIntegrationError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new CarrierIntegrationError("Request timed out", "TIMEOUT_ERROR", {
      carrier,
      operation,
      retryable: true,
      cause: error
    });
  }

  if (error instanceof SyntaxError) {
    return new CarrierIntegrationError("Upstream returned malformed JSON", "MALFORMED_RESPONSE", {
      carrier,
      operation,
      retryable: false,
      cause: error
    });
  }

  return new CarrierIntegrationError(fallbackMessage, "NETWORK_ERROR", {
    carrier,
    operation,
    retryable: true,
    cause: error
  });
}
