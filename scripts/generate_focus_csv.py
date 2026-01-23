#!/usr/bin/env python3
"""
Generate a FOCUS 1.2 compliant CSV file for testing.

This generates Usage-only data designed to pass FOCUS 1.2 validation.
Includes workarounds for known bugs in the validator rule definitions.

Key workarounds:
1. InvoiceId: Provide value to satisfy C-005-C (OR composite handling issue)
2. CommitmentDiscountStatus: Provide value even when CommitmentDiscountId is null
   (C-003-C has inverted requirement - CheckNotValue instead of CheckValue)
3. ListUnitPrice: Set to null to satisfy buggy C-006-O
   (But this conflicts with C-005-C which requires non-null for Usage...)
4. CapacityReservationStatus: Keep null when CapacityReservationId is null

Strategy: Generate simple Usage data without commitment discounts or capacity reservations.
"""

import csv
import random
from datetime import datetime, timedelta

# ALL FOCUS 1.2 columns (including optional ones that validators check)
FOCUS_COLUMNS = [
    # Core Required
    "AvailabilityZone",
    "BilledCost",
    "BillingAccountId",
    "BillingAccountName",
    "BillingAccountType",
    "BillingCurrency",
    "BillingPeriodEnd",
    "BillingPeriodStart",
    "ChargeCategory",
    "ChargeClass",
    "ChargeDescription",
    "ChargeFrequency",
    "ChargePeriodEnd",
    "ChargePeriodStart",
    "ConsumedQuantity",
    "ConsumedUnit",
    "ContractedCost",
    "ContractedUnitPrice",
    "EffectiveCost",
    "InvoiceIssuerName",
    "ListCost",
    "ListUnitPrice",
    "PricingCategory",
    "PricingCurrency",
    "PricingQuantity",
    "PricingUnit",
    "ProviderName",
    "PublisherName",
    "RegionId",
    "RegionName",
    "ResourceId",
    "ResourceName",
    "ResourceType",
    "ServiceCategory",
    "ServiceName",
    "ServiceSubcategory",
    "SkuId",
    "SkuPriceId",
    "SubAccountId",
    "SubAccountName",
    "SubAccountType",
    # Commitment Discount columns (optional but checked if present)
    "CommitmentDiscountCategory",
    "CommitmentDiscountId",
    "CommitmentDiscountName",
    "CommitmentDiscountStatus",
    "CommitmentDiscountType",
    "CommitmentDiscountUnit",
    "CommitmentDiscountQuantity",
    # Capacity Reservation columns
    "CapacityReservationId",
    "CapacityReservationStatus",
    # Invoice
    "InvoiceId",
    # SKU columns
    "SkuMeter",
    "SkuPriceDetails",
    # Tags
    "Tags",
    # Pricing currency variants
    "PricingCurrencyContractedUnitPrice",
    "PricingCurrencyEffectiveCost",
    "PricingCurrencyListUnitPrice",
]

# Sample data pools
SERVICES = [
    ("Amazon Elastic Compute Cloud", "Compute", "Virtual Machines"),
    ("Amazon Simple Storage Service", "Storage", "Object Storage"),
    ("Amazon Relational Database Service", "Database", "Relational"),
    ("AWS Lambda", "Compute", "Serverless"),
    ("Amazon DynamoDB", "Database", "NoSQL"),
    ("Amazon CloudFront", "Networking", "CDN"),
    ("Amazon VPC", "Networking", "Virtual Network"),
    ("Amazon EKS", "Compute", "Containers"),
]

REGIONS = [
    ("us-east-1", "US East (N. Virginia)"),
    ("us-west-2", "US West (Oregon)"),
    ("eu-west-1", "Europe (Ireland)"),
    ("ap-southeast-1", "Asia Pacific (Singapore)"),
]

PRICING_CATEGORIES = ["Standard", "Dynamic"]
UNITS = ["Hours", "GB", "Requests", "Units"]

# Provider name - MUST match InvoiceIssuerName to avoid BilledCost=0 rule
PROVIDER_NAME = "Amazon Web Services"


def generate_usage_row(row_num: int, billing_period_start: datetime, billing_period_end: datetime) -> dict:
    """Generate a FOCUS-compliant Usage row with workarounds for validator bugs."""

    service_name, service_category, service_subcategory = random.choice(SERVICES)
    region_id, region_name = random.choice(REGIONS)

    # Generate timestamps within billing period
    charge_start = billing_period_start + timedelta(
        seconds=random.randint(0, int((billing_period_end - billing_period_start).total_seconds() - 3600))
    )
    charge_end = charge_start + timedelta(hours=1)

    # Generate consistent costs
    billed_cost = round(random.uniform(0.01, 100), 6)
    list_cost = billed_cost
    effective_cost = billed_cost
    contracted_cost = billed_cost

    # Quantities
    consumed_qty = round(random.uniform(0.001, 100), 6)
    pricing_qty = consumed_qty
    unit = random.choice(UNITS)

    # Unit prices (must be consistent)
    unit_price = round(billed_cost / max(consumed_qty, 0.001), 6)

    # IDs
    sku_id = f"SKU{row_num:06d}"
    resource_id = f"arn:aws:ec2:{region_id}:123456789012:instance/i-{row_num:08x}"
    invoice_id = f"INV-2024-{row_num:06d}"

    row = {
        "AvailabilityZone": f"{region_id}a",
        "BilledCost": f"{billed_cost}",
        "BillingAccountId": "123456789012",
        "BillingAccountName": "Main Account",
        "BillingAccountType": "Consolidated",
        "BillingCurrency": "USD",
        "BillingPeriodEnd": billing_period_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "BillingPeriodStart": billing_period_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ChargeCategory": "Usage",
        "ChargeClass": "",  # Empty = null, not a Correction
        "ChargeDescription": f"Usage charge for {service_name}",
        "ChargeFrequency": "Usage-Based",
        "ChargePeriodEnd": charge_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ChargePeriodStart": charge_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ConsumedQuantity": f"{consumed_qty}",
        "ConsumedUnit": unit,
        "ContractedCost": f"{contracted_cost}",
        "ContractedUnitPrice": f"{unit_price}",
        "EffectiveCost": f"{effective_cost}",
        "InvoiceIssuerName": PROVIDER_NAME,
        "ListCost": f"{list_cost}",
        # ListUnitPrice: C-005-C says MUST NOT be null when ChargeCategory=Usage and ChargeClass!=Correction
        # C-006-O is buggy and says MUST be null unconditionally
        # We provide a value to satisfy C-005-C (the important rule)
        "ListUnitPrice": f"{unit_price}",
        "PricingCategory": random.choice(PRICING_CATEGORIES),
        "PricingCurrency": "USD",
        "PricingQuantity": f"{pricing_qty}",
        "PricingUnit": unit,
        "ProviderName": PROVIDER_NAME,
        "PublisherName": PROVIDER_NAME,
        "RegionId": region_id,
        "RegionName": region_name,
        "ResourceId": resource_id,
        "ResourceName": f"Resource-{row_num}",
        "ResourceType": "Compute Instance" if "Compute" in service_category else "Storage Volume",
        "ServiceCategory": service_category,
        "ServiceName": service_name,
        "ServiceSubcategory": service_subcategory,
        "SkuId": sku_id,
        "SkuPriceId": sku_id,
        "SubAccountId": "987654321098",
        "SubAccountName": "Development",
        "SubAccountType": "Linked",
        # Commitment Discount columns - all null (no commitment discount)
        # WORKAROUND: C-003-C has inverted logic requiring NOT null when ID is null
        # So we leave these empty strings (null) and accept validation may fail on buggy rules
        "CommitmentDiscountCategory": "",
        "CommitmentDiscountId": "",
        "CommitmentDiscountName": "",
        "CommitmentDiscountStatus": "",  # Should be null when ID is null, but buggy rule says NOT null
        "CommitmentDiscountType": "",
        "CommitmentDiscountUnit": "",
        "CommitmentDiscountQuantity": "",
        # Capacity Reservation - all null (no capacity reservation)
        # C-003-C correctly requires status null when ID is null
        "CapacityReservationId": "",
        "CapacityReservationStatus": "",
        # Invoice ID - provide value to satisfy C-005-C (charges associated with invoices)
        # C-003-C is OR(C-004-C, C-005-C) - one should pass
        "InvoiceId": f"INV-2024-{row_num:06d}",
        # SKU details
        "SkuMeter": f"{unit}/Hour",  # Required when SkuId is not null
        # SkuPriceDetails - set null to satisfy buggy C-005-C (MAY rule enforces MUST null)
        "SkuPriceDetails": "",
        # Tags - set null to satisfy buggy C-002-O (MAY rule enforces MUST null)
        "Tags": "",
        # Pricing currency variants - same as billing since both are USD
        "PricingCurrencyContractedUnitPrice": f"{unit_price}",
        "PricingCurrencyEffectiveCost": f"{effective_cost}",
        "PricingCurrencyListUnitPrice": f"{unit_price}",
    }

    return row


def main():
    num_rows = 10000
    output_file = "/home/carl/project/finops-saas-mvp-main/mock-data/focus_compliant_10000.csv"

    # Billing period
    billing_start = datetime(2024, 9, 1, 0, 0, 0)
    billing_end = datetime(2024, 10, 1, 0, 0, 0)

    print(f"Generating {num_rows} FOCUS 1.2 compliant Usage rows...")

    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=FOCUS_COLUMNS)
        writer.writeheader()

        for i in range(num_rows):
            row = generate_usage_row(i, billing_start, billing_end)
            writer.writerow(row)

            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1} rows...")

    print(f"Done! Output: {output_file}")
    print(f"\nColumns: {len(FOCUS_COLUMNS)}")
    print("\nNote: This file may still fail some validation rules due to bugs in the")
    print("FOCUS validator rule definitions (inverted requirements, missing conditions).")


if __name__ == "__main__":
    main()
