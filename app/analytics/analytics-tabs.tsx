"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CategoryChart } from "@/components/charts/category-chart";
import { BarChart } from "@/components/charts/bar-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = ["#16a34a", "#eab308", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"];

interface AnalyticsTabsProps {
  completeness: {
    phone: number;
    email: number;
    education: number;
    experience: number;
  };
  categoryData: Array<{ name: string; value: number }>;
  categoryGroupData: Array<{ name: string; value: number }>;
  universityData: Array<{ name: string; value: number }>;
  universityCategories: Array<{
    university: string;
    categories: Array<{ name: string; count: number }>;
  }>;
  avgExperience: number;
  topHistoricalFacilities: Array<{ name: string; value: number }>;
  mobileProfessionals: number;
  totalProfessionals: number;
}

export function AnalyticsTabs({
  completeness,
  categoryData,
  categoryGroupData,
  universityData,
  universityCategories,
  avgExperience,
  topHistoricalFacilities,
  mobileProfessionals,
  totalProfessionals,
}: AnalyticsTabsProps) {
  const groupPieData = categoryGroupData.map((d, i) => ({
    ...d,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="education">Education Pipeline</TabsTrigger>
        <TabsTrigger value="work">Work Patterns</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Completeness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "Phone Number", value: completeness.phone },
              { label: "Email Address", value: completeness.email },
              { label: "Education Records", value: completeness.education },
              { label: "Work Experience", value: completeness.experience },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums">
                    {item.value.toFixed(1)}%
                  </span>
                </div>
                <Progress value={item.value} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Group Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryChart data={groupPieData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                All Professional Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={categoryData.slice(0, 25)}
                color="#8b5cf6"
                layout="horizontal"
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Education Pipeline Tab */}
      <TabsContent value="education" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 20 Universities</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={universityData}
              color="#16a34a"
              layout="horizontal"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              University-to-Category Mapping (Top 5 Universities)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead>Top Categories</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universityCategories.map((uc) => (
                    <TableRow key={uc.university}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {uc.university}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {uc.categories.slice(0, 5).map((cat) => (
                            <Badge
                              key={cat.name}
                              variant="outline"
                              className="text-[11px] px-1.5 py-0"
                            >
                              {cat.name} ({cat.count})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Work Patterns Tab */}
      <TabsContent value="work" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Experience Records per Professional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgExperience.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {totalProfessionals.toLocaleString()} professionals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mobile Professionals (3+ Facilities)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {mobileProfessionals.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalProfessionals > 0
                  ? ((mobileProfessionals / totalProfessionals) * 100).toFixed(1)
                  : 0}
                % of all professionals
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top Historical Employers (All-Time Experience Records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={topHistoricalFacilities}
              color="#ef4444"
              layout="horizontal"
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
