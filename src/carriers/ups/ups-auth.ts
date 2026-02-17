import type { AppConfig } from "../../config/config.js";
import { CarrierIntegrationError } from "../../domain/errors.js";
import type { HttpClient } from "../../http/http-client.js";
import { toCarrierError } from "../../errors/map-error.js";
import { UpsTokenResponseSchema } from "./ups-types.js";

type TokenState = {
  accessToken: string;
  expiresAtEpochMs: number;
};

export class UpsAuthClient {
  private tokenState: TokenState | null = null;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AppConfig,
    private readonly now: () => number = () => Date.now()
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.tokenState && this.now() < this.tokenState.expiresAtEpochMs - 10_000) {
      return this.tokenState.accessToken;
    }

    return this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<string> {
    const encoded = Buffer.from(`${this.config.UPS_CLIENT_ID}:${this.config.UPS_CLIENT_SECRET}`).toString(
      "base64"
    );

    try {
      const response = await this.httpClient.request({
        method: "POST",
        url: `${this.config.UPS_BASE_URL}${this.config.UPS_TOKEN_PATH}`,
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials",
        timeoutMs: this.config.HTTP_TIMEOUT_MS
      });

      if (response.status >= 400) {
        throw new CarrierIntegrationError("UPS auth request failed", "AUTH_ERROR", {
          carrier: "UPS",
          operation: "oauth",
          httpStatus: response.status,
          retryable: response.status >= 500 || response.status === 429
        });
      }

      const raw = response.json<unknown>();
      const parsed = UpsTokenResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new CarrierIntegrationError("UPS auth response was malformed", "MALFORMED_RESPONSE", {
          carrier: "UPS",
          operation: "oauth",
          metadata: { issues: parsed.error.issues }
        });
      }

      this.tokenState = {
        accessToken: parsed.data.access_token,
        expiresAtEpochMs: this.now() + parsed.data.expires_in * 1000
      };

      return this.tokenState.accessToken;
    } catch (error) {
      throw toCarrierError(error, "Failed to acquire UPS access token", "oauth", "UPS");
    }
  }
}
