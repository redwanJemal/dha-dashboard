import { prisma } from "@/lib/db";
import { classifyFacilityType } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryChart } from "@/components/charts/category-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Users, Building2, Phone, Stethoscope } from "lucide-react";

const COLORS = ["#16a34a", "#eab308", "#ef4444", "#3b82f6", "#8b5cf6"];

export default async function DashboardPage() {
  const [total, contactable, categoryGroups, facilities, universities] =
    await Promise.all([
      prisma.professional.count(),
      prisma.professional.count({ where: { hasContact: true } }),
      prisma.professional.groupBy({
        by: ["categoryGroup"],
        _count: true,
        orderBy: { _count: { categoryGroup: "desc" } },
      }),
      prisma.professional.groupBy({
        by: ["currentFacility"],
        where: { currentFacility: { not: null } },
        _count: true,
        orderBy: { _count: { currentFacility: "desc" } },
      }),
      prisma.education.groupBy({
        by: ["university"],
        where: { university: { not: null } },
        _count: true,
        orderBy: { _count: { university: "desc" } },
        take: 10,
      }),
    ]);

  const activeFacilities = facilities.length;

  // Category distribution chart data
  const categoryData = categoryGroups.map((g, i) => ({
    name: g.categoryGroup || "Unknown",
    value: g._count,
    fill: COLORS[i % COLORS.length],
  }));

  // Top 10 facilities
  const topFacilities = facilities.slice(0, 10).map((f) => ({
    name: f.currentFacility || "Unknown",
    value: f._count,
  }));

  // Facility type distribution
  const facilityTypeMap = new Map<string, number>();
  for (const f of facilities) {
    const type = classifyFacilityType(f.currentFacility || "");
    facilityTypeMap.set(type, (facilityTypeMap.get(type) || 0) + f._count);
  }
  const facilityTypeData = Array.from(facilityTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
    }));

  // Top universities
  const topUniversities = universities.map((u) => ({
    name: u.university || "Unknown",
    value: u._count,
  }));

  const stats = [
    {
      title: "Total Professionals",
      value: total.toLocaleString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Active Facilities",
      value: activeFacilities.toLocaleString(),
      icon: Building2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Contactable",
      value: contactable.toLocaleString(),
      icon: Phone,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Categories",
      value: categoryGroups.length.toLocaleString(),
      icon: Stethoscope,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            DHA Professionals Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Overview of healthcare professionals registered with DHA
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryChart data={categoryData} />
            </CardContent>
          </Card>

          {/* Top 10 Facilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Facilities</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={topFacilities}
                layout="horizontal"
                color="#16a34a"
              />
            </CardContent>
          </Card>

          {/* Facility Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Facility Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryChart data={facilityTypeData} />
            </CardContent>
          </Card>

          {/* Top Universities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Universities</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={topUniversities}
                layout="horizontal"
                color="#8b5cf6"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
