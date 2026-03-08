import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface ProfListItem {
  name: string;
  categoryOrSpeciality: string;
  facilityName: string;
  dhaUniqueId: string;
  licensecount: number;
  hasPhoto: boolean;
}

interface DetailRecord {
  name: string;
  phone: string;
  nationality: string;
  email: string;
  dhaUniqueId: string;
  profileUrl: string;
  categoryFromList: string;
  currentFacilityFromList: string;
  contactDetails: {
    officeNumber?: string;
    mobileNumber?: string;
    workEmail?: string;
    personalEmail?: string;
  };
  specialities: Array<{
    name: string;
    status?: string;
    facility?: string;
    license?: string;
  }>;
  experience: Array<{
    facility?: string;
    role?: string;
    status?: string;
    isPresent?: boolean;
    startDate?: string;
    endDateAndDuration?: string;
    license?: string;
    location?: string;
  }>;
  education: Array<{
    university?: string;
    degree?: string;
    graduationYear?: string;
    location?: string;
  }>;
  languages: Array<{
    language: string;
    proficiency?: string;
  }>;
}

function splitCategory(full: string) {
  const idx = (full || "").indexOf("-");
  if (idx === -1) return { group: full || "Unknown", speciality: full || "Unknown" };
  return { group: full.slice(0, idx).trim(), speciality: full.slice(idx + 1).trim() };
}

function parseEndDateDuration(raw: string) {
  if (!raw) return { endDate: "", duration: "" };
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) return { endDate: match[1].trim(), duration: match[2].trim() };
  return { endDate: raw, duration: "" };
}

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.speciality.deleteMany();
  await prisma.language.deleteMany();
  await prisma.education.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.professional.deleteMany();

  const dataDir = join(__dirname, "..", "data");
  const professionals: ProfListItem[] = JSON.parse(readFileSync(join(dataDir, "professionals.json"), "utf-8"));
  const details: Record<string, DetailRecord> = JSON.parse(readFileSync(join(dataDir, "details.json"), "utf-8"));

  let count = 0;
  for (const prof of professionals) {
    const detail = details[prof.dhaUniqueId];
    const { group, speciality } = splitCategory(prof.categoryOrSpeciality);

    const contact = detail?.contactDetails || {};
    const phone = contact.mobileNumber || detail?.phone || "";
    const hasContact = !!(contact.mobileNumber || contact.officeNumber || contact.personalEmail || contact.workEmail || detail?.phone || detail?.email);

    await prisma.professional.create({
      data: {
        dhaUniqueId: prof.dhaUniqueId,
        name: detail?.name || prof.name,
        nationality: detail?.nationality || "Ethiopia",
        category: prof.categoryOrSpeciality,
        categoryGroup: group,
        speciality: speciality,
        currentFacility: prof.facilityName || null,
        phone: phone || null,
        mobileNumber: contact.mobileNumber || null,
        officeNumber: contact.officeNumber || null,
        email: detail?.email || null,
        personalEmail: contact.personalEmail || null,
        workEmail: contact.workEmail || null,
        profileUrl: detail?.profileUrl || `https://services.dha.gov.ae/sheryan/wps/portal/home/medical-directory/professional-details?dhaUniqueId=${prof.dhaUniqueId}`,
        hasContact,
        experiences: {
          create: (detail?.experience || []).map((exp) => {
            const { endDate, duration } = parseEndDateDuration(exp.endDateAndDuration || "");
            return {
              facility: exp.facility || null,
              role: exp.role || null,
              status: exp.status || null,
              isPresent: exp.isPresent || false,
              startDate: exp.startDate || null,
              endDate: endDate || null,
              duration: duration || null,
              license: exp.license || null,
            };
          }),
        },
        educations: {
          create: (detail?.education || []).map((edu) => ({
            university: edu.university || null,
            degree: edu.degree || null,
            graduationYear: edu.graduationYear || null,
            location: edu.location || null,
          })),
        },
        languages: {
          create: (detail?.languages || []).map((lang) => ({
            language: lang.language,
            proficiency: lang.proficiency || null,
          })),
        },
        specialities: {
          create: (detail?.specialities || []).map((spec) => ({
            name: spec.name,
            status: spec.status || null,
            facility: spec.facility || null,
            license: spec.license || null,
          })),
        },
      },
    });
    count++;
    if (count % 50 === 0) console.log(`  Seeded ${count}/${professionals.length}`);
  }

  console.log(`Done! Seeded ${count} professionals.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
