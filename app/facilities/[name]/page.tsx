import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { classifyFacilityType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Users,
  Briefcase,
  Phone,
  UserCheck,
  History,
} from "lucide-react";

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const facilityName = decodeURIComponent(name);

  // Current staff at this facility
  const currentStaff = await prisma.professional.findMany({
    where: { currentFacility: facilityName },
    include: {
      experiences: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  // Historical staff — professionals who have experience records at this facility but aren't currently there
  const historicalExperiences = await prisma.experience.findMany({
    where: {
      facility: facilityName,
      professional: {
        currentFacility: { not: facilityName },
      },
    },
    include: {
      professional: {
        select: {
          id: true,
          dhaUniqueId: true,
          name: true,
          categoryGroup: true,
          speciality: true,
          currentFacility: true,
          hasContact: true,
        },
      },
    },
    orderBy: { isPresent: "desc" },
  });

  // Also check experiences where current staff worked here before (for timeline)
  const allExperiencesHere = await prisma.experience.findMany({
    where: { facility: facilityName },
    include: {
      professional: {
        select: {
          id: true,
          dhaUniqueId: true,
          name: true,
          categoryGroup: true,
        },
      },
    },
    orderBy: [{ isPresent: "desc" }, { startDate: "desc" }],
  });

  if (currentStaff.length === 0 && historicalExperiences.length === 0 && allExperiencesHere.length === 0) {
    notFound();
  }

  const facilityType = classifyFacilityType(facilityName);

  // Deduplicate historical professionals
  const historicalProfessionals = new Map<number, typeof historicalExperiences[0]["professional"] & { roles: string[]; lastSeen: string | null }>();
  for (const exp of historicalExperiences) {
    const existing = historicalProfessionals.get(exp.professional.id);
    if (existing) {
      if (exp.role && !existing.roles.includes(exp.role)) {
        existing.roles.push(exp.role);
      }
    } else {
      historicalProfessionals.set(exp.professional.id, {
        ...exp.professional,
        roles: exp.role ? [exp.role] : [],
        lastSeen: exp.endDate || null,
      });
    }
  }

  // Category breakdown of current staff
  const categoryBreakdown = new Map<string, number>();
  for (const p of currentStaff) {
    categoryBreakdown.set(p.categoryGroup, (categoryBreakdown.get(p.categoryGroup) || 0) + 1);
  }
  const sortedCategories = Array.from(categoryBreakdown.entries()).sort((a, b) => b[1] - a[1]);

  const contactableCount = currentStaff.filter((p) => p.hasContact).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/facilities">
          <ArrowLeft className="h-4 w-4" />
          Back to Facilities
        </Link>
      </Button>

      {/* Facility header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{facilityName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge>{facilityType}</Badge>
              <Badge variant="secondary">
                <Users className="mr-1 h-3 w-3" />
                {currentStaff.length} current staff
              </Badge>
              {contactableCount > 0 && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  <Phone className="mr-1 h-3 w-3" />
                  {contactableCount} contactable
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentStaff.length}</p>
                <p className="text-xs text-muted-foreground">Current Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <History className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{historicalProfessionals.size}</p>
                <p className="text-xs text-muted-foreground">Former Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sortedCategories.length}</p>
                <p className="text-xs text-muted-foreground">Professional Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {sortedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Staff by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sortedCategories.map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-sm py-1 px-3">
                  {cat}
                  <span className="ml-1.5 font-bold">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Staff */}
      {currentStaff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4" />
              Currently Working Here
              <Badge variant="secondary" className="ml-auto font-normal">
                {currentStaff.length} professional{currentStaff.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Speciality</TableHead>
                  <TableHead className="text-center">Contact</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Exp.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentStaff.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6 font-medium">
                      <Link
                        href={`/professionals/${p.dhaUniqueId}`}
                        className="text-foreground hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {p.categoryGroup}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.speciality}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.hasContact ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="Has contact info" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" title="No contact info" />
                      )}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-muted-foreground">
                      {p.experiences.length}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Historical Staff */}
      {historicalProfessionals.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Previously Worked Here
              <Badge variant="secondary" className="ml-auto font-normal">
                {historicalProfessionals.size} professional{historicalProfessionals.size !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Role(s) Here</TableHead>
                  <TableHead className="hidden lg:table-cell">Now At</TableHead>
                  <TableHead className="text-center">Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(historicalProfessionals.values()).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6 font-medium">
                      <Link
                        href={`/professionals/${p.dhaUniqueId}`}
                        className="text-foreground hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {p.categoryGroup}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {p.roles.length > 0 ? p.roles.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                      {p.currentFacility || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.hasContact ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="Has contact info" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" title="No contact info" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Experience Timeline */}
      {allExperiencesHere.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Experience Timeline
              <Badge variant="secondary" className="ml-auto font-normal">
                {allExperiencesHere.length} record{allExperiencesHere.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {allExperiencesHere.slice(0, 30).map((exp, idx) => (
                <div key={exp.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {idx < Math.min(allExperiencesHere.length, 30) - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                  )}
                  <div className="relative shrink-0 mt-1.5">
                    <div
                      className={`h-[14px] w-[14px] rounded-full border-2 ${
                        exp.isPresent
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/professionals/${exp.professional.dhaUniqueId}`}
                        className="font-medium text-sm hover:text-primary hover:underline"
                      >
                        {exp.professional.name}
                      </Link>
                      {exp.isPresent && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    {exp.role && (
                      <p className="text-sm text-muted-foreground">{exp.role}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {exp.startDate || "N/A"} &mdash; {exp.isPresent ? "Present" : exp.endDate || "N/A"}
                      {exp.duration && (
                        <span className="ml-2">({exp.duration})</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {allExperiencesHere.length > 30 && (
                <p className="text-sm text-muted-foreground pt-2 pl-8">
                  +{allExperiencesHere.length - 30} more records
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
