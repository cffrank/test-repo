"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import {
  Server,
  Database,
  HardDrive,
  Network,
  Shield,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Cloud,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";

interface CloudService {
  id: string;
  name: string;
  category: string;
  provider: string;
  currentCost: number;
  previousCost: number;
  resourceCount: number;
  region?: string;
}

interface ServiceDetail {
  service: CloudService;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    cost: number;
    status: string;
  }>;
}

const CATEGORY_ICONS = {
  Compute: Server,
  Storage: HardDrive,
  Database: Database,
  Networking: Network,
  Security: Shield,
  Analytics: BarChart3,
};

const CATEGORY_COLORS = {
  Compute: "bg-blue-500/10 text-blue-500",
  Storage: "bg-purple-500/10 text-purple-500",
  Database: "bg-green-500/10 text-green-500",
  Networking: "bg-accent/10 text-accent",
  Security: "bg-red-500/10 text-red-500",
  Analytics: "bg-cyan-500/10 text-cyan-500",
};

const PROVIDER_COLORS = {
  AWS: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Azure: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  GCP: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function CloudServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<CloudService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [serviceDetails, setServiceDetails] = useState<Record<string, ServiceDetail>>({});

  useEffect(() => {
    fetchServices();
  }, [user]);

  async function fetchServices() {
    if (!user) return;
    try {
      const res = await fetch(`/api/cloud-services?projectId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || generateMockServices());
      } else {
        setServices(generateMockServices());
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
      setServices(generateMockServices());
    } finally {
      setLoading(false);
    }
  }

  function generateMockServices(): CloudService[] {
    const categories = ["Compute", "Storage", "Database", "Networking", "Security", "Analytics"];
    const providers = ["AWS", "Azure", "GCP"];
    const services = [
      { name: "EC2 Instances", category: "Compute", provider: "AWS" },
      { name: "S3 Buckets", category: "Storage", provider: "AWS" },
      { name: "RDS Databases", category: "Database", provider: "AWS" },
      { name: "CloudFront", category: "Networking", provider: "AWS" },
      { name: "Virtual Machines", category: "Compute", provider: "Azure" },
      { name: "Blob Storage", category: "Storage", provider: "Azure" },
      { name: "SQL Database", category: "Database", provider: "Azure" },
      { name: "VPN Gateway", category: "Networking", provider: "Azure" },
      { name: "Compute Engine", category: "Compute", provider: "GCP" },
      { name: "Cloud Storage", category: "Storage", provider: "GCP" },
      { name: "Cloud SQL", category: "Database", provider: "GCP" },
      { name: "Cloud CDN", category: "Networking", provider: "GCP" },
      { name: "GuardDuty", category: "Security", provider: "AWS" },
      { name: "Security Center", category: "Security", provider: "Azure" },
      { name: "BigQuery", category: "Analytics", provider: "GCP" },
      { name: "Redshift", category: "Analytics", provider: "AWS" },
    ];

    return services.map((svc, idx) => {
      const currentCost = Math.random() * 5000 + 500;
      const trend = Math.random() > 0.5 ? 1 : -1;
      const previousCost = currentCost - trend * (Math.random() * 500);
      return {
        id: `service-${idx}`,
        name: svc.name,
        category: svc.category,
        provider: svc.provider,
        currentCost,
        previousCost,
        resourceCount: Math.floor(Math.random() * 50) + 1,
        region: `${svc.provider.toLowerCase()}-region-${Math.floor(Math.random() * 3) + 1}`,
      };
    });
  }

  function toggleServiceExpansion(serviceId: string) {
    if (expandedService === serviceId) {
      setExpandedService(null);
    } else {
      setExpandedService(serviceId);
      if (!serviceDetails[serviceId]) {
        fetchServiceDetails(serviceId);
      }
    }
  }

  async function fetchServiceDetails(serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    const mockResources = Array.from({ length: Math.min(service.resourceCount, 10) }, (_, i) => ({
      id: `resource-${serviceId}-${i}`,
      name: `${service.name.replace(/s$/, "")}-${i + 1}`,
      type: service.category,
      cost: service.currentCost / service.resourceCount,
      status: Math.random() > 0.2 ? "running" : "stopped",
    }));

    setServiceDetails((prev) => ({
      ...prev,
      [serviceId]: {
        service,
        resources: mockResources,
      },
    }));
  }

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      if (selectedProvider !== "all" && service.provider !== selectedProvider) return false;
      if (selectedCategory !== "all" && service.category !== selectedCategory) return false;
      return true;
    });
  }, [services, selectedProvider, selectedCategory]);

  const servicesByCategory = useMemo(() => {
    const groups: Record<string, CloudService[]> = {};
    filteredServices.forEach((service) => {
      if (!groups[service.category]) {
        groups[service.category] = [];
      }
      groups[service.category].push(service);
    });
    return groups;
  }, [filteredServices]);

  const totalCost = useMemo(() => {
    return filteredServices.reduce((sum, service) => sum + service.currentCost, 0);
  }, [filteredServices]);

  const totalResources = useMemo(() => {
    return filteredServices.reduce((sum, service) => sum + service.resourceCount, 0);
  }, [filteredServices]);

  const providers = useMemo(() => {
    const uniqueProviders = new Set(services.map((s) => s.provider));
    return ["all", ...Array.from(uniqueProviders)];
  }, [services]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(services.map((s) => s.category));
    return ["all", ...Array.from(uniqueCategories)];
  }, [services]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getCostTrend(service: CloudService) {
    const change = ((service.currentCost - service.previousCost) / service.previousCost) * 100;
    return {
      percentage: Math.abs(change).toFixed(1),
      isIncrease: change > 0,
    };
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-slate-400">Loading cloud services...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cloud Services</h1>
        <p className="text-slate-400">
          Monitor and analyze costs across all your cloud service providers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent/10 p-2">
                  <Cloud className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm font-medium text-slate-400">Total Monthly Cost</p>
              </div>
              <p className="text-3xl font-bold text-accent">{formatCurrency(totalCost)}</p>
              <p className="text-sm text-slate-500">{filteredServices.length} services</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Server className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Total Resources</p>
              </div>
              <p className="text-3xl font-bold text-white">{totalResources}</p>
              <p className="text-sm text-slate-500">across all providers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-500/10 p-2">
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Active Providers</p>
              </div>
              <p className="text-3xl font-bold text-white">{providers.length - 1}</p>
              <div className="flex gap-2">
                {providers.slice(1).map((provider) => (
                  <Badge
                    key={provider}
                    variant="outline"
                    className={PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS]}
                  >
                    {provider}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Cloud Provider
              </label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider === "all" ? "All Providers" : provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Service Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(servicesByCategory).length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12">
            <div className="text-center text-slate-400">
              <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No services found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(servicesByCategory).map(([category, categoryServices]) => {
            const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Server;
            const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || "bg-slate-500/10 text-slate-500";
            const categoryCost = categoryServices.reduce((sum, service) => sum + service.currentCost, 0);

            return (
              <Card key={category} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${colorClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-white">{category}</CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          {categoryServices.length} service{categoryServices.length !== 1 ? "s" : ""} ·
                          Monthly cost: {formatCurrency(categoryCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryServices.map((service) => {
                      const trend = getCostTrend(service);
                      const isExpanded = expandedService === service.id;
                      const details = serviceDetails[service.id];

                      return (
                        <div key={service.id}>
                          <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="text-base font-semibold text-white mb-1">
                                      {service.name}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className={PROVIDER_COLORS[service.provider as keyof typeof PROVIDER_COLORS]}
                                    >
                                      {service.provider}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Current Month</span>
                                    <span className="text-lg font-bold text-accent">
                                      {formatCurrency(service.currentCost)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Trend</span>
                                    <div className="flex items-center gap-1">
                                      {trend.isIncrease ? (
                                        <TrendingUp className="h-4 w-4 text-red-500" />
                                      ) : (
                                        <TrendingDown className="h-4 w-4 text-green-500" />
                                      )}
                                      <span
                                        className={`text-sm font-semibold ${
                                          trend.isIncrease ? "text-red-500" : "text-green-500"
                                        }`}
                                      >
                                        {trend.percentage}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Resources</span>
                                    <span className="text-sm font-semibold text-white">
                                      {service.resourceCount}
                                    </span>
                                  </div>

                                  {service.region && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-400">Region</span>
                                      <span className="text-xs text-slate-500">
                                        {service.region}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleServiceExpansion(service.id)}
                                  className="w-full"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-2" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                      View Details
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {isExpanded && details && (
                            <Card className="mt-2 bg-slate-900 border-slate-700">
                              <CardHeader>
                                <CardTitle className="text-sm text-white">Resources</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {details.resources.map((resource) => (
                                    <div
                                      key={resource.id}
                                      className="flex items-center justify-between p-2 bg-slate-800 rounded"
                                    >
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-white">
                                          {resource.name}
                                        </p>
                                        <p className="text-xs text-slate-500">{resource.type}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-accent">
                                          {formatCurrency(resource.cost)}
                                        </p>
                                        <Badge
                                          variant={resource.status === "running" ? "success" : "secondary"}
                                          className="text-xs"
                                        >
                                          {resource.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                  {details.resources.length < service.resourceCount && (
                                    <p className="text-xs text-slate-500 text-center pt-2">
                                      Showing {details.resources.length} of {service.resourceCount} resources
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
