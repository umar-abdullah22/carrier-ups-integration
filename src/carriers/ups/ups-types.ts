import { z } from "zod";

export const UpsTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().default("Bearer"),
  expires_in: z.coerce.number().int().positive()
});

export type UpsTokenResponse = z.infer<typeof UpsTokenResponseSchema>;

const UpsRatedShipmentSchema = z.object({
  Service: z.object({
    Code: z.string().min(1),
    Description: z.string().optional()
  }),
  TotalCharges: z.object({
    CurrencyCode: z.string().length(3),
    MonetaryValue: z.string().min(1)
  }),
  BillingWeight: z
    .object({
      Weight: z.string().min(1)
    })
    .optional(),
  GuaranteedDelivery: z
    .object({
      BusinessDaysInTransit: z.string().optional()
    })
    .optional()
});

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z
      .object({
        TransactionReference: z.object({
          CustomerContext: z.string().optional()
        })
      })
      .optional(),
    RatedShipment: z.union([UpsRatedShipmentSchema, z.array(UpsRatedShipmentSchema)])
  })
});

export type UpsRateResponse = z.infer<typeof UpsRateResponseSchema>;

export type UpsRateRequestPayload = {
  RateRequest: {
    Request: {
      RequestOption: "Rate" | "Shop";
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipment: {
      Shipper: {
        Name?: string;
        ShipperNumber: string;
        Address: UpsAddress;
      };
      ShipTo: {
        Name?: string;
        Address: UpsAddress;
      };
      ShipFrom: {
        Name?: string;
        Address: UpsAddress;
      };
      Service?: {
        Code: string;
      };
      Package: UpsPackage[];
      ShipmentRatingOptions?: {
        NegotiatedRatesIndicator: "Y";
      };
    };
  };
};

type UpsAddress = {
  AddressLine: string[];
  City: string;
  StateProvinceCode?: string;
  PostalCode: string;
  CountryCode: string;
};

type UpsPackage = {
  PackagingType: {
    Code: string;
  };
  Dimensions: {
    UnitOfMeasurement: {
      Code: "IN" | "CM";
    };
    Length: string;
    Width: string;
    Height: string;
  };
  PackageWeight: {
    UnitOfMeasurement: {
      Code: "LBS" | "KGS";
    };
    Weight: string;
  };
};
