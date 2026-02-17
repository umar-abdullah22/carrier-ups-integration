import type { RateResponse } from "../../domain/models.js";
import { RateResponseSchema } from "../../domain/models.js";
import { CarrierIntegrationError } from "../../domain/errors.js";
import { fromUpsServiceCode } from "./ups-service-map.js";
import type { UpsRateResponse } from "./ups-types.js";

export function mapUpsRateResponse(payload: UpsRateResponse): RateResponse {
  const shipments = Array.isArray(payload.RateResponse.RatedShipment)
    ? payload.RateResponse.RatedShipment
    : [payload.RateResponse.RatedShipment];

  if (shipments.length === 0) {
    throw new CarrierIntegrationError("UPS response contained no rates", "MALFORMED_RESPONSE", {
      carrier: "UPS",
      operation: "rate"
    });
  }

  const response: RateResponse = {
    requestId: payload.RateResponse.Response?.TransactionReference?.CustomerContext,
    quotes: shipments.map((shipment) => {
      const amount = Number(shipment.TotalCharges.MonetaryValue);
      if (Number.isNaN(amount)) {
        throw new CarrierIntegrationError("UPS returned invalid monetary value", "MALFORMED_RESPONSE", {
          carrier: "UPS",
          operation: "rate",
          metadata: { value: shipment.TotalCharges.MonetaryValue }
        });
      }

      const billingWeight = shipment.BillingWeight?.Weight
        ? Number(shipment.BillingWeight.Weight)
        : undefined;
      const estimatedDeliveryDays = shipment.GuaranteedDelivery?.BusinessDaysInTransit
        ? Number(shipment.GuaranteedDelivery.BusinessDaysInTransit)
        : undefined;

      return {
        carrier: "UPS",
        serviceLevel: fromUpsServiceCode(shipment.Service.Code),
        serviceName: shipment.Service.Description,
        totalCharge: {
          currency: shipment.TotalCharges.CurrencyCode,
          amount
        },
        billingWeight: Number.isNaN(billingWeight ?? NaN) ? undefined : billingWeight,
        estimatedDeliveryDays: Number.isNaN(estimatedDeliveryDays ?? NaN)
          ? undefined
          : estimatedDeliveryDays,
        rawServiceCode: shipment.Service.Code
      };
    })
  };

  const parsed = RateResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new CarrierIntegrationError("Normalized response failed validation", "MALFORMED_RESPONSE", {
      carrier: "UPS",
      operation: "rate",
      metadata: { issues: parsed.error.issues }
    });
  }

  return parsed.data;
}
