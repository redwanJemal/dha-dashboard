/**
 * DHA Professional Detail Scraper
 * Fetches detailed profile info for each Ethiopian professional:
 *   - Contact: phone (office/mobile), email (work/personal)
 *   - Specialities with license status
 *   - Work experience (facility, dates, duration, present/past)
 *   - Education (university, year, location)
 *   - Languages
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const BASE_URL = 'https://services.dha.gov.ae/sheryan/wps/portal/home/medical-directory/professional-details';

const HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://services.dha.gov.ae/sheryan/wps/portal/home/medical-directory',
};

/** Strip HTML tags and normalize whitespace */
function clean(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Extract a section of HTML between two section headers */
function extractSection(html, sectionName) {
  const regex = new RegExp(
    `<div class="section-header">${sectionName}</div>([\\s\\S]*?)(?=<div class="section-header">|<!-- end of hide|<div class="profile-container">\\s*<div class="section-header">)`,
    'i'
  );
  const match = html.match(regex);
  return match ? match[1] : '';
}

/** Parse the profile header: name, phone, nationality, email */
function parseProfileHeader(html) {
  const result = { name: '', phone: '', nationality: '', email: '' };

  // Name: <h1 class="accent-2">Name</h1>
  const nameMatch = html.match(/<h1 class="accent-2">([^<]+)<\/h1>/);
  if (nameMatch) result.name = nameMatch[1].trim();

  // Phone: <li class="icon-Telephone">number</li>
  const phoneMatch = html.match(/<li class="icon-Telephone">([^<]+)<\/li>/);
  if (phoneMatch) result.phone = phoneMatch[1].trim();

  // Nationality: <li class="icon-Flag">country</li>
  const nationalityMatch = html.match(/<li class="icon-Flag">([^<]+)<\/li>/);
  if (nationalityMatch) result.nationality = nationalityMatch[1].trim();

  // Email: <li class="icon-Envelope">email</li>
  const emailMatch = html.match(/<li class="icon-Envelope">([^<]+)<\/li>/);
  if (emailMatch) result.email = emailMatch[1].trim();

  return result;
}

/** Parse specialities section */
function parseSpecialities(html) {
  const section = extractSection(html, 'Specialities');
  if (!section) return [];

  const specialities = [];
  const blocks = section.split('<div class="section-body">').slice(1);

  for (const block of blocks) {
    const spec = {};

    // Speciality name from h4
    const h4Match = block.match(/<h4>([\s\S]*?)<\/h4>/);
    if (h4Match) {
      const h4Text = clean(h4Match[1]);
      // Extract status (Active License / etc)
      const statusMatch = h4Text.match(/(Active|Cancelled|Expired|Suspended)\s*License/i);
      spec.status = statusMatch ? statusMatch[1].trim() : '';
      spec.name = h4Text.replace(/(Active|Cancelled|Expired|Suspended)\s*License/gi, '').trim();
    }

    // Facility from profileBlue
    const facilityMatch = block.match(/<ul class="profileBlue">\s*<li>([^<]+)<\/li>/);
    if (facilityMatch) spec.facility = facilityMatch[1].trim();

    // License number from profileGrey or profileBlue
    const licenseMatch = block.match(/License:\s*([^<]+)/);
    if (licenseMatch) spec.license = licenseMatch[1].trim();

    if (spec.name) specialities.push(spec);
  }

  return specialities;
}

/** Parse experience section (work history) */
function parseExperience(html) {
  const section = extractSection(html, 'Experience');
  if (!section) return [];

  const experiences = [];
  const blocks = section.split('<div class="section-body">').slice(1);

  for (const block of blocks) {
    const exp = {};

    // Status (Active/Cancelled)
    const statusMatch = block.match(/<div class="experienceStatus"[^>]*>([^<]+)<\/div>/);
    if (statusMatch) exp.status = statusMatch[1].trim();

    // Role/speciality from h4
    const h4Match = block.match(/<h4>([\s\S]*?)<\/h4>/);
    if (h4Match) {
      const h4Text = clean(h4Match[1]);
      exp.role = h4Text.replace(/(Active|Cancelled|Expired|Suspended)\s*License/gi, '').trim();
    }

    // Facility and license from profileBlue
    const blueItems = [...block.matchAll(/<ul class="profileBlue">\s*([\s\S]*?)<\/ul>/g)];
    if (blueItems.length > 0) {
      const lis = [...blueItems[0][1].matchAll(/<li>([^<]*)<\/li>/g)];
      if (lis.length > 0) exp.facility = lis[0][1].trim();
      if (lis.length > 1) {
        const licMatch = lis[1][1].match(/License:\s*(.*)/);
        if (licMatch) exp.license = licMatch[1].trim();
      }
    }

    // Date range and location from profileGrey
    const greyMatch = block.match(/<ul class="profileGrey">\s*([\s\S]*?)<\/ul>/);
    if (greyMatch) {
      const greyText = clean(greyMatch[1]);
      // Date range: "04 July 2023 - 04 July 2027 (2 years)"
      const dateMatch = greyText.match(/(\d{1,2}\s+\w+\s+\d{4})\s*-\s*(.*?\))/);
      if (dateMatch) {
        exp.startDate = dateMatch[1].trim();
        exp.endDateAndDuration = dateMatch[2].trim();
      }
      // Location
      const locMatch = greyText.match(/(?:Dubai|Abu Dhabi|Sharjah|Ajman|RAK|Fujairah|UAQ)[^)]*UAE/i);
      if (locMatch) exp.location = locMatch[0].trim();
      else if (greyText.includes('Dubai')) exp.location = 'Dubai, UAE';
    }

    // Present indicator
    const presentMatch = block.match(/text-right[^>]*>Present<\/span>/);
    exp.isPresent = !!presentMatch;

    if (exp.facility || exp.role) experiences.push(exp);
  }

  return experiences;
}

/** Parse education section */
function parseEducation(html) {
  // Get everything between "Education" header and the next section
  const eduRegex = /<div class="section-header">Education<\/div>([\s\S]*?)(?=<div class="profile-container">|<!-- end of hide)/i;
  const eduSection = html.match(eduRegex);
  if (!eduSection) return [];

  const education = [];
  const blocks = eduSection[1].split('<div class="section-body">').slice(1);

  for (const block of blocks) {
    const edu = {};

    // Degree from h4
    const h4Match = block.match(/<h4>\s*([\s\S]*?)\s*<\/h4>/);
    if (h4Match) {
      const degree = clean(h4Match[1]);
      if (degree) edu.degree = degree;
    }

    // University from profileBlue
    const uniMatch = block.match(/<ul class="profileBlue">\s*<li>([^<]+)<\/li>/);
    if (uniMatch) edu.university = uniMatch[1].trim();

    // Year and location from profileGrey
    const greyMatch = block.match(/<ul class="profileGrey">([\s\S]*?)<\/ul>/);
    if (greyMatch) {
      const greyText = clean(greyMatch[1]);
      const yearMatch = greyText.match(/Graduated\s+(\d{4})/i);
      if (yearMatch) edu.graduationYear = yearMatch[1];
      // Location is usually the last li
      const locMatch = greyText.match(/(?:Graduated\s+\d{4}\s+)?(.+)$/);
      if (locMatch) {
        const loc = locMatch[1].replace(/Graduated\s+\d{4}/i, '').trim();
        if (loc) edu.location = loc;
      }
    }

    if (edu.university || edu.degree) education.push(edu);
  }

  return education;
}

/** Parse languages section */
function parseLanguages(html) {
  const langRegex = /<div class="section-header">Languages<\/div>([\s\S]*?)(?=<div class="profile-container">|<div class="section-header">)/i;
  const section = html.match(langRegex);
  if (!section) return [];

  const languages = [];
  const langMatches = [...section[1].matchAll(/<label class="large">([^<]+)<\/label>\s*<div class="small"[^>]*>([^<]*)<\/div>/g)];
  for (const m of langMatches) {
    languages.push({ language: m[1].trim(), proficiency: m[2].trim() });
  }
  return languages;
}

/** Parse contact details section */
function parseContactDetails(html) {
  const contactRegex = /<div class="section-header">Contact Details<\/div>([\s\S]*?)(?=<div class="profile-container">|<div class="happiness-meter">|<div id="initiateChatBot")/i;
  const section = html.match(contactRegex);
  if (!section) return {};

  const contact = {};

  // Office number
  const officeMatch = section[1].match(/Office Number<\/label>\s*<div[^>]*>([^<]+)<\/div>/);
  if (officeMatch) contact.officeNumber = officeMatch[1].trim();

  // Mobile number
  const mobileMatch = section[1].match(/Mobile Number<\/label>\s*<div[^>]*>([^<]+)<\/div>/);
  if (mobileMatch) contact.mobileNumber = mobileMatch[1].trim();

  // Work email
  const workEmailMatch = section[1].match(/Work Email<\/label>\s*<div[^>]*>([^<]+)<\/div>/);
  if (workEmailMatch) contact.workEmail = workEmailMatch[1].trim();

  // Personal email
  const personalEmailMatch = section[1].match(/Personal Email<\/label>\s*<div[^>]*>([^<]+)<\/div>/);
  if (personalEmailMatch) contact.personalEmail = personalEmailMatch[1].trim();

  return contact;
}

async function fetchDetail(dhaUniqueId) {
  const url = `${BASE_URL}?dhaUniqueId=${dhaUniqueId}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  return res.text();
}

function parseDetailPage(html) {
  const header = parseProfileHeader(html);
  const specialities = parseSpecialities(html);
  const experience = parseExperience(html);
  const education = parseEducation(html);
  const languages = parseLanguages(html);
  const contactDetails = parseContactDetails(html);

  return {
    ...header,
    contactDetails,
    specialities,
    experience,
    education,
    languages,
  };
}

async function main() {
  const profFile = join(DATA_DIR, 'professionals.json');
  if (!existsSync(profFile)) {
    console.error('Run scraper.js first to get professionals list');
    process.exit(1);
  }

  const professionals = JSON.parse(readFileSync(profFile, 'utf-8'));
  const detailsFile = join(DATA_DIR, 'details.json');

  // Load existing progress
  let details = {};
  if (existsSync(detailsFile)) {
    try {
      details = JSON.parse(readFileSync(detailsFile, 'utf-8'));
    } catch {
      details = {};
    }
  }

  // Only re-fetch if missing or old format (no contactDetails key)
  const toFetch = professionals.filter(p => {
    if (!p.dhaUniqueId) return false;
    const existing = details[p.dhaUniqueId];
    if (!existing) return true;
    // Re-fetch if old format (missing contactDetails)
    if (!existing.contactDetails && !existing.experience) return true;
    return false;
  });

  console.log(`Total professionals: ${professionals.length}`);
  console.log(`Already cached (new format): ${professionals.length - toFetch.length}`);
  console.log(`To fetch: ${toFetch.length}\n`);

  if (toFetch.length === 0) {
    console.log('All details already fetched. Delete data/details.json to re-fetch.');
    return;
  }

  let count = 0;
  let failed = 0;

  for (const prof of toFetch) {
    count++;
    try {
      const html = await fetchDetail(prof.dhaUniqueId);
      if (!html) {
        console.log(`  [${count}/${toFetch.length}] ${prof.name} - FAILED (no response)`);
        failed++;
        continue;
      }

      const parsed = parseDetailPage(html);
      parsed.dhaUniqueId = prof.dhaUniqueId;
      parsed.categoryFromList = prof.categoryOrSpeciality;
      parsed.currentFacilityFromList = prof.facilityName;
      parsed.profileUrl = `${BASE_URL}?dhaUniqueId=${prof.dhaUniqueId}`;

      details[prof.dhaUniqueId] = parsed;

      const expCount = parsed.experience.length;
      const currentExp = parsed.experience.filter(e => e.isPresent).length;
      const hasContact = parsed.contactDetails.mobileNumber || parsed.contactDetails.personalEmail;

      console.log(`  [${count}/${toFetch.length}] ${parsed.name || prof.name} | ${expCount} exp (${currentExp} active) | contact: ${hasContact ? 'YES' : 'no'} | edu: ${parsed.education.length}`);
    } catch (err) {
      console.log(`  [${count}/${toFetch.length}] ${prof.name} - ERROR: ${err.message}`);
      failed++;
    }

    // Save progress every 10 records
    if (count % 10 === 0) {
      writeFileSync(detailsFile, JSON.stringify(details, null, 2));
      console.log(`    ... saved progress (${Object.keys(details).length} total)\n`);
    }

    // Rate limiting - 400ms between requests
    await new Promise(r => setTimeout(r, 400));
  }

  writeFileSync(detailsFile, JSON.stringify(details, null, 2));
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! Saved ${Object.keys(details).length} detail records`);
  console.log(`Success: ${count - failed} | Failed: ${failed}`);
  console.log(`File: data/details.json`);
}

main().catch(console.error);
