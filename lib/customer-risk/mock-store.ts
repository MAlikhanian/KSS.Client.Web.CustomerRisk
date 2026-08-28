/**
 * Browser-localStorage backed mock data store for the Customer Risk Record
 * System (CRS). Same shape conventions as cash-advance: every read/write
 * function will swap 1:1 for fetch() calls once a backend lands.
 */

import type {
  CrsAuditLogEntry,
  CrsBrokerage,
  CrsBrokerageUser,
  CrsIpWhitelistEntry,
  CrsOtherRisk,
  CrsRelatedPerson,
  CrsRiskCaseFile,
  CrsSearchFilter,
  AuditAction,
  BrokerageUserRole,
  RelationType,
} from './types';
import { isoYearMonth, makeCaseNumber } from './format';

// ─── Storage keys ───────────────────────────────────────────────────────────

const KEY_BROKERAGES = 'customer-risk:brokerages';
const KEY_USERS = 'customer-risk:users';
const KEY_IPS = 'customer-risk:ip-whitelist';
const KEY_CASES = 'customer-risk:cases';
const KEY_RELATED = 'customer-risk:related-persons';
const KEY_OTHER_RISKS = 'customer-risk:other-risks';
const KEY_AUDIT = 'customer-risk:audit-log';
const KEY_CASE_COUNTERS = 'customer-risk:case-counters';
const KEY_ACTING_BROKERAGE = 'customer-risk:acting-brokerage';
const KEY_SEED_VERSION = 'customer-risk:seed-version';

/** Bump to force already-seeded browsers to refresh the sample case data. */
const SEED_VERSION = 2;

// ─── Seeds ──────────────────────────────────────────────────────────────────

const NOW = () => new Date().toISOString();

const SEED_BROKERAGES: CrsBrokerage[] = [
  {
    id: 'crs-brk-alpha',
    code: 'ALPHA',
    nameFa: 'کارگزاری آلفا',
    nameEn: 'Alpha Brokerage',
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: 'crs-brk-beta',
    code: 'BETA',
    nameFa: 'کارگزاری بتا',
    nameEn: 'Beta Brokerage',
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: 'crs-brk-gamma',
    code: 'GAMMA',
    nameFa: 'کارگزاری گاما',
    nameEn: 'Gamma Brokerage',
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
];

const SEED_USERS: CrsBrokerageUser[] = [
  {
    id: 'crs-u-alpha-admin',
    brokerageId: 'crs-brk-alpha',
    username: 'alpha.admin',
    displayName: 'مدیر آلفا',
    role: 'Admin',
    isActive: true,
    lastLoginAt: NOW(),
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: 'crs-u-alpha-op',
    brokerageId: 'crs-brk-alpha',
    username: 'alpha.op',
    displayName: 'کارشناس ثبت آلفا',
    role: 'Operator',
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: 'crs-u-alpha-view',
    brokerageId: 'crs-brk-alpha',
    username: 'alpha.view',
    displayName: 'بازرس آلفا',
    role: 'Viewer',
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: 'crs-u-beta-admin',
    brokerageId: 'crs-brk-beta',
    username: 'beta.admin',
    displayName: 'مدیر بتا',
    role: 'Admin',
    isActive: true,
    lastLoginAt: NOW(),
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: 'crs-u-beta-op',
    brokerageId: 'crs-brk-beta',
    username: 'beta.op',
    displayName: 'کارشناس ثبت بتا',
    role: 'Operator',
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: 'crs-u-gamma-admin',
    brokerageId: 'crs-brk-gamma',
    username: 'gamma.admin',
    displayName: 'مدیر گاما',
    role: 'Admin',
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
];

const SEED_IPS: CrsIpWhitelistEntry[] = [
  {
    id: 'crs-ip-alpha-1',
    brokerageId: 'crs-brk-alpha',
    ipAddress: '10.20.30.40',
    label: 'دفتر مرکزی آلفا',
    addedByUserName: 'مدیر آلفا',
    addedAt: NOW(),
  },
  {
    id: 'crs-ip-alpha-2',
    brokerageId: 'crs-brk-alpha',
    ipAddress: '10.20.30.41',
    label: 'دفتر پشتیبان آلفا',
    addedByUserName: 'مدیر آلفا',
    addedAt: NOW(),
  },
  {
    id: 'crs-ip-beta-1',
    brokerageId: 'crs-brk-beta',
    ipAddress: '10.21.30.42',
    label: 'دفتر مرکزی بتا',
    addedByUserName: 'مدیر بتا',
    addedAt: NOW(),
  },
  {
    id: 'crs-ip-gamma-1',
    brokerageId: 'crs-brk-gamma',
    ipAddress: '10.22.30.50',
    label: 'دفتر مرکزی گاما',
    addedByUserName: 'مدیر گاما',
    addedAt: NOW(),
  },
];

// 4 sample cases — 2 by Alpha, 1 by Beta, 1 by Gamma.
// ─── Generated sample case data (20 cases per brokerage) ─────────────────────

const SAMPLE_FIRST = ['علی', 'مریم', 'حسن', 'زهرا', 'محمد', 'فاطمه', 'رضا', 'سارا', 'امیر', 'نرگس', 'مهدی', 'الهام', 'کیان', 'شیما', 'بهرام', 'لیلا', 'سینا', 'مونا', 'کاوه', 'رویا'];
const SAMPLE_LAST = ['محمدی', 'رضایی', 'حسینی', 'کریمی', 'احمدی', 'موسوی', 'جعفری', 'نوری', 'صادقی', 'رحیمی', 'کاظمی', 'عباسی', 'یوسفی', 'قاسمی', 'اکبری', 'مرادی', 'شریفی', 'بابایی', 'نجفی', 'زارع'];
const SAMPLE_LEGAL = ['شرکت آرمان تجارت', 'گروه پویش سرمایه', 'هلدینگ کیان', 'شرکت فناوران داده', 'گروه صنعتی پارس', 'بازرگانی نوین', 'سرمایهٔ ایرانیان', 'شرکت مهرآفرین', 'گروه اقتصادی البرز', 'پتروشیمی جم'];
const SAMPLE_FATHERS = ['حسن', 'احمد', 'علی', 'رضا', 'محمد', 'کریم', 'اصغر', 'عباس'];
const SAMPLE_RELATIONS: RelationType[] = ['Spouse', 'Child', 'Parent', 'Sibling', 'BusinessPartner', 'LegalRepresentative', 'Other'];
const SAMPLE_CREDIT_DESC = ['مانده بدهی معوق در سامانهٔ کارگزاری دیگر.', 'سابقهٔ مرجوعی چک طی ۶ ماه گذشته.', 'تأخیر مکرر در تسویهٔ حساب.', 'اعتبار مصرف‌شده بیش از سقف مجاز.'];
const SAMPLE_DOC_DESC = ['صورت‌های مالی نهایی ارائه نشده است.', 'مدارک هویتی ناقص است.', 'اعتبار امضای مجاز منقضی شده است.', 'آدرس ثبت‌شدهٔ تأییدنشده.'];
const SAMPLE_OTHER = [
  { riskType: 'ریسک حقوقی', description: 'پروندهٔ قضایی باز نسبت به طرف قرارداد.', amount: 100_000_000 },
  { riskType: 'ریسک عملیاتی', description: 'وابستگی بالا به یک مشتری کلیدی.', amount: 60_000_000 },
  { riskType: 'ریسک شهرت', description: 'اخبار منفی رسانه‌ای اخیر.', amount: 0 },
];

function padNum(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

function buildSeedData(): {
  cases: CrsRiskCaseFile[];
  related: CrsRelatedPerson[];
  otherRisks: CrsOtherRisk[];
} {
  const ym = isoYearMonth();
  const cases: CrsRiskCaseFile[] = [];
  const related: CrsRelatedPerson[] = [];
  const otherRisks: CrsOtherRisk[] = [];
  const baseMs = Date.UTC(2026, 5, 27); // newest case anchor; older ones step back a day

  SEED_BROKERAGES.forEach((brk, bIdx) => {
    const actor = `مدیر ${brk.nameFa.replace('کارگزاری ', '')}`;
    for (let i = 0; i < 20; i++) {
      const seq = i + 1;
      const isLegal = i % 3 === 2;
      const archived = i >= 14; // 14 active + 6 archived per brokerage
      const createdAt = new Date(baseMs - (bIdx * 20 + i) * 86_400_000).toISOString();
      const caseId = `crs-case-${brk.code}-${seq}`;

      const hasCredit = i % 2 === 0;
      const hasDocs = i % 2 === 1 || i % 3 === 0; // every case has at least one risk
      const otherList = i % 4 === 0 ? [SAMPLE_OTHER[i % SAMPLE_OTHER.length]] : [];

      const custFirst = SAMPLE_FIRST[i % SAMPLE_FIRST.length];
      const custLast = SAMPLE_LAST[(i + bIdx) % SAMPLE_LAST.length];

      cases.push({
        id: caseId,
        caseNumber: makeCaseNumber(ym, brk.code, seq),
        brokerageId: brk.id,
        customerType: isLegal ? 'Legal' : 'Individual',
        customerFirstName: isLegal ? undefined : custFirst,
        customerLastName: isLegal ? undefined : custLast,
        customerName: isLegal
          ? SAMPLE_LEGAL[i % SAMPLE_LEGAL.length]
          : `${custFirst} ${custLast}`,
        customerNationalId: isLegal
          ? padNum(10_000_000_000 + bIdx * 1000 + i, 11)
          : padNum(2_000_000_000 + bIdx * 1000 + i, 10),
        stockCode: isLegal ? undefined : `${brk.code.charAt(0)}${padNum(10_000 + bIdx * 100 + i, 6)}`,
        dateOfBirth: isLegal
          ? undefined
          : new Date(Date.UTC(1970 + (i % 30), i % 12, (i % 27) + 1)).toISOString(),
        fatherName: isLegal ? undefined : SAMPLE_FATHERS[i % SAMPLE_FATHERS.length],
        creditRisk: hasCredit
          ? { hasRisk: true, description: SAMPLE_CREDIT_DESC[i % SAMPLE_CREDIT_DESC.length], amount: (i + 1) * 25_000_000 }
          : { hasRisk: false },
        documentsRisk: hasDocs
          ? { hasRisk: true, description: SAMPLE_DOC_DESC[i % SAMPLE_DOC_DESC.length], amount: 0 }
          : { hasRisk: false },
        hasAnyOtherRisks: otherList.length > 0,
        additionalNotes: i % 5 === 0 ? 'یادداشت نمونه برای این پرونده.' : undefined,
        isArchived: archived,
        archivedAt: archived ? createdAt : undefined,
        archivedByUserName: archived ? actor : undefined,
        createdAt,
        createdByUserName: actor,
        updatedAt: createdAt,
      });

      const relCount = (i % 3) + 1; // 1–3 related persons per case
      for (let j = 0; j < relCount; j++) {
        const relFirst = SAMPLE_FIRST[(i + j + 3) % SAMPLE_FIRST.length];
        const relLast = SAMPLE_LAST[(i + j) % SAMPLE_LAST.length];
        related.push({
          id: `crs-rel-${brk.code}-${seq}-${j + 1}`,
          caseId,
          firstName: relFirst,
          lastName: relLast,
          name: `${relFirst} ${relLast}`,
          nationalId: padNum(3_000_000_000 + bIdx * 10_000 + i * 10 + j, 10),
          fatherName: SAMPLE_FATHERS[(i + j) % SAMPLE_FATHERS.length],
          dateOfBirth: new Date(Date.UTC(1960 + ((i + j) % 40), (i + j) % 12, ((i + j) % 27) + 1)).toISOString(),
          relationType: SAMPLE_RELATIONS[(i + j) % SAMPLE_RELATIONS.length],
        });
      }

      otherList.forEach((o, k) => {
        otherRisks.push({ id: `crs-or-${brk.code}-${seq}-${k + 1}`, caseId, ...o });
      });
    }
  });

  return { cases, related, otherRisks };
}

const _seedData = buildSeedData();
const SEED_CASES: CrsRiskCaseFile[] = _seedData.cases;
const SEED_RELATED: CrsRelatedPerson[] = _seedData.related;
const SEED_OTHER_RISKS: CrsOtherRisk[] = _seedData.otherRisks;

const SEED_AUDIT: CrsAuditLogEntry[] = [
  {
    id: 'crs-audit-1',
    brokerageId: 'crs-brk-alpha',
    userName: 'مدیر آلفا',
    action: 'Login',
    ipAddress: '10.20.30.40',
    timestamp: NOW(),
  },
  {
    id: 'crs-audit-2',
    brokerageId: 'crs-brk-alpha',
    userName: 'مدیر آلفا',
    action: 'CreateCase',
    resourceId: 'crs-case-a-1',
    resourceLabel: '2026-06-ALPHA-1',
    ipAddress: '10.20.30.40',
    timestamp: NOW(),
  },
  {
    id: 'crs-audit-3',
    brokerageId: 'crs-brk-beta',
    userName: 'مدیر بتا',
    action: 'Search',
    details: 'customerName: علی',
    ipAddress: '10.21.30.42',
    timestamp: NOW(),
  },
];

// ─── Browser-safe storage helpers ───────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

/** One-time seed: populate stores when empty. Idempotent. */
function ensureSeed(): void {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(KEY_BROKERAGES)) write(KEY_BROKERAGES, SEED_BROKERAGES);
  if (!window.localStorage.getItem(KEY_USERS)) write(KEY_USERS, SEED_USERS);
  if (!window.localStorage.getItem(KEY_IPS)) write(KEY_IPS, SEED_IPS);
  if (!window.localStorage.getItem(KEY_AUDIT)) write(KEY_AUDIT, SEED_AUDIT);

  // Sample case data is version-gated: bumping SEED_VERSION wipes the old
  // sample cases/related/risks and reinstalls the current generated set.
  const seeded = Number(window.localStorage.getItem(KEY_SEED_VERSION) ?? '0');
  if (seeded < SEED_VERSION) {
    write(KEY_CASES, SEED_CASES);
    write(KEY_RELATED, SEED_RELATED);
    write(KEY_OTHER_RISKS, SEED_OTHER_RISKS);
    const ym = isoYearMonth();
    const counters: Record<string, number> = {};
    for (const brk of SEED_BROKERAGES) counters[`${ym}__${brk.id}`] = 20;
    write(KEY_CASE_COUNTERS, counters);
    window.localStorage.setItem(KEY_SEED_VERSION, String(SEED_VERSION));
  }
}

function uuid(): string {
  if (isBrowser() && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Acting brokerage (demo persona) ───────────────────────────────────────

export function getActingBrokerageId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(KEY_ACTING_BROKERAGE);
}

export function setActingBrokerageId(brokerageId: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_ACTING_BROKERAGE, brokerageId);
  // Custom event so React listeners on this tab pick up the change.
  window.dispatchEvent(new CustomEvent('customer-risk:acting-changed', { detail: brokerageId }));
}

// ─── Brokerages ─────────────────────────────────────────────────────────────

export function listBrokerages(): CrsBrokerage[] {
  ensureSeed();
  return read<CrsBrokerage[]>(KEY_BROKERAGES, []);
}

export function getBrokerage(id: string): CrsBrokerage | null {
  return listBrokerages().find((b) => b.id === id) ?? null;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function listUsers(brokerageId?: string): CrsBrokerageUser[] {
  ensureSeed();
  const all = read<CrsBrokerageUser[]>(KEY_USERS, []);
  return brokerageId ? all.filter((u) => u.brokerageId === brokerageId) : all;
}

export function getUser(id: string): CrsBrokerageUser | null {
  return listUsers().find((u) => u.id === id) ?? null;
}

export function upsertUser(
  user: Omit<CrsBrokerageUser, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): CrsBrokerageUser {
  const all = listUsers();
  const now = NOW();
  if (user.id) {
    const idx = all.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      const merged: CrsBrokerageUser = { ...all[idx], ...user, updatedAt: now };
      all[idx] = merged;
      write(KEY_USERS, all);
      return merged;
    }
  }
  const created: CrsBrokerageUser = {
    ...user,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(created);
  write(KEY_USERS, all);
  return created;
}

export function deleteUser(id: string): void {
  const all = listUsers().filter((u) => u.id !== id);
  write(KEY_USERS, all);
}

export function lockUser(id: string, until?: string): void {
  const all = listUsers();
  const idx = all.findIndex((u) => u.id === id);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    lockedUntil: until ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: false,
    updatedAt: NOW(),
  };
  write(KEY_USERS, all);
}

export function unlockUser(id: string): void {
  const all = listUsers();
  const idx = all.findIndex((u) => u.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], lockedUntil: undefined, isActive: true, updatedAt: NOW() };
  write(KEY_USERS, all);
}

// ─── IP whitelist ───────────────────────────────────────────────────────────

export function listIps(brokerageId?: string): CrsIpWhitelistEntry[] {
  ensureSeed();
  const all = read<CrsIpWhitelistEntry[]>(KEY_IPS, []);
  return brokerageId ? all.filter((ip) => ip.brokerageId === brokerageId) : all;
}

export function upsertIp(
  ip: Omit<CrsIpWhitelistEntry, 'id' | 'addedAt'> & { id?: string },
): CrsIpWhitelistEntry {
  const all = listIps();
  const now = NOW();
  if (ip.id) {
    const idx = all.findIndex((x) => x.id === ip.id);
    if (idx >= 0) {
      const merged: CrsIpWhitelistEntry = { ...all[idx], ...ip };
      all[idx] = merged;
      write(KEY_IPS, all);
      return merged;
    }
  }
  const created: CrsIpWhitelistEntry = { ...ip, id: uuid(), addedAt: now };
  all.push(created);
  write(KEY_IPS, all);
  return created;
}

export function deleteIp(id: string): void {
  const all = listIps().filter((x) => x.id !== id);
  write(KEY_IPS, all);
}

// ─── Case files ─────────────────────────────────────────────────────────────

export function listCases(): CrsRiskCaseFile[] {
  ensureSeed();
  return read<CrsRiskCaseFile[]>(KEY_CASES, []);
}

export function listCasesByBrokerage(brokerageId: string): CrsRiskCaseFile[] {
  return listCases().filter((c) => c.brokerageId === brokerageId);
}

export function getCase(id: string): CrsRiskCaseFile | null {
  return listCases().find((c) => c.id === id) ?? null;
}

/** Allocate the next per-brokerage, per-month case counter. */
export function nextCaseCounter(brokerageId: string, ym: string = isoYearMonth()): number {
  if (!isBrowser()) return 1;
  const data = read<Record<string, number>>(KEY_CASE_COUNTERS, {});
  const key = `${ym}__${brokerageId}`;
  const next = (data[key] ?? 0) + 1;
  data[key] = next;
  write(KEY_CASE_COUNTERS, data);
  return next;
}

export function createCase(args: {
  brokerageId: string;
  customerType: CrsRiskCaseFile['customerType'];
  /** Individual customers only — Legal entities carry a company name instead. */
  customerFirstName?: string;
  customerLastName?: string;
  /** Composed display value; the search predicate and every read site use it. */
  customerName: string;
  customerNationalId: string;
  /** Resolved KSS.Service.Person row, when one could be linked or created. */
  customerPersonId?: string;
  stockCode?: string;
  dateOfBirth?: string;
  fatherName?: string;
  creditRisk: CrsRiskCaseFile['creditRisk'];
  documentsRisk: CrsRiskCaseFile['documentsRisk'];
  hasAnyOtherRisks: boolean;
  additionalNotes?: string;
  createdByUserName: string;
}): CrsRiskCaseFile {
  const brokerage = getBrokerage(args.brokerageId);
  const code = brokerage?.code ?? 'XXXX';
  const ym = isoYearMonth();
  const counter = nextCaseCounter(args.brokerageId, ym);
  const all = listCases();
  const now = NOW();
  const created: CrsRiskCaseFile = {
    id: uuid(),
    caseNumber: makeCaseNumber(ym, code, counter),
    brokerageId: args.brokerageId,
    customerType: args.customerType,
    customerFirstName: args.customerFirstName,
    customerLastName: args.customerLastName,
    customerName: args.customerName,
    customerNationalId: args.customerNationalId,
    customerPersonId: args.customerPersonId,
    stockCode: args.stockCode,
    dateOfBirth: args.dateOfBirth,
    fatherName: args.fatherName,
    creditRisk: args.creditRisk,
    documentsRisk: args.documentsRisk,
    hasAnyOtherRisks: args.hasAnyOtherRisks,
    additionalNotes: args.additionalNotes,
    isArchived: false,
    createdAt: now,
    createdByUserName: args.createdByUserName,
    updatedAt: now,
  };
  all.push(created);
  write(KEY_CASES, all);
  return created;
}

export function updateCase(
  id: string,
  patch: Partial<CrsRiskCaseFile> & { updatedByUserName?: string },
): CrsRiskCaseFile | null {
  const all = listCases();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const merged: CrsRiskCaseFile = {
    ...all[idx],
    ...patch,
    id: all[idx].id,
    caseNumber: all[idx].caseNumber,
    brokerageId: all[idx].brokerageId,
    createdAt: all[idx].createdAt,
    createdByUserName: all[idx].createdByUserName,
    updatedAt: NOW(),
  };
  all[idx] = merged;
  write(KEY_CASES, all);
  return merged;
}

export function archiveCase(id: string, byUserName: string): CrsRiskCaseFile | null {
  return updateCase(id, {
    isArchived: true,
    archivedAt: NOW(),
    archivedByUserName: byUserName,
    updatedByUserName: byUserName,
  });
}

export function unarchiveCase(id: string, byUserName: string): CrsRiskCaseFile | null {
  return updateCase(id, {
    isArchived: false,
    archivedAt: undefined,
    archivedByUserName: undefined,
    updatedByUserName: byUserName,
  });
}

// ─── Related persons ───────────────────────────────────────────────────────

export function listRelatedPersons(caseId: string): CrsRelatedPerson[] {
  const all = read<CrsRelatedPerson[]>(KEY_RELATED, []);
  return all.filter((r) => r.caseId === caseId);
}

export function saveRelatedPersons(caseId: string, persons: CrsRelatedPerson[]): void {
  const all = read<CrsRelatedPerson[]>(KEY_RELATED, []);
  const others = all.filter((r) => r.caseId !== caseId);
  // Re-stamp IDs for new rows.
  const next = persons.map((p) => (p.id ? p : { ...p, id: uuid() }));
  write(KEY_RELATED, [...others, ...next]);
}

export function newRelatedPersonId(): string {
  return uuid();
}

// ─── Other risks ────────────────────────────────────────────────────────────

export function listOtherRisks(caseId: string): CrsOtherRisk[] {
  const all = read<CrsOtherRisk[]>(KEY_OTHER_RISKS, []);
  return all.filter((r) => r.caseId === caseId);
}

export function saveOtherRisks(caseId: string, risks: CrsOtherRisk[]): void {
  const all = read<CrsOtherRisk[]>(KEY_OTHER_RISKS, []);
  const others = all.filter((r) => r.caseId !== caseId);
  const next = risks.map((r) => (r.id ? r : { ...r, id: uuid() }));
  write(KEY_OTHER_RISKS, [...others, ...next]);
}

export function newOtherRiskId(): string {
  return uuid();
}

// ─── Search (cross-brokerage) ──────────────────────────────────────────────

function matchesText(needle: string | undefined, haystack: string | undefined): boolean {
  if (!needle) return true;
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Normalize a string for search: Persian/Arabic digits → ASCII, lowercased. */
function normalizeSearch(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .toLowerCase();
}

/**
 * Single free-text match for a case: matches the case number, customer name,
 * national ID or stock code — and the same applicable fields (name / national
 * ID) of any related person. Empty query matches everything.
 */
export function caseMatchesQuery(c: CrsRiskCaseFile, query: string): boolean {
  const q = normalizeSearch(query).trim();
  if (!q) return true;
  if (normalizeSearch(c.caseNumber).includes(q)) return true;
  if (normalizeSearch(c.customerName).includes(q)) return true;
  if (normalizeSearch(c.customerNationalId).includes(q)) return true;
  if (normalizeSearch(c.stockCode).includes(q)) return true;
  return listRelatedPersons(c.id).some(
    (r) => normalizeSearch(r.name).includes(q) || normalizeSearch(r.nationalId).includes(q),
  );
}

/**
 * Global free-text search used by the Search page: spans ALL brokerages but
 * excludes archived cases (those live only on each brokerage's Archive page).
 */
export function searchCasesByText(query: string): CrsRiskCaseFile[] {
  if (!normalizeSearch(query).trim()) return [];
  return listCases().filter((c) => !c.isArchived && caseMatchesQuery(c, query));
}

export function searchCases(filter: CrsSearchFilter): CrsRiskCaseFile[] {
  const cases = listCases();
  const relatedByCase = new Map<string, CrsRelatedPerson[]>();

  if (filter.relatedPersonName || filter.relatedPersonNationalId) {
    const allRelated = read<CrsRelatedPerson[]>(KEY_RELATED, []);
    for (const r of allRelated) {
      const list = relatedByCase.get(r.caseId) ?? [];
      list.push(r);
      relatedByCase.set(r.caseId, list);
    }
  }

  return cases.filter((c) => {
    if (!matchesText(filter.customerName, c.customerName)) return false;
    if (!matchesText(filter.customerNationalId, c.customerNationalId)) return false;
    if (filter.stockCode && !matchesText(filter.stockCode, c.stockCode)) return false;
    if (filter.dateFrom && c.createdAt < filter.dateFrom) return false;
    if (filter.dateTo && c.createdAt > filter.dateTo) return false;

    if (filter.relatedPersonName || filter.relatedPersonNationalId) {
      const rel = relatedByCase.get(c.id) ?? [];
      const anyMatch = rel.some(
        (r) =>
          matchesText(filter.relatedPersonName, r.name) &&
          matchesText(filter.relatedPersonNationalId, r.nationalId) &&
          // At least one of the two needs to be a real match (avoid "no filter
          // = always matches" when both filter values are present but empty).
          ((filter.relatedPersonName && (r.name ?? '').length > 0) ||
            (filter.relatedPersonNationalId && (r.nationalId ?? '').length > 0)),
      );
      if (!anyMatch) return false;
    }

    return true;
  });
}

// ─── Audit log ──────────────────────────────────────────────────────────────

export interface AuditFilter {
  brokerageId?: string;
  action?: AuditAction;
  userName?: string;
  ipAddress?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function listAuditEntries(filter: AuditFilter = {}): CrsAuditLogEntry[] {
  ensureSeed();
  const all = read<CrsAuditLogEntry[]>(KEY_AUDIT, []);
  return all
    .filter((e) => {
      if (filter.brokerageId && e.brokerageId !== filter.brokerageId) return false;
      if (filter.action && e.action !== filter.action) return false;
      if (filter.userName && !matchesText(filter.userName, e.userName)) return false;
      if (filter.ipAddress && !matchesText(filter.ipAddress, e.ipAddress)) return false;
      if (filter.dateFrom && e.timestamp < filter.dateFrom) return false;
      if (filter.dateTo && e.timestamp > filter.dateTo) return false;
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function pushAuditEntry(args: {
  brokerageId: string;
  userName: string;
  action: AuditAction;
  resourceId?: string;
  resourceLabel?: string;
  ipAddress?: string;
  details?: string;
}): CrsAuditLogEntry {
  const all = read<CrsAuditLogEntry[]>(KEY_AUDIT, []);
  const entry: CrsAuditLogEntry = {
    ...args,
    id: uuid(),
    timestamp: NOW(),
  };
  all.push(entry);
  write(KEY_AUDIT, all);
  return entry;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the operator's preferred user-display-name for a given brokerage.
 * For the mock, picks the first Admin user (falling back to the first user).
 * Used by audit-log push calls when no explicit name is known.
 */
export function defaultActorName(brokerageId: string): string {
  const users = listUsers(brokerageId);
  const admin = users.find((u) => u.role === 'Admin' && u.isActive);
  return admin?.displayName ?? users[0]?.displayName ?? 'سامانه';
}

export function isLegalCustomer(c: Pick<CrsRiskCaseFile, 'customerType'>): boolean {
  return c.customerType === 'Legal';
}

/** Role label key for i18n: returns the t-key for a role enum value. */
export function roleI18nKey(role: BrokerageUserRole): string {
  return `userRole${role}`;
}
