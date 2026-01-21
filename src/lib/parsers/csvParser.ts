import { parse } from "csv-parse/sync";

export interface CostRecord {
    service: string;
    amount: number;
    date: string;
    account: string;
    region: string;
    category: string;
}

export const parseCostCsv = (csvContent: string): CostRecord[] => {
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            cast: (value, context) => {
                const col = String(context.column).toLowerCase();
                if (col === "amount" || col === "billedcost" || col === "cost") {
                    return parseFloat(value) || 0;
                }
                return value;
            }
        });

        // Validate structure (MVP check)
        if (!records.length) return [];

        // Normalize keys - supports both simple format and FOCUS format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return records.map((r: any) => ({
            // Service: simple format or FOCUS ServiceName
            service: String(r.Service || r.service || r.ServiceName || "Unknown"),
            // Amount: simple format or FOCUS BilledCost/EffectiveCost
            amount: Number(r.Amount || r.amount || r.BilledCost || r.EffectiveCost || r.Cost || r.cost || 0),
            // Date: simple format or FOCUS ChargePeriodStart
            date: String(r.Date || r.date || r.ChargePeriodStart || new Date().toISOString().split("T")[0]),
            // Account: simple format or FOCUS SubAccountId/BillingAccountId
            account: String(r.Account || r.account || r.SubAccountId || r.BillingAccountId || r.AccountID || r.account_id || "default"),
            // Region: simple format or FOCUS RegionName/RegionId
            region: String(r.Region || r.region || r.RegionName || r.RegionId || "global"),
            // Category: simple format or FOCUS ServiceCategory
            category: String(r.Category || r.category || r.ServiceCategory || "Unknown"),
        }));
    } catch (error) {
        console.error("CSV Parse Error:", error);
        throw new Error("Failed to parse CSV file.");
    }
};
