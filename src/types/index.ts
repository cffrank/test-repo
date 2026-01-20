export type Currency = 'USD' | 'EUR' | 'GBP';

export interface Project {
  id: string;
  name: string;
  description?: string;
  budget: number; // Total budget allocation
  currency: Currency;
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
}

export interface Budget {
    id: string;
    projectId: string;
    amount: number;
    period: 'monthly' | 'quarterly' | 'yearly' | 'total';
    startDate: string;
    endDate?: string;
}

export interface Expense {
  id: string;
  projectId: string;
  amount: number;
  currency: Currency;
  date: string; // ISO Date
  category: ExpenseCategory;
  description?: string;
  merchant?: string; // e.g. AWS, Azure, GCP
}

export type ExpenseCategory = 
  | 'compute' 
  | 'storage' 
  | 'networking' 
  | 'database' 
  | 'services' 
  | 'other';

export interface DashboardMetrics {
  totalSpend: number;
  remainingBudget: number;
  spendByProject: Record<string, number>;
  spendByCategory: Record<ExpenseCategory, number>;
}
