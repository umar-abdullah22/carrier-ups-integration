import type { AppConfig } from "../../config/config.js";
import { CarrierIntegrationError } from "../../domain/errors.js";
import { RateRequestSchema, type RateRequest, type RateResponse } from "../../domain/models.js";
import { toCarrierError } from "../../errors/map-error.js";
import type { HttpClient } from "../../http/http-client.js";
import type { CarrierClient } from "../base/carrier.js";
import { UpsAuthClient } from "./ups-auth.js";
import { buildUpsRatePayload } from "./ups-payload-builder.js";
import { mapUpsRateResponse } from "./ups-response-mapper.js";
import { UpsRateResponseSchema } from "./ups-types.js";

export class UpsCarrierClient implements CarrierClient {
  readonly carrierName = "UPS" as const;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AppConfig,
    private readonly authClient: UpsAuthClient = new UpsAuthClient(httpClient, config)
  ) {}

  async getRates(request: RateRequest): Promise<RateResponse> {
    const validation = RateRequestSchema.safeParse(request);
    if (!validation.success) {
      throw new CarrierIntegrationError("Rate request validation failed", "VALIDATION_ERROR", {
        carrier: "UPS",
        operation: "rate",
        metadata: { issues: validation.error.issues }
      });
    }

    const payload = buildUpsRatePayload(validation.data, this.config);

    try {
      const accessToken = await this.authClient.getAccessToken();
      const response = await this.httpClient.request({
        method: "POST",
        url: `${this.config.UPS_BASE_URL}${this.config.UPS_RATE_PATH}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        timeoutMs: this.config.HTTP_TIMEOUT_MS
      });

      if (response.status === 401) {
        throw new CarrierIntegrationError("UPS authentication failed", "AUTH_ERROR", {
          carrier: "UPS",
          operation: "rate",
          httpStatus: 401,
          retryable: false
        });
      }

      if (response.status === 429) {
        throw new CarrierIntegrationError("UPS rate limit exceeded", "RATE_LIMIT_ERROR", {
          carrier: "UPS",
          operation: "rate",
          httpStatus: 429,
          retryable: true
        });
      }

      if (response.status >= 500) {
        throw new CarrierIntegrationError("UPS server error", "UPSTREAM_HTTP_ERROR", {
          carrier: "UPS",
          operation: "rate",
          httpStatus: response.status,
          retryable: true
        });
      }

      if (response.status >= 400) {
        throw new CarrierIntegrationError("UPS request rejected", "UPSTREAM_HTTP_ERROR", {
          carrier: "UPS",
          operation: "rate",
          httpStatus: response.status,
          retryable: false
        });
      }

      const raw = response.json<unknown>();
      const parsed = UpsRateResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new CarrierIntegrationError("UPS rate response was malformed", "MALFORMED_RESPONSE", {
          carrier: "UPS",
          operation: "rate",
          metadata: { issues: parsed.error.issues }
        });
      }

      return mapUpsRateResponse(parsed.data);
    } catch (error) {
      throw toCarrierError(error, "Failed to retrieve UPS rates", "rate", "UPS");
    }
  }
}
