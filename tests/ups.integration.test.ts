import { describe, expect, it } from "vitest";
import { UpsAuthClient } from "../src/carriers/ups/ups-auth.js";
import { UpsCarrierClient } from "../src/carriers/ups/ups-carrier-client.js";
import type { AppConfig } from "../src/config/config.js";
import type { HttpClient, HttpRequest, HttpResponse } from "../src/http/http-client.js";

class ScriptedHttpClient implements HttpClient {
  readonly requests: HttpRequest[] = [];

  constructor(private readonly handlers: Array<(request: HttpRequest) => HttpResponse | Promise<HttpResponse>>) {}

  async request(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    const handler = this.handlers.shift();
    if (!handler) {
      throw new Error("No scripted response left");
    }

    return handler(request);
  }
}

function jsonResponse(status: number, payload: unknown): HttpResponse {
  const text = JSON.stringify(payload);
  return {
    status,
    headers: {},
    text,
    json<T>() {
      return JSON.parse(text) as T;
    }
  };
}

function malformedJsonResponse(status: number): HttpResponse {
  const text = "{not-valid-json";
  return {
    status,
    headers: {},
    text,
    json<T>() {
      return JSON.parse(text) as T;
    }
  };
}

const baseConfig: AppConfig = {
  UPS_BASE_URL: "https://wwwcie.ups.com",
  UPS_CLIENT_ID: "client-id",
  UPS_CLIENT_SECRET: "client-secret",
  UPS_ACCOUNT_NUMBER: "A1B2C3",
  UPS_TOKEN_PATH: "/security/v1/oauth/token",
  UPS_RATE_PATH: "/api/rating/v2409/Rate",
  HTTP_TIMEOUT_MS: 5000
};

const sampleRateRequest = {
  shipmentId: "ship-123",
  origin: {
    name: "Warehouse",
    addressLines: ["123 Shipper St"],
    city: "Atlanta",
    stateProvinceCode: "GA",
    postalCode: "30301",
    countryCode: "US"
  },
  destination: {
    name: "Customer",
    addressLines: ["55 Main Ave"],
    city: "Austin",
    stateProvinceCode: "TX",
    postalCode: "73301",
    countryCode: "US"
  },
  parcels: [
    {
      weight: 3,
      weightUnit: "LBS" as const,
      dimensions: {
        length: 10,
        width: 8,
        height: 4,
        unit: "IN" as const
      }
    }
  ]
};

describe("UPS carrier integration", () => {
  it("builds UPS payload from domain request and returns normalized quotes", async () => {
    const httpClient = new ScriptedHttpClient([
      () =>
        jsonResponse(200, {
          access_token: "token-1",
          token_type: "Bearer",
          expires_in: 3600
        }),
      () =>
        jsonResponse(200, {
          RateResponse: {
            Response: {
              TransactionReference: {
                CustomerContext: "ship-123"
              }
            },
            RatedShipment: [
              {
                Service: { Code: "03", Description: "UPS Ground" },
                TotalCharges: { CurrencyCode: "USD", MonetaryValue: "12.34" },
                BillingWeight: { Weight: "3.0" },
                GuaranteedDelivery: { BusinessDaysInTransit: "3" }
              },
              {
                Service: { Code: "01", Description: "UPS Next Day Air" },
                TotalCharges: { CurrencyCode: "USD", MonetaryValue: "55.10" }
              }
            ]
          }
        })
    ]);

    const client = new UpsCarrierClient(httpClient, baseConfig);
    const response = await client.getRates(sampleRateRequest);

    expect(httpClient.requests).toHaveLength(2);
    expect(httpClient.requests[1].url).toBe("https://wwwcie.ups.com/api/rating/v2409/Rate");

    const requestBody = JSON.parse(httpClient.requests[1].body ?? "{}");
    expect(requestBody.RateRequest.Request.RequestOption).toBe("Shop");
    expect(requestBody.RateRequest.Shipment.Shipper.ShipperNumber).toBe("A1B2C3");
    expect(requestBody.RateRequest.Shipment.Package[0].PackageWeight.Weight).toBe("3");

    expect(response.requestId).toBe("ship-123");
    expect(response.quotes).toHaveLength(2);
    expect(response.quotes[0]).toMatchObject({
      carrier: "UPS",
      serviceLevel: "UPS_GROUND",
      totalCharge: { currency: "USD", amount: 12.34 }
    });
    expect(response.quotes[1].serviceLevel).toBe("UPS_NEXT_DAY_AIR");
  });

  it("reuses token before expiry and refreshes after expiry", async () => {
    let now = 1_000_000;
    const nowFn = () => now;

    const httpClient = new ScriptedHttpClient([
      () =>
        jsonResponse(200, {
          access_token: "token-1",
          token_type: "Bearer",
          expires_in: 120
        }),
      () =>
        jsonResponse(200, {
          RateResponse: {
            RatedShipment: {
              Service: { Code: "03" },
              TotalCharges: { CurrencyCode: "USD", MonetaryValue: "10.00" }
            }
          }
        }),
      () =>
        jsonResponse(200, {
          RateResponse: {
            RatedShipment: {
              Service: { Code: "03" },
              TotalCharges: { CurrencyCode: "USD", MonetaryValue: "11.00" }
            }
          }
        }),
      () =>
        jsonResponse(200, {
          access_token: "token-2",
          token_type: "Bearer",
          expires_in: 120
        }),
      () =>
        jsonResponse(200, {
          RateResponse: {
            RatedShipment: {
              Service: { Code: "03" },
              TotalCharges: { CurrencyCode: "USD", MonetaryValue: "12.00" }
            }
          }
        })
    ]);

    const authClient = new UpsAuthClient(httpClient, baseConfig, nowFn);
    const client = new UpsCarrierClient(httpClient, baseConfig, authClient);

    await client.getRates(sampleRateRequest);
    await client.getRates(sampleRateRequest);

    const firstTwoRateCalls = httpClient.requests.filter((request) =>
      request.url.endsWith(baseConfig.UPS_RATE_PATH)
    );

    expect(firstTwoRateCalls[0].headers?.Authorization).toBe("Bearer token-1");
    expect(firstTwoRateCalls[1].headers?.Authorization).toBe("Bearer token-1");

    now += 130_000;
    await client.getRates(sampleRateRequest);

    const thirdRateCall = httpClient.requests
      .filter((request) => request.url.endsWith(baseConfig.UPS_RATE_PATH))
      .at(-1);
    expect(thirdRateCall?.headers?.Authorization).toBe("Bearer token-2");

    const tokenCalls = httpClient.requests.filter((request) =>
      request.url.endsWith(baseConfig.UPS_TOKEN_PATH)
    );
    expect(tokenCalls).toHaveLength(2);
  });

  it("surfaces structured errors for 4xx, 5xx, malformed JSON, and timeout", async () => {
    const timeoutError = new DOMException("Request aborted", "AbortError");

    const httpClient = new ScriptedHttpClient([
      () => jsonResponse(200, { access_token: "token", token_type: "Bearer", expires_in: 3600 }),
      () => jsonResponse(429, { message: "rate limited" }),
      () => jsonResponse(500, { message: "server error" }),
      () => malformedJsonResponse(200),
      async () => {
        throw timeoutError;
      }
    ]);

    const authClient = new UpsAuthClient(httpClient, baseConfig);
    const client = new UpsCarrierClient(httpClient, baseConfig, authClient);

    await expect(client.getRates(sampleRateRequest)).rejects.toMatchObject({
      code: "RATE_LIMIT_ERROR"
    });

    await expect(client.getRates(sampleRateRequest)).rejects.toMatchObject({
      code: "UPSTREAM_HTTP_ERROR"
    });

    await expect(client.getRates(sampleRateRequest)).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE"
    });

    await expect(client.getRates(sampleRateRequest)).rejects.toMatchObject({
      code: "TIMEOUT_ERROR"
    });
  });

  it("validates input before any upstream call", async () => {
    const httpClient = new ScriptedHttpClient([]);
    const client = new UpsCarrierClient(httpClient, baseConfig);

    await expect(
      client.getRates({
        ...sampleRateRequest,
        parcels: []
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(httpClient.requests).toHaveLength(0);
  });
});
