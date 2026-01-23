"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { User, Settings, Cloud, DollarSign, Check, X, RefreshCw } from "lucide-react";

type CloudProvider = {
    id: string;
    name: string;
    connected: boolean;
    lastSync?: string;
};

type NotificationSettings = {
    emailAlerts: boolean;
    budgetWarnings: boolean;
    weeklyReports: boolean;
    anomalyDetection: boolean;
};

type BudgetAlert = {
    threshold: number;
    enabled: boolean;
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");
    const [currency, setCurrency] = useState("USD");
    const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
    const [monthlyBudget, setMonthlyBudget] = useState("10000");

    const [notifications, setNotifications] = useState<NotificationSettings>({
        emailAlerts: true,
        budgetWarnings: true,
        weeklyReports: false,
        anomalyDetection: true,
    });

    const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([
        { threshold: 50, enabled: true },
        { threshold: 75, enabled: true },
        { threshold: 90, enabled: true },
    ]);

    const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([
        { id: "aws", name: "AWS", connected: true, lastSync: "2 hours ago" },
        { id: "azure", name: "Azure", connected: false },
        { id: "gcp", name: "Google Cloud", connected: false },
    ]);

    const toggleProvider = (id: string) => {
        setCloudProviders(providers =>
            providers.map(p =>
                p.id === id ? { ...p, connected: !p.connected, lastSync: p.connected ? undefined : "Just now" } : p
            )
        );
    };

    const toggleBudgetAlert = (threshold: number) => {
        setBudgetAlerts(alerts =>
            alerts.map(alert =>
                alert.threshold === threshold ? { ...alert, enabled: !alert.enabled } : alert
            )
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
                <p className="text-slate-400">Manage your account and preferences.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-800/50 border border-slate-700">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Preferences
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        Integrations
                    </TabsTrigger>
                    <TabsTrigger value="budget" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Budget
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-100">Profile Information</CardTitle>
                            <CardDescription className="text-slate-400">
                                Update your personal information and account details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-200">Full Name</Label>
                                <Input
                                    defaultValue="John Doe"
                                    className="bg-slate-900/50 border-slate-700 text-slate-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Email</Label>
                                <Input
                                    type="email"
                                    defaultValue="john.doe@company.com"
                                    className="bg-slate-900/50 border-slate-700 text-slate-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Company</Label>
                                <Input
                                    defaultValue="Acme Corp"
                                    className="bg-slate-900/50 border-slate-700 text-slate-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Role</Label>
                                <Input
                                    defaultValue="FinOps Manager"
                                    className="bg-slate-900/50 border-slate-700 text-slate-100"
                                />
                            </div>
                            <div className="pt-4">
                                <Button>Save Changes</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences" className="mt-6">
                    <div className="space-y-6">
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-100">Display Preferences</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Configure how data is displayed across the application.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-200">Currency</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-100">
                                            <SelectValue placeholder="Select currency" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            <SelectItem value="USD" className="text-slate-100 hover:bg-slate-700">USD ($)</SelectItem>
                                            <SelectItem value="EUR" className="text-slate-100 hover:bg-slate-700">EUR (€)</SelectItem>
                                            <SelectItem value="GBP" className="text-slate-100 hover:bg-slate-700">GBP (£)</SelectItem>
                                            <SelectItem value="JPY" className="text-slate-100 hover:bg-slate-700">JPY (¥)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-200">Date Format</Label>
                                    <Select value={dateFormat} onValueChange={setDateFormat}>
                                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-100">
                                            <SelectValue placeholder="Select date format" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            <SelectItem value="MM/DD/YYYY" className="text-slate-100 hover:bg-slate-700">MM/DD/YYYY</SelectItem>
                                            <SelectItem value="DD/MM/YYYY" className="text-slate-100 hover:bg-slate-700">DD/MM/YYYY</SelectItem>
                                            <SelectItem value="YYYY-MM-DD" className="text-slate-100 hover:bg-slate-700">YYYY-MM-DD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-100">Notifications</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Manage your notification preferences.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-slate-200">Email Alerts</Label>
                                        <p className="text-sm text-slate-400">Receive email notifications for important events</p>
                                    </div>
                                    <Switch
                                        checked={notifications.emailAlerts}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, emailAlerts: checked })
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-slate-200">Budget Warnings</Label>
                                        <p className="text-sm text-slate-400">Get notified when approaching budget limits</p>
                                    </div>
                                    <Switch
                                        checked={notifications.budgetWarnings}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, budgetWarnings: checked })
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-slate-200">Weekly Reports</Label>
                                        <p className="text-sm text-slate-400">Receive weekly cost summary reports</p>
                                    </div>
                                    <Switch
                                        checked={notifications.weeklyReports}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, weeklyReports: checked })
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-slate-200">Anomaly Detection</Label>
                                        <p className="text-sm text-slate-400">Alert on unusual spending patterns</p>
                                    </div>
                                    <Switch
                                        checked={notifications.anomalyDetection}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, anomalyDetection: checked })
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="integrations" className="mt-6">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-100">Cloud Provider Connections</CardTitle>
                            <CardDescription className="text-slate-400">
                                Connect your cloud accounts to track costs and usage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {cloudProviders.map((provider) => (
                                <div
                                    key={provider.id}
                                    className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/30"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                                provider.id === "aws"
                                                    ? "bg-orange-500/10 text-orange-500"
                                                    : provider.id === "azure"
                                                    ? "bg-blue-500/10 text-blue-500"
                                                    : "bg-red-500/10 text-red-500"
                                            }`}
                                        >
                                            <Cloud className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-100">{provider.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div
                                                    className={`flex items-center gap-1 text-sm ${
                                                        provider.connected ? "text-green-400" : "text-slate-500"
                                                    }`}
                                                >
                                                    {provider.connected ? (
                                                        <>
                                                            <Check className="h-3 w-3" />
                                                            Connected
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="h-3 w-3" />
                                                            Not Connected
                                                        </>
                                                    )}
                                                </div>
                                                {provider.lastSync && (
                                                    <>
                                                        <span className="text-slate-600">•</span>
                                                        <span className="text-sm text-slate-400">
                                                            Last sync: {provider.lastSync}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {provider.connected && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-slate-100"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant={provider.connected ? "outline" : "primary"}
                                            size="sm"
                                            onClick={() => toggleProvider(provider.id)}
                                        >
                                            {provider.connected ? "Disconnect" : "Connect"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="budget" className="mt-6">
                    <div className="space-y-6">
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-100">Budget Configuration</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Set your monthly budget and configure alert thresholds.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-200">Monthly Budget Limit</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={monthlyBudget}
                                            onChange={(e) => setMonthlyBudget(e.target.value)}
                                            className="bg-slate-900/50 border-slate-700 text-slate-100"
                                            placeholder="10000"
                                        />
                                        <div className="flex items-center px-3 rounded-md bg-slate-900/50 border border-slate-700 text-slate-400">
                                            {currency}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        Current spending: ${parseFloat(monthlyBudget) * 0.67 || 0} (67%)
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-200">Alert Thresholds</Label>
                                    {budgetAlerts.map((alert) => (
                                        <div
                                            key={alert.threshold}
                                            className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/30"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-slate-100">
                                                        {alert.threshold}% Threshold
                                                    </h4>
                                                    {alert.threshold === 50 && (
                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/10 text-yellow-500">
                                                            Warning
                                                        </span>
                                                    )}
                                                    {alert.threshold === 75 && (
                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/10 text-orange-500">
                                                            Alert
                                                        </span>
                                                    )}
                                                    {alert.threshold === 90 && (
                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-500">
                                                            Critical
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400">
                                                    Alert when spending reaches ${" "}
                                                    {((parseFloat(monthlyBudget) || 0) * alert.threshold) / 100}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={alert.enabled}
                                                onCheckedChange={() => toggleBudgetAlert(alert.threshold)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4">
                                    <Button>Save Budget Settings</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
