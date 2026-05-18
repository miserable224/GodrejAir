export const TODAY_EVENTS = [
  {
    id: '1',
    title: 'Holi Celebration',
    time: '10:00 AM',
    location: 'Rooftop Garden',
    attendees: 48,
    category: 'Festival',
    color: '#F5A623',
    icon: 'sparkles',
    status: 'ongoing',
  },
  {
    id: '2',
    title: 'Society AGM Meeting',
    time: '11:30 AM',
    location: 'Community Hall',
    attendees: 120,
    category: 'Meeting',
    color: '#1A1F5E',
    icon: 'people',
    status: 'upcoming',
  },
  {
    id: '3',
    title: 'Kids Art Workshop',
    time: '03:00 PM',
    location: 'Activity Room B',
    attendees: 22,
    category: 'Workshop',
    color: '#10B981',
    icon: 'color-palette',
    status: 'upcoming',
  },
  {
    id: '4',
    title: 'Movie Night: The Jungle',
    time: '07:30 PM',
    location: 'Open Amphitheatre',
    attendees: 75,
    category: 'Entertainment',
    color: '#3B82F6',
    icon: 'film',
    status: 'upcoming',
  },
];

export const TODAY_CLASSES = [
  {
    id: '1',
    title: 'Morning Yoga Flow',
    instructor: 'Priya Sharma',
    time: '06:00 AM',
    duration: '60 min',
    slots: '4 left',
    category: 'Wellness',
    color: '#10B981',
    icon: 'fitness',
    enrolled: 16,
    capacity: 20,
    status: 'ongoing',
  },
  {
    id: '2',
    title: 'Zumba Dance Fitness',
    instructor: 'Carlos Mendes',
    time: '07:30 AM',
    duration: '45 min',
    slots: 'Full',
    category: 'Fitness',
    color: '#EF4444',
    icon: 'musical-notes',
    enrolled: 25,
    capacity: 25,
    status: 'upcoming',
  },
  {
    id: '3',
    title: 'Swimming – Beginner',
    instructor: 'Arjun Mehta',
    time: '08:00 AM',
    duration: '45 min',
    slots: '8 left',
    category: 'Swimming',
    color: '#00B4D8',
    icon: 'water',
    enrolled: 12,
    capacity: 20,
    status: 'upcoming',
  },
  {
    id: '4',
    title: 'Pilates Core Strength',
    instructor: 'Anika Rao',
    time: '09:30 AM',
    duration: '50 min',
    slots: '2 left',
    category: 'Wellness',
    color: '#8B5CF6',
    icon: 'body',
    enrolled: 18,
    capacity: 20,
    status: 'upcoming',
  },
  {
    id: '5',
    title: 'CrossFit Training',
    instructor: 'Rajiv Singh',
    time: '05:30 PM',
    duration: '60 min',
    slots: '6 left',
    category: 'Fitness',
    color: '#F5A623',
    icon: 'barbell',
    enrolled: 14,
    capacity: 20,
    status: 'upcoming',
  },
  {
    id: '6',
    title: 'Evening Meditation',
    instructor: 'Sunita Joshi',
    time: '06:30 PM',
    duration: '40 min',
    slots: '10 left',
    category: 'Wellness',
    color: '#6366F1',
    icon: 'leaf',
    enrolled: 10,
    capacity: 20,
    status: 'upcoming',
  },
];

export const UPCOMING_EVENTS = [
  {
    id: '5',
    title: 'Summer Sports Day',
    date: 'May 10, 2026',
    location: 'Sports Complex',
    category: 'Sports',
    color: '#EF4444',
    icon: 'football',
  },
  {
    id: '6',
    title: 'Mothers Day Brunch',
    date: 'May 11, 2026',
    location: 'Clubhouse',
    category: 'Social',
    color: '#EC4899',
    icon: 'heart',
  },
  {
    id: '7',
    title: 'Flatbread Pizza Night',
    date: 'May 15, 2026',
    location: 'BBQ Area, Tower 3',
    category: 'Food',
    color: '#F59E0B',
    icon: 'pizza',
  },
  {
    id: '8',
    title: 'Gardening Club',
    date: 'May 18, 2026',
    location: 'Community Garden',
    category: 'Hobby',
    color: '#10B981',
    icon: 'leaf',
  },
  {
    id: '9',
    title: 'Photography Walk',
    date: 'May 22, 2026',
    location: 'Society Grounds',
    category: 'Hobby',
    color: '#6366F1',
    icon: 'camera',
  },
];

export const QUICK_STATS = [
  { label: 'Today Events', value: '4', icon: 'calendar', color: '#1A1F5E' },
  { label: 'Active Classes', value: '6', icon: 'fitness', color: '#10B981' },
  { label: 'Open Tickets', value: '3', icon: 'construct', color: '#F5A623' },
  { label: 'Visitors Today', value: '12', icon: 'person-add', color: '#00B4D8' },
];

export const ADMIN_MENU = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'grid', color: '#1A1F5E', screen: 'AdminDashboard' },
  { key: 'Workforce', label: 'Workforce', icon: 'people', color: '#3B82F6', screen: 'Workforce' },
  { key: 'Security', label: 'Security', icon: 'shield-checkmark', color: '#EF4444', screen: 'Security' },
  { key: 'Expenses', label: 'Expenses', icon: 'wallet', color: '#10B981', screen: 'Expenses' },
  { key: 'AMC', label: 'AMC & Docs', icon: 'document-text', color: '#8B5CF6', screen: 'AMC' },
  { key: 'Amenities', label: 'Amenities', icon: 'star', color: '#F5A623', screen: 'AdminAmenities' },
  { key: 'Services', label: 'Services', icon: 'construct', color: '#06B6D4', screen: 'AdminServices' },
  { key: 'Reports', label: 'Reports', icon: 'bar-chart', color: '#6366F1', screen: 'Reports' },
  { key: 'Settings', label: 'Settings', icon: 'settings', color: '#6B7280', screen: 'Settings' },
];

export const RESIDENT_MENU = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'home', color: '#1A1F5E', screen: 'ResidentDashboard' },
  { key: 'MoveInOut', label: 'Move In/Out', icon: 'swap-horizontal', color: '#3B82F6', screen: 'MoveInOut' },
  { key: 'Amenities', label: 'Amenities', icon: 'star', color: '#F5A623', screen: 'Amenities' },
  { key: 'Services', label: 'Services', icon: 'construct', color: '#10B981', screen: 'Services' },
  { key: 'Events', label: 'Events', icon: 'calendar', color: '#8B5CF6', screen: 'Events' },
  { key: 'Communication', label: 'Communication', icon: 'chatbubbles', color: '#06B6D4', screen: 'Communication' },
  { key: 'Helpdesk', label: 'Helpdesk', icon: 'headset', color: '#EF4444', screen: 'Helpdesk' },
];

/** Format rupee amounts for display (en-IN). */
export function formatINR(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Rentals streams: `billing` = expected vs received + progress bar.
 * `amount` = actual receipts only (no target) — excluded from bottom aggregate.
 */
export const ADMIN_RENTALS_CATEGORY_PROGRESS = [
  {
    key: 'maintenance',
    label: 'Residents maintenance',
    icon: 'build-outline',
    mode: 'billing',
    expectedAmount: 485200,
    receivedAmount: 442500,
  },
  {
    key: 'commercial',
    label: 'Commercial rents',
    icon: 'storefront-outline',
    mode: 'billing',
    expectedAmount: 1240000,
    receivedAmount: 1080000,
  },
  {
    key: 'promotions',
    label: 'Promotions & campaigns',
    icon: 'megaphone-outline',
    mode: 'amount',
    amount: 112500,
  },
  {
    key: 'clubhouse',
    label: 'Clubhouse bookings',
    icon: 'calendar-outline',
    mode: 'amount',
    amount: 157200,
  },
  {
    key: 'teachers',
    label: 'Trainer Service Fee',
    icon: 'school-outline',
    mode: 'billing',
    expectedAmount: 88400,
    receivedAmount: 84000,
  },
  {
    key: 'misc',
    label: 'Miscellaneous',
    icon: 'ellipsis-horizontal-circle-outline',
    mode: 'amount',
    amount: 31200,
  },
];

function computeRentalsBillingAggregate() {
  const rows = ADMIN_RENTALS_CATEGORY_PROGRESS.filter((c) => c.mode === 'billing');
  const expectedAmount = rows.reduce((s, c) => s + c.expectedAmount, 0);
  const receivedAmount = rows.reduce((s, c) => s + c.receivedAmount, 0);
  const pendingAmount = Math.max(0, expectedAmount - receivedAmount);
  const receivedPct = expectedAmount > 0 ? (receivedAmount / expectedAmount) * 100 : 0;
  return { expectedAmount, receivedAmount, pendingAmount, receivedPct };
}

const _rentalsBilling = computeRentalsBillingAggregate();

/** Totals only maintenance + commercial + teachers (billing streams). */
export const ADMIN_RENTALS_BILLING_TOTAL_RECEIVED = formatINR(_rentalsBilling.receivedAmount);

/** Overall “expected vs received” at bottom — billing categories only. */
export const ADMIN_COLLECTIONS_VS_EXPECTED = {
  periodLabel: 'May 2026 · billing cycle',
  expected: formatINR(_rentalsBilling.expectedAmount),
  received: formatINR(_rentalsBilling.receivedAmount),
  pendingDues: formatINR(_rentalsBilling.pendingAmount),
  pendingInvoices: 34,
  receivedPct: _rentalsBilling.receivedPct,
};

/** Shown in command-center tooltip: how many accounts are still due by category. */
export const ADMIN_PENDING_DUES_BY_CATEGORY = [
  { key: 'residents', label: 'Residents', countDue: 22, detail: 'Maintenance & flat dues' },
  { key: 'vendors', label: 'Vendors', countDue: 8, detail: 'Commercial & shop rent' },
  { key: 'other', label: 'Other', countDue: 4, detail: 'Clubhouse, classes, misc.' },
];

export const ADMIN_COMMERCIAL_UNIT_AGREEMENTS = [
  {
    id: 'cu-001',
    unit: 'Shop A-12',
    tenant: 'FreshMart Foods',
    agreementId: 'AGR-COM-1021',
    startDate: '01 Apr 2025',
    endDate: '31 Mar 2028',
    rent: 145000,
    status: 'Active',
  },
  {
    id: 'cu-002',
    unit: 'Shop B-07',
    tenant: 'MedPlus Pharmacy',
    agreementId: 'AGR-COM-0897',
    startDate: '15 Jan 2024',
    endDate: '14 Jan 2027',
    rent: 98000,
    status: 'Active',
  },
  {
    id: 'cu-003',
    unit: 'Kiosk C-03',
    tenant: 'Bean Hub Cafe',
    agreementId: 'AGR-COM-1178',
    startDate: '01 Jul 2023',
    endDate: '30 Jun 2026',
    rent: 62000,
    status: 'Renewal Due',
  },
];

export const ADMIN_COMMAND_MODULES = [
  {
    key: 'WaterTracking',
    title: 'Water management',
    subtitle: 'Meters, tanks & usage',
    icon: 'water',
    color: '#3B82F6',
  },
  {
    key: 'Security',
    title: 'Security ops',
    subtitle: 'Staff, patrolling & safety',
    icon: 'shield-checkmark',
    color: '#EF4444',
  },
  {
    key: 'Workforce',
    title: 'Housekeeping',
    subtitle: 'Staff, cleaning & tasks',
    icon: 'sparkles',
    color: '#2dd4bf',
  },
  {
    key: 'Expenses',
    title: 'Expenses',
    subtitle: 'Payouts, AMC & ops cost',
    icon: 'wallet',
    color: '#10B981',
  },
];

/** Dashboard expand + detail route: society promotions. */
export const ADMIN_PROMOTIONS_SNAPSHOT = {
  activeCampaigns: 3,
  headline: 'Summer clubhouse bundle live',
  reachLabel: 'Est. reach',
  reachValue: '2.4k households',
  responses: 186,
  periodNote: 'Last 30 days',
};

/** Dashboard expand + detail route: MyGate helpdesk / gate tickets. */
export const ADMIN_MYGATE_SNAPSHOT = {
  openTickets: 12,
  resolvedWeek: 48,
  avgResponseLabel: 'Avg. response',
  avgResponseValue: '4.2 hrs',
  headline: 'Gate passes, staff & society requests',
};

export const ADMIN_MANPOWER_DEPLOYMENT = [
  // FM & HK Category
  { id: 1, category: 'FM_HK', role: 'Facility Manager', expected: 1, type: 'Skilled', shift: '9:00 AM - 6:30 PM' },
  { id: 2, category: 'FM_HK', role: 'Assistant Facility Manager', expected: 1, type: 'Skilled', shift: '10:30 AM - 8:00 PM' },
  { id: 3, category: 'FM_HK', role: 'CRM / Accountant', expected: 1, type: 'Skilled', shift: '9:00 AM - 6:30 PM' },
  { id: 4, category: 'FM_HK', role: 'Front Office Exe / Helpdesk', expected: 1, type: 'Skilled', shift: '9:00 AM - 6:30 PM' },
  { id: 5, category: 'FM_HK', role: 'Housekeeping Supervisor', expected: 1, type: 'Skilled', shift: '8:30 AM - 5:30 PM' },
  { id: 6, category: 'FM_HK', role: 'Housekeeping Staff', expected: 24, type: 'Skilled', shift: '24 Hours (Shifts)' },
  { id: 7, category: 'FM_HK', role: 'Gardener', expected: 3, type: 'Skilled', shift: '8:30 AM - 5:30 PM' },
  { id: 8, category: 'FM_HK', role: 'Electrician', expected: 4, type: 'Skilled', shift: '24 Hours (Shifts)' },
  { id: 9, category: 'FM_HK', role: 'Plumber', expected: 4, type: 'Skilled', shift: '24 Hours (Shifts)' },
  { id: 10, category: 'FM_HK', role: 'STP/WTP/Pool Operator', expected: 4, type: 'Skilled', shift: '24 Hours (Shifts)' },
  
  // Security Category
  { id: 11, category: 'Security', role: 'Security Supervisor', expected: 2, type: 'Skilled', shift: '12 Hours (Shifts)' },
  { id: 12, category: 'Security', role: 'Main Gate Guard', expected: 6, type: 'Skilled', shift: '24 Hours (Shifts)' },
  { id: 13, category: 'Security', role: 'Tower Guards', expected: 8, type: 'Skilled', shift: '24 Hours (Shifts)' },
  { id: 14, category: 'Security', role: 'Lady Guards', expected: 2, type: 'Skilled', shift: 'Day Shift' },
];

export const ADMIN_WORKFORCE_SNAPSHOT = {
  totalExpected: 44,
  onDuty: 41,
  shortfall: 3,
  penaltyRisk: 'Medium', // Based on unplanned leaves logic
};
