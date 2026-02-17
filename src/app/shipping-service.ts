import type { CarrierName, CarrierClient } from "../carriers/base/carrier.js";
import { CarrierIntegrationError } from "../domain/errors.js";
import type { RateRequest, RateResponse } from "../domain/models.js";

export class ShippingService {
  constructor(private readonly carriers: Map<CarrierName, CarrierClient>) {}

  async getRates(carrier: CarrierName, request: RateRequest): Promise<RateResponse> {
    const client = this.carriers.get(carrier);
    if (!client) {
      throw new CarrierIntegrationError(`Carrier ${carrier} is not configured`, "CONFIG_ERROR", {
        carrier,
        operation: "rate"
      });
    }

    return client.getRates(request);
  }
}
