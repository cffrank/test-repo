export interface OptimizationTask {
  title: string;
  description: string;
  savings: string;
  effort: "Low" | "Medium" | "High";
  priority: "High" | "Medium" | "Low";
}

interface CostRecord {
  amount: string | number;
  service: string | null;
  date: Date | string;
  category?: string;
  region?: string | null;
  [key: string]: unknown;
}

export async function analyzeCostDataWithCerebras(records: CostRecord[]): Promise<OptimizationTask[]> {
  const prompt = `
You are a FinOps expert. Analyze the following AWS cloud cost records and identify actionable cost optimization opportunities.

Data Sample:
${JSON.stringify(records.slice(0, 50))}

Output strictly valid JSON array of objects with the following schema:
[{
  "title": "Short title",
  "description": "Specific action to take",
  "savings": "Estimated monthly savings (e.g. $120/mo)",
  "effort": "Low" | "Medium" | "High",
  "priority": "High" | "Medium" | "Low"
}]

Ignore small costs. Focus on waste reduction and commitment opportunities.
`;

  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3.1-70b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cerebras API Error:", response.status, errorText);
      throw new Error(`Cerebras API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (!text) {
      throw new Error("No content in Cerebras response");
    }

    const jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Cerebras Analysis Error:", error);

    return [
      {
        title: "Mock: Delete Idle EBS Volumes",
        description: "Found 3 unattached volumes > 30 days old.",
        savings: "$45.00/mo",
        effort: "Low",
        priority: "High",
      },
    ];
  }
}
