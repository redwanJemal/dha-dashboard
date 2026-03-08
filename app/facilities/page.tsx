import Link from "next/link";
import { prisma } from "@/lib/db";
import { classifyFacilityType } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Building2, Trophy, HeartPulse } from "lucide-react";
import { CategoryChart } from "@/components/charts/category-chart";
import { BarChart } from "@/components/charts/bar-chart";

const TYPE_COLORS: Record<string, string> = {
  Hospital: "#3b82f6",
  Clinic: "#16a34a",
  "Home Healthcare": "#eab308",
  Pharmacy: "#8b5cf6",
  Other: "#6b7280",
};

export default async function FacilitiesPage() {
  const facilityGroups = await prisma.professional.groupBy({
    by: ["currentFacility"],
    where: { currentFacility: { not: null } },
    _count: true,
    orderBy: { _count: { currentFacility: "desc" } },
  });

  const totalFacilities = facilityGroups.length;
  const topFacility = facilityGroups[0];
  const totalProfessionals = facilityGroups.reduce((s, f) => s + f._count, 0);

  // Home healthcare share
  const homeHealthcareCount = facilityGroups
    .filter((f) => classifyFacilityType(f.currentFacility!) === "Home Healthcare")
    .reduce((s, f) => s + f._count, 0);
  const homeHealthcareShare =
    totalProfessionals > 0
      ? ((homeHealthcareCount / totalProfessionals) * 100).toFixed(1)
      : "0";

  // Facility type distribution
  const typeMap = new Map<string, number>();
  for (const f of facilityGroups) {
    const type = classifyFacilityType(f.currentFacility!);
    typeMap.set(type, (typeMap.get(type) || 0) + f._count);
  }
  const typeData = Array.from(typeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value,
      fill: TYPE_COLORS[name] || "#6b7280",
    }));

  // Top 15 facilities for bar chart
  const top15 = facilityGroups.slice(0, 15).map((f) => ({
    name: f.currentFacility!,
    value: f._count,
  }));

  // Full table with category breakdowns
  const facilityDetails = await Promise.all(
    facilityGroups.map(async (f, index) => {
      const categories = await prisma.professional.groupBy({
        by: ["categoryGroup"],
        where: { currentFacility: f.currentFacility },
        _count: true,
        orderBy: { _count: { categoryGroup: "desc" } },
      });
      return {
        rank: index + 1,
        name: f.currentFacility!,
        type: classifyFacilityType(f.currentFacility!),
        count: f._count,
        categories: categories.map((c) => ({
          name: c.categoryGroup,
          count: c._count,
        })),
      };
    })
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facilities</h1>
        <p className="text-muted-foreground">
          Facility rankings and distribution analytics
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Facilities
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFacilities.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Distinct current facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Facility
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold leading-tight truncate">
              {topFacility?.currentFacility || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {topFacility?._count.toLocaleString()} Ethiopian staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Home Healthcare Share
            </CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{homeHealthcareShare}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {homeHealthcareCount.toLocaleString()} professionals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facility Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={typeData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 15 Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={top15} color="#3b82f6" layout="horizontal" />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Full Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Facilities Ranked by Ethiopian Staff Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Facility Name</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-24 text-right">Staff</TableHead>
                  <TableHead>Categories</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilityDetails.map((f) => (
                  <TableRow key={f.name}>
                    <TableCell className="font-medium text-muted-foreground">
                      {f.rank}
                    </TableCell>
                    <TableCell className="font-medium max-w-[280px] truncate">
                      <Link
                        href={`/facilities/${encodeURIComponent(f.name)}`}
                        className="text-foreground hover:text-primary hover:underline"
                      >
                        {f.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{f.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {f.count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.categories.slice(0, 4).map((c) => (
                          <Badge
                            key={c.name}
                            variant="outline"
                            className="text-[11px] px-1.5 py-0"
                          >
                            {c.name} ({c.count})
                          </Badge>
                        ))}
                        {f.categories.length > 4 && (
                          <Badge
                            variant="outline"
                            className="text-[11px] px-1.5 py-0 text-muted-foreground"
                          >
                            +{f.categories.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
