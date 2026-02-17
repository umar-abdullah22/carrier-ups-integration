import type { AppConfig } from "../../config/config.js";
import type { Address, RateRequest } from "../../domain/models.js";
import { toUpsServiceCode } from "./ups-service-map.js";
import type { UpsRateRequestPayload } from "./ups-types.js";

function mapAddress(address: Address) {
  return {
    AddressLine: address.addressLines,
    City: address.city,
    StateProvinceCode: address.stateProvinceCode,
    PostalCode: address.postalCode,
    CountryCode: address.countryCode
  };
}

export function buildUpsRatePayload(request: RateRequest, config: AppConfig): UpsRateRequestPayload {
  return {
    RateRequest: {
      Request: {
        RequestOption: request.serviceLevel ? "Rate" : "Shop",
        TransactionReference: request.shipmentId
          ? {
              CustomerContext: request.shipmentId
            }
          : undefined
      },
      Shipment: {
        Shipper: {
          Name: request.origin.name,
          ShipperNumber: config.UPS_ACCOUNT_NUMBER,
          Address: mapAddress(request.origin)
        },
        ShipTo: {
          Name: request.destination.name,
          Address: mapAddress(request.destination)
        },
        ShipFrom: {
          Name: request.origin.name,
          Address: mapAddress(request.origin)
        },
        Service: request.serviceLevel
          ? {
              Code: toUpsServiceCode(request.serviceLevel)
            }
          : undefined,
        Package: request.parcels.map((parcel) => ({
          PackagingType: { Code: "02" },
          Dimensions: {
            UnitOfMeasurement: { Code: parcel.dimensions.unit },
            Length: parcel.dimensions.length.toString(),
            Width: parcel.dimensions.width.toString(),
            Height: parcel.dimensions.height.toString()
          },
          PackageWeight: {
            UnitOfMeasurement: { Code: parcel.weightUnit },
            Weight: parcel.weight.toString()
          }
        })),
        ShipmentRatingOptions: {
          NegotiatedRatesIndicator: "Y"
        }
      }
    }
  };
}
