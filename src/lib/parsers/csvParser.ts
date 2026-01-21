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
                if (context.column === "amount" || context.column === "Amount") {
                    return parseFloat(value);
                }
                return value;
            }
        });

        // Validate structure (MVP check)
        if (!records.length) return [];

        // Normalize keys just in case, assuming headers match vaguely
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return records.map((r: any) => ({
            service: String(r.Service || r.service || "Unknown"),
            amount: Number(r.Amount || r.amount || r.Cost || r.cost || 0),
            date: String(r.Date || r.date || new Date().toISOString().split("T")[0]),
            account: String(r.Account || r.account || r.AccountID || r.account_id || "default"),
            region: String(r.Region || r.region || "global"),
            category: String(r.Category || r.category || "Unknown"),
        }));
    } catch (error) {
        console.error("CSV Parse Error:", error);
        throw new Error("Failed to parse CSV file.");
    }
};
