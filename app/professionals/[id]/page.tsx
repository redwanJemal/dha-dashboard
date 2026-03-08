import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Globe,
  Building2,
  ExternalLink,
} from "lucide-react";

export default async function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const professional = await prisma.professional.findUnique({
    where: { dhaUniqueId: id },
    include: {
      experiences: { orderBy: { isPresent: "desc" } },
      educations: true,
      languages: true,
      specialities: true,
    },
  });

  if (!professional) {
    notFound();
  }

  const contactFields = [
    { label: "Mobile", value: professional.mobileNumber, icon: Phone, href: `tel:${professional.mobileNumber}` },
    { label: "Office", value: professional.officeNumber, icon: Phone, href: `tel:${professional.officeNumber}` },
    { label: "Personal Email", value: professional.personalEmail, icon: Mail, href: `mailto:${professional.personalEmail}` },
    { label: "Work Email", value: professional.workEmail, icon: Mail, href: `mailto:${professional.workEmail}` },
    { label: "Email", value: professional.email, icon: Mail, href: `mailto:${professional.email}` },
    { label: "Phone", value: professional.phone, icon: Phone, href: `tel:${professional.phone}` },
  ].filter((f) => f.value);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/professionals">
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>
      </Button>

      {/* Profile header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{professional.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{professional.categoryGroup}</Badge>
          <Badge variant="secondary">{professional.speciality}</Badge>
          <Badge variant="outline">
            <MapPin className="mr-1 h-3 w-3" />
            {professional.nationality}
          </Badge>
        </div>
        {professional.currentFacility && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            Currently at:{" "}
            <Link
              href={`/facilities/${encodeURIComponent(professional.currentFacility)}`}
              className="text-primary hover:underline"
            >
              {professional.currentFacility}
            </Link>
          </p>
        )}
      </div>

      <Separator />

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {professional.hasContact && contactFields.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {contactFields.map((field) => (
                <div key={field.label} className="flex items-start gap-3 rounded-lg border p-3">
                  <field.icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <a
                      href={field.href}
                      className="text-sm font-medium text-primary hover:underline break-all"
                    >
                      {field.value}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contact information available.</p>
          )}
        </CardContent>
      </Card>

      {/* Languages */}
      {professional.languages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Languages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {professional.languages.map((lang) => (
                <Badge key={lang.id} variant="secondary">
                  {lang.language}
                  {lang.proficiency && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      ({lang.proficiency})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Experience */}
      {professional.experiences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Work Experience
              <Badge variant="secondary" className="ml-auto font-normal">
                {professional.experiences.length} position{professional.experiences.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {professional.experiences.map((exp, idx) => (
                <div key={exp.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {idx < professional.experiences.length - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                  )}
                  {/* Timeline dot */}
                  <div className="relative shrink-0 mt-1.5">
                    <div
                      className={`h-[14px] w-[14px] rounded-full border-2 ${
                        exp.isPresent
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{exp.role || "Unknown Role"}</p>
                      {exp.isPresent && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">
                          Present
                        </Badge>
                      )}
                      {exp.status && (
                        <Badge
                          variant={exp.status === "Active" ? "default" : "destructive"}
                          className={
                            exp.status === "Active"
                              ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs"
                              : "text-xs"
                          }
                        >
                          {exp.status}
                        </Badge>
                      )}
                    </div>
                    {exp.facility && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {exp.facility}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {exp.startDate || "N/A"} &mdash; {exp.isPresent ? "Present" : exp.endDate || "N/A"}
                      {exp.duration && (
                        <span className="ml-2 text-muted-foreground">({exp.duration})</span>
                      )}
                    </p>
                    {exp.license && (
                      <p className="text-xs text-muted-foreground">
                        License: {exp.license}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {professional.educations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {professional.educations.map((edu) => (
                <div key={edu.id} className="rounded-lg border p-4 space-y-1">
                  {edu.degree && (
                    <p className="font-medium text-sm">{edu.degree}</p>
                  )}
                  {edu.university && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {edu.university}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {edu.graduationYear && <span>Graduated: {edu.graduationYear}</span>}
                    {edu.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {edu.location}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specialities */}
      {professional.specialities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Specialities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {professional.specialities.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{spec.name}</p>
                    {spec.facility && (
                      <p className="text-xs text-muted-foreground">{spec.facility}</p>
                    )}
                    {spec.license && (
                      <p className="text-xs text-muted-foreground">License: {spec.license}</p>
                    )}
                  </div>
                  {spec.status && (
                    <Badge
                      variant={spec.status === "Active" ? "default" : "secondary"}
                      className={
                        spec.status === "Active"
                          ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
                          : ""
                      }
                    >
                      {spec.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* External link */}
      {professional.profileUrl && (
        <div>
          <Button variant="outline" asChild>
            <a href={professional.profileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              View DHA Profile
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
