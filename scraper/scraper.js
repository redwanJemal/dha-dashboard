/**
 * DHA Medical Directory Scraper - Ethiopian Professionals
 * Fetches all Ethiopian healthcare professionals from Dubai Health Authority's medical registry.
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const API_URL = 'https://services.dha.gov.ae/sheryan/RestService/rest/retrieve/medicaldirectorysearchdetails?key=SHARED_KEY';

const HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Origin': 'https://services.dha.gov.ae',
  'Referer': 'https://services.dha.gov.ae/sheryan/wps/portal/home/medical-directory',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function buildPayload(pageNo, pageSize = 100) {
  return JSON.stringify({
    string: '',
    speciality: [],
    category: [],
    facilityName: [],
    pageNo: String(pageNo),
    pageSize: String(pageSize),
    area: [],
    licenseType: [],
    nationality: ['Ethiopia'],
    gender: [],
    sortBy: '',
    languages: [],
    locale: 'en',
  });
}

async function fetchPage(pageNo) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: HEADERS,
    body: buildPayload(pageNo),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on page ${pageNo}`);
  }

  return res.json();
}

async function main() {
  console.log('Fetching Ethiopian professionals from DHA Medical Directory...\n');

  // First request to get total count
  const firstPage = await fetchPage(1);
  const { totalNumberOfRecords, totalNumberofPages } = firstPage.professionalSearch.pagination;
  const totalPages = parseInt(totalNumberofPages) || 1;
  const totalRecords = parseInt(totalNumberOfRecords) || 0;

  console.log(`Total records: ${totalRecords}`);
  console.log(`Total pages: ${totalPages}`);

  const allProfessionals = [];
  const items = firstPage.professionalSearch.professionalsDTO?.professionalsDTO || [];
  allProfessionals.push(...items);
  console.log(`Page 1: ${items.length} records`);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    const data = await fetchPage(page);
    const pageItems = data.professionalSearch.professionalsDTO?.professionalsDTO || [];
    allProfessionals.push(...pageItems);
    console.log(`Page ${page}: ${pageItems.length} records`);
    // Small delay to be respectful
    await new Promise(r => setTimeout(r, 500));
  }

  // Save filters from first page
  const filters = firstPage.professionalSearch.filters;
  writeFileSync(join(DATA_DIR, 'filters.json'), JSON.stringify(filters, null, 2));

  // Save all professionals (strip base64 photos to save space)
  const cleaned = allProfessionals.map(p => ({
    name: p.name || '',
    categoryOrSpeciality: p.categoryOrSpeciality || '',
    facilityName: (p.facilityName || '').trim(),
    facilityCount: p.facilityCount || 0,
    licensecount: p.licensecount || 0,
    dhaUniqueId: p.dhaUniqueId || '',
    hasPhoto: !!p.photo,
  }));

  writeFileSync(join(DATA_DIR, 'professionals.json'), JSON.stringify(cleaned, null, 2));
  console.log(`\nSaved ${cleaned.length} professionals to data/professionals.json`);
}

main().catch(console.error);
