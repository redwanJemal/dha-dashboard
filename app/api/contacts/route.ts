import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const contacts = await prisma.professional.findMany({
    where: { hasContact: true },
    select: {
      dhaUniqueId: true,
      name: true,
      category: true,
      currentFacility: true,
      mobileNumber: true,
      officeNumber: true,
      personalEmail: true,
      workEmail: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(contacts);
}
