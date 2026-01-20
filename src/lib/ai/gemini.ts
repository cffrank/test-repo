import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI
// NOTE: This usually requires GCP Application Default Credentials or specific config 
// For MVP, if running locally, gcloud auth application-default login is needed OR passing creds
// We'll trust the environment for now.
const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "finops-saas-mvp";
const location = "us-central1";

const vertexAI = new VertexAI({ project, location });

export const getGeminiModel = () => {
    return vertexAI.preview.getGenerativeModel({
        model: "gemini-1.5-pro",
    });
};

export interface OptimizationTask {
    title: string;
    description: string;
    savings: string;
    effort: "Low" | "Medium" | "High";
    priority: "High" | "Medium" | "Low";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const analyzeCostData = async (costRecords: any[]): Promise<OptimizationTask[]> => {
    const model = getGeminiModel();

    const prompt = `
    You are a FinOps expert. Analyze the following AWS cloud cost records (CSV format converted to JSON) and identify actionable cost optimization opportunities.
    
    Data Sample:
    ${JSON.stringify(costRecords.slice(0, 50))} 
    
    Output strictly valid JSON array of objects with the following schema:
    [{
      "title": "Short title",
      "description": "Specific action to take",
      "savings": "Estimated monthly savings (e.g. $120/mo)",
      "effort": "Low" | "Medium" | "High",
      "priority": "High" | "Medium" | "Low"
    }]
    
    Ignore small costs. Focus on waste reduction (idle resources) and commitment opportunities.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        if (!text) return [];

        // Clean JSON markdown if present
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonString) as OptimizationTask[];
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        // Return mock data fallback for MVP if API fails (e.g. no quota/auth)
        return [
            {
                title: "Mock: Delete Idle EBS Volumes",
                description: "Found 3 unattached volumes > 30 days old.",
                savings: "$45.00/mo",
                effort: "Low",
                priority: "High"
            }
        ];
    }
};
