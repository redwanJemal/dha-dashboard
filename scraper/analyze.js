/**
 * Analysis & Report Generator
 * Produces facility rankings, category breakdowns, and comprehensive CSV exports
 * including contact details, education, work experience from detail pages.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const OUTPUT_DIR = join(__dirname, '..', 'output');

function loadJSON(filename) {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function toCsv(headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

function main() {
  const professionals = loadJSON('professionals.json');
  if (!professionals) {
    console.error('No professionals.json found. Run scraper.js first.');
    process.exit(1);
  }

  const details = loadJSON('details.json') || {};
  const detailCount = Object.keys(details).length;

  console.log('='.repeat(70));
  console.log('  DHA ETHIOPIAN PROFESSIONALS ANALYSIS REPORT');
  console.log('='.repeat(70));
  console.log(`\nTotal professionals: ${professionals.length}`);
  console.log(`Detail records: ${detailCount}`);

  // --- Category Breakdown ---
  const categories = {};
  for (const p of professionals) {
    const cat = p.categoryOrSpeciality || 'Unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  }
  const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  console.log('\n--- CATEGORY BREAKDOWN ---');
  for (const [cat, count] of sortedCats) {
    const pct = ((count / professionals.length) * 100).toFixed(1);
    console.log(`  ${String(count).padStart(4)} (${pct.padStart(5)}%)  ${cat}`);
  }

  // --- Facility Ranking (where most Ethiopians work) ---
  const facilities = {};
  const withFacility = professionals.filter(p => p.facilityName);
  for (const p of withFacility) {
    if (!facilities[p.facilityName]) {
      facilities[p.facilityName] = { count: 0, categories: {} };
    }
    facilities[p.facilityName].count++;
    const cat = p.categoryOrSpeciality || 'Unknown';
    facilities[p.facilityName].categories[cat] = (facilities[p.facilityName].categories[cat] || 0) + 1;
  }
  const sortedFacilities = Object.entries(facilities).sort((a, b) => b[1].count - a[1].count);

  console.log(`\n--- TOP FACILITIES (${withFacility.length} professionals with active placement) ---`);
  console.log(`--- ${professionals.length - withFacility.length} professionals have no current facility listed ---\n`);

  for (const [name, data] of sortedFacilities.slice(0, 30)) {
    const cats = Object.entries(data.categories).map(([c, n]) => `${n}x ${c.split('-').pop()}`).join(', ');
    console.log(`  ${String(data.count).padStart(3)}  ${name}`);
    console.log(`       └─ ${cats}`);
  }

  // --- Facility type analysis ---
  const facilityTypes = {
    'Home Healthcare': 0,
    'Hospital': 0,
    'Clinic/Medical Center': 0,
    'Pharmacy': 0,
    'Other': 0,
  };
  for (const [name, data] of sortedFacilities) {
    const lower = name.toLowerCase();
    if (lower.includes('home health') || lower.includes('home care')) {
      facilityTypes['Home Healthcare'] += data.count;
    } else if (lower.includes('hospital')) {
      facilityTypes['Hospital'] += data.count;
    } else if (lower.includes('clinic') || lower.includes('medical cent') || lower.includes('polyclinic') || lower.includes('poly clinic')) {
      facilityTypes['Clinic/Medical Center'] += data.count;
    } else if (lower.includes('pharmacy') || lower.includes('pharma')) {
      facilityTypes['Pharmacy'] += data.count;
    } else {
      facilityTypes['Other'] += data.count;
    }
  }

  console.log('\n--- FACILITY TYPE DISTRIBUTION ---');
  for (const [type, count] of Object.entries(facilityTypes).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / withFacility.length) * 100).toFixed(1);
    console.log(`  ${String(count).padStart(4)} (${pct.padStart(5)}%)  ${type}`);
  }

  // --- Contact availability stats ---
  let withPhone = 0, withEmail = 0, withWorkEmail = 0, withPersonalEmail = 0;
  let withEducation = 0, withExperience = 0;
  const universities = {};

  for (const d of Object.values(details)) {
    const c = d.contactDetails || {};
    if (c.mobileNumber || c.officeNumber || d.phone) withPhone++;
    if (c.personalEmail || c.workEmail || d.email) withEmail++;
    if (c.workEmail) withWorkEmail++;
    if (c.personalEmail) withPersonalEmail++;
    if (d.education?.length > 0) withEducation++;
    if (d.experience?.length > 0) withExperience++;

    // Track universities
    for (const edu of (d.education || [])) {
      if (edu.university) {
        universities[edu.university] = (universities[edu.university] || 0) + 1;
      }
    }
  }

  console.log('\n--- CONTACT & DATA AVAILABILITY ---');
  console.log(`  With phone number:    ${withPhone} / ${detailCount}`);
  console.log(`  With any email:       ${withEmail} / ${detailCount}`);
  console.log(`    - Work email:       ${withWorkEmail}`);
  console.log(`    - Personal email:   ${withPersonalEmail}`);
  console.log(`  With education data:  ${withEducation} / ${detailCount}`);
  console.log(`  With work experience: ${withExperience} / ${detailCount}`);

  // --- Top Universities ---
  const sortedUnis = Object.entries(universities).sort((a, b) => b[1] - a[1]);
  console.log('\n--- TOP UNIVERSITIES ---');
  for (const [uni, count] of sortedUnis.slice(0, 15)) {
    console.log(`  ${String(count).padStart(4)}  ${uni}`);
  }

  // ==========================================================
  // CSV EXPORTS
  // ==========================================================

  // --- CSV 1: Full professionals with detail data ---
  const fullCsvRows = professionals.map(p => {
    const d = details[p.dhaUniqueId] || {};
    const c = d.contactDetails || {};
    const presentExp = (d.experience || []).find(e => e.isPresent);
    const allExp = (d.experience || []).map(e =>
      `${e.facility || ''} (${e.status || ''}) ${e.startDate || ''} - ${e.endDateAndDuration || ''}`
    ).join(' | ');
    const eduStr = (d.education || []).map(e =>
      `${e.university || ''} ${e.degree || ''} ${e.graduationYear ? '(' + e.graduationYear + ')' : ''} ${e.location || ''}`
    ).join(' | ');
    const langStr = (d.languages || []).map(l => `${l.language} (${l.proficiency})`).join(', ');

    return [
      p.name,
      p.categoryOrSpeciality,
      p.facilityName || '',
      c.mobileNumber || d.phone || '',
      c.officeNumber || '',
      c.personalEmail || d.email || '',
      c.workEmail || '',
      langStr,
      presentExp?.facility || '',
      presentExp?.role || '',
      presentExp?.startDate || '',
      (d.experience || []).length,
      allExp,
      eduStr,
      p.dhaUniqueId,
      `https://services.dha.gov.ae/sheryan/wps/portal/home/medical-directory/professional-details?dhaUniqueId=${p.dhaUniqueId}`,
    ];
  });
  const fullCsv = toCsv(
    [
      'Name', 'Category/Speciality', 'Current Facility (from listing)',
      'Mobile Number', 'Office Number', 'Personal Email', 'Work Email',
      'Languages',
      'Present Workplace', 'Present Role', 'Present Start Date',
      'Total Experience Count', 'Full Work History',
      'Education',
      'DHA Unique ID', 'Profile URL',
    ],
    fullCsvRows,
  );
  writeFileSync(join(OUTPUT_DIR, 'professionals_full.csv'), fullCsv);

  // --- CSV 2: Contact-only (for quick outreach) ---
  const contactRows = professionals
    .map(p => {
      const d = details[p.dhaUniqueId] || {};
      const c = d.contactDetails || {};
      return {
        name: p.name,
        category: p.categoryOrSpeciality,
        facility: p.facilityName || '',
        mobile: c.mobileNumber || d.phone || '',
        personalEmail: c.personalEmail || d.email || '',
        workEmail: c.workEmail || '',
        id: p.dhaUniqueId,
      };
    })
    .filter(r => r.mobile || r.personalEmail || r.workEmail);

  const contactCsv = toCsv(
    ['Name', 'Category', 'Facility', 'Mobile', 'Personal Email', 'Work Email', 'DHA ID'],
    contactRows.map(r => [r.name, r.category, r.facility, r.mobile, r.personalEmail, r.workEmail, r.id]),
  );
  writeFileSync(join(OUTPUT_DIR, 'contacts.csv'), contactCsv);

  // --- CSV 3: Facility rankings ---
  const facCsvRows = sortedFacilities.map(([name, data]) => {
    const cats = Object.entries(data.categories).map(([c, n]) => `${n}x ${c}`).join('; ');
    // Find professionals at this facility with contact info
    const staffWithContact = professionals
      .filter(p => p.facilityName === name)
      .filter(p => {
        const d = details[p.dhaUniqueId];
        if (!d) return false;
        const c = d.contactDetails || {};
        return c.mobileNumber || c.personalEmail || c.workEmail || d.phone || d.email;
      }).length;
    return [name, data.count, staffWithContact, cats];
  });
  const facCsv = toCsv(['Facility', 'Ethiopian Staff Count', 'With Contact Info', 'Categories'], facCsvRows);
  writeFileSync(join(OUTPUT_DIR, 'facility_rankings.csv'), facCsv);

  // --- CSV 4: Category breakdown ---
  const catCsvRows = sortedCats.map(([cat, count]) => [cat, count, ((count / professionals.length) * 100).toFixed(1) + '%']);
  const catCsv = toCsv(['Category/Speciality', 'Count', 'Percentage'], catCsvRows);
  writeFileSync(join(OUTPUT_DIR, 'category_breakdown.csv'), catCsv);

  // --- CSV 5: Education/University breakdown ---
  const uniCsvRows = sortedUnis.map(([uni, count]) => [uni, count]);
  const uniCsv = toCsv(['University', 'Graduates'], uniCsvRows);
  writeFileSync(join(OUTPUT_DIR, 'universities.csv'), uniCsv);

  // --- CSV 6: Work experience timeline (all positions) ---
  const expRows = [];
  for (const p of professionals) {
    const d = details[p.dhaUniqueId];
    if (!d?.experience) continue;
    for (const exp of d.experience) {
      expRows.push([
        p.name,
        p.categoryOrSpeciality,
        exp.facility || '',
        exp.role || '',
        exp.status || '',
        exp.isPresent ? 'YES' : '',
        exp.startDate || '',
        exp.endDateAndDuration || '',
        exp.license || '',
        p.dhaUniqueId,
      ]);
    }
  }
  const expCsv = toCsv(
    ['Name', 'Category', 'Facility', 'Role', 'License Status', 'Is Present', 'Start Date', 'End Date/Duration', 'License Number', 'DHA ID'],
    expRows,
  );
  writeFileSync(join(OUTPUT_DIR, 'work_experience.csv'), expCsv);

  console.log('\n--- OUTPUT FILES ---');
  console.log(`  output/professionals_full.csv  - All ${professionals.length} professionals with FULL details`);
  console.log(`  output/contacts.csv            - ${contactRows.length} professionals with contact info (for outreach)`);
  console.log(`  output/facility_rankings.csv   - Facilities ranked by Ethiopian staff count`);
  console.log(`  output/category_breakdown.csv  - Category/speciality breakdown`);
  console.log(`  output/universities.csv        - University/education breakdown`);
  console.log(`  output/work_experience.csv     - ${expRows.length} work experience entries (full history)`);

  // --- Key Insights ---
  console.log('\n' + '='.repeat(70));
  console.log('  KEY INSIGHTS');
  console.log('='.repeat(70));
  console.log(`
  TOTAL: ${professionals.length} Ethiopian professionals in DHA registry
  CONTACTABLE: ${contactRows.length} have phone or email on file
  WITH WORK HISTORY: ${withExperience} have detailed experience records
  WITH EDUCATION: ${withEducation} have education records

  TOP FACILITIES:
    ${sortedFacilities.slice(0, 5).map(([n, d]) => `${d.count}x ${n}`).join('\n    ')}

  TOP CATEGORIES:
    ${sortedCats.slice(0, 3).map(([c, n]) => `${n}x ${c}`).join('\n    ')}

  TOP UNIVERSITIES:
    ${sortedUnis.slice(0, 5).map(([u, n]) => `${n}x ${u}`).join('\n    ')}
`);
}

main();
