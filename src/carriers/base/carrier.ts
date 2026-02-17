import type { RateRequest, RateResponse } from "../../domain/models.js";

export type CarrierName = "UPS" | "FEDEX" | "USPS" | "DHL";

export interface CarrierClient {
  readonly carrierName: CarrierName;
  getRates(request: RateRequest): Promise<RateResponse>;
}
