import { prisma } from "@/lib/db";
import { AnalyticsTabs } from "./analytics-tabs";

export default async function AnalyticsPage() {
  // Total professionals
  const totalProfessionals = await prisma.professional.count();

  // Data completeness
  const [withPhone, withEmail, withEducation, withExperience] = await Promise.all([
    prisma.professional.count({
      where: {
        OR: [
          { phone: { not: null } },
          { mobileNumber: { not: null } },
          { officeNumber: { not: null } },
        ],
      },
    }),
    prisma.professional.count({
      where: {
        OR: [
          { email: { not: null } },
          { personalEmail: { not: null } },
          { workEmail: { not: null } },
        ],
      },
    }),
    prisma.professional.count({
      where: { educations: { some: {} } },
    }),
    prisma.professional.count({
      where: { experiences: { some: {} } },
    }),
  ]);

  const pct = (n: number) =>
    totalProfessionals > 0 ? (n / totalProfessionals) * 100 : 0;

  const completeness = {
    phone: pct(withPhone),
    email: pct(withEmail),
    education: pct(withEducation),
    experience: pct(withExperience),
  };

  // Category distribution (full speciality)
  const categoryGroups = await prisma.professional.groupBy({
    by: ["category"],
    _count: true,
    orderBy: { _count: { category: "desc" } },
  });
  const categoryData = categoryGroups.map((c) => ({
    name: c.category,
    value: c._count,
  }));

  // Category group distribution (for pie)
  const catGroupData = await prisma.professional.groupBy({
    by: ["categoryGroup"],
    _count: true,
    orderBy: { _count: { categoryGroup: "desc" } },
  });
  const categoryGroupData = catGroupData.map((c) => ({
    name: c.categoryGroup,
    value: c._count,
  }));

  // University distribution
  const uniGroups = await prisma.education.groupBy({
    by: ["university"],
    where: { university: { not: null } },
    _count: true,
    orderBy: { _count: { university: "desc" } },
    take: 20,
  });
  const universityData = uniGroups
    .filter((u) => u.university && u.university.trim() !== "")
    .map((u) => ({
      name: u.university!,
      value: u._count,
    }));

  // University-to-category mapping for top 5
  const top5Unis = universityData.slice(0, 5);
  const universityCategories = await Promise.all(
    top5Unis.map(async (uni) => {
      const profs = await prisma.education.findMany({
        where: { university: uni.name },
        select: { professional: { select: { categoryGroup: true } } },
      });
      const catMap = new Map<string, number>();
      for (const p of profs) {
        const g = p.professional.categoryGroup;
        catMap.set(g, (catMap.get(g) || 0) + 1);
      }
      const categories = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
      return { university: uni.name, categories };
    })
  );

  // Average experience count
  const totalExperiences = await prisma.experience.count();
  const avgExperience =
    totalProfessionals > 0 ? totalExperiences / totalProfessionals : 0;

  // Top historical facilities (from Experience records)
  const historicalFacilities = await prisma.experience.groupBy({
    by: ["facility"],
    where: { facility: { not: null } },
    _count: true,
    orderBy: { _count: { facility: "desc" } },
    take: 20,
  });
  const topHistoricalFacilities = historicalFacilities
    .filter((f) => f.facility && f.facility.trim() !== "")
    .map((f) => ({
      name: f.facility!,
      value: f._count,
    }));

  // Professionals who worked at 3+ distinct facilities
  const experienceCounts = await prisma.$queryRawUnsafe<
    Array<{ professionalId: number; facilityCount: number }>
  >(
    `SELECT professionalId, COUNT(DISTINCT facility) as facilityCount
     FROM Experience
     WHERE facility IS NOT NULL AND facility != ''
     GROUP BY professionalId
     HAVING COUNT(DISTINCT facility) >= 3`
  );
  const mobileProfessionals = experienceCounts.length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Deep insights into Ethiopian healthcare professionals in Dubai
        </p>
      </div>

      <AnalyticsTabs
        completeness={completeness}
        categoryData={categoryData}
        categoryGroupData={categoryGroupData}
        universityData={universityData}
        universityCategories={universityCategories}
        avgExperience={avgExperience}
        topHistoricalFacilities={topHistoricalFacilities}
        mobileProfessionals={mobileProfessionals}
        totalProfessionals={totalProfessionals}
      />
    </div>
  );
}
