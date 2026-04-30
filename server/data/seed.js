import { v4 as uuidv4 } from 'uuid';

/* ──────────────────────── Seed Data Store ──────────────────────── */

const districts = ['Ranchi', 'Dhanbad', 'Jamshedpur', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Dumka'];
const wasteCategories = ['Yellow', 'Red', 'Blue', 'White'];
const hospitalTypes = ['Bedded', 'Non-Bedded'];
const treatmentTypes = ['Autoclaving', 'Incineration', 'Chemical Disinfection', 'Microwaving'];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }

// ── Hospitals ──
const hospitals = Array.from({ length: 25 }, (_, i) => ({
  id: uuidv4(),
  name: `${['City', 'District', 'Government', 'Apollo', 'Lifeline', 'Care', 'Medica', 'Sadar', 'Civil', 'Primary Health'][i % 10]} Hospital ${i + 1}`,
  type: randomFrom(hospitalTypes),
  beds: randomBetween(10, 500),
  district: randomFrom(districts),
  address: `Ward ${randomBetween(1, 30)}, ${randomFrom(districts)}`,
  contact: `+91 ${randomBetween(70000, 99999)}${randomBetween(10000, 99999)}`,
  createdAt: daysAgo(randomBetween(30, 365))
}));

// ── Users ──
const users = [
  { id: uuidv4(), name: 'Dr. Rajesh Kumar', email: 'admin@biotrack.in', password: 'admin123', role: 'plant_head', phone: '+91 9876543210', createdAt: daysAgo(200) },
  { id: uuidv4(), name: 'Sunil Verma', email: 'manager@biotrack.in', password: 'manager123', role: 'plant_manager', phone: '+91 9876543211', createdAt: daysAgo(180) },
  { id: uuidv4(), name: 'Amit Singh', email: 'driver1@biotrack.in', password: 'driver123', role: 'driver', phone: '+91 9876543212', createdAt: daysAgo(150) },
  { id: uuidv4(), name: 'Ravi Sharma', email: 'driver2@biotrack.in', password: 'driver123', role: 'driver', phone: '+91 9876543213', createdAt: daysAgo(140) },
  { id: uuidv4(), name: 'Priya Patel', email: 'operator@biotrack.in', password: 'operator123', role: 'plant_manager', phone: '+91 9876543214', createdAt: daysAgo(120) },
  { id: uuidv4(), name: 'JSPCB Inspector', email: 'authority@biotrack.in', password: 'authority123', role: 'regulatory', phone: '+91 9876543215', createdAt: daysAgo(100) },
];

// ── Bags ──
const statuses = ['created', 'collected', 'in_transit', 'received', 'in_batch', 'treated'];
const bags = Array.from({ length: 200 }, (_, i) => {
  const hospital = randomFrom(hospitals);
  const status = randomFrom(statuses);
  const daysBack = randomBetween(0, 60);
  const collectedBy = status !== 'created' ? randomFrom(users.filter(u => u.role === 'driver')).id : null;
  return {
    id: uuidv4(),
    barcode: `BMW${String(2025000 + i).padStart(8, '0')}`,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    category: randomFrom(wasteCategories),
    weight: parseFloat((Math.random() * 15 + 0.5).toFixed(2)),
    createdAt: daysAgo(daysBack),
    collectedAt: status !== 'created' ? daysAgo(daysBack > 0 ? daysBack - 1 : 0) : null,
    collectedBy,
    receivedAt: ['received', 'in_batch', 'treated'].includes(status) ? daysAgo(daysBack > 1 ? daysBack - 1 : 0) : null,
    receivedBy: ['received', 'in_batch', 'treated'].includes(status) ? randomFrom(users.filter(u => u.role === 'plant_manager')).id : null,
    status,
    gpsLat: 23.3441 + (Math.random() - 0.5) * 0.2,
    gpsLng: 85.3096 + (Math.random() - 0.5) * 0.2,
    scanHistory: [
      { action: 'created', timestamp: daysAgo(daysBack), userId: randomFrom(users).id },
      ...(status !== 'created' ? [{ action: 'collected', timestamp: daysAgo(daysBack > 0 ? daysBack - 1 : 0), userId: collectedBy }] : []),
      ...(['received', 'in_batch', 'treated'].includes(status) ? [{ action: 'received', timestamp: daysAgo(daysBack > 1 ? daysBack - 1 : 0), userId: randomFrom(users).id }] : []),
    ]
  };
});

// ── Routes ──
const routes = Array.from({ length: 15 }, (_, i) => {
  const driver = users.filter(u => u.role === 'driver')[i % 2];
  const routeDate = daysAgo(i);
  const assignedHospitals = hospitals.slice(i * 3 % hospitals.length, i * 3 % hospitals.length + randomBetween(3, 6));
  return {
    id: uuidv4(),
    driverId: driver.id,
    driverName: driver.name,
    date: routeDate,
    vehicleNumber: `JH ${randomBetween(1, 14)} AB ${randomBetween(1000, 9999)}`,
    sites: assignedHospitals.map(h => h.id),
    siteNames: assignedHospitals.map(h => h.name),
    status: i < 2 ? 'active' : 'closed'
  };
});

// ── Manifests ──
const manifests = routes.filter(r => r.status === 'closed').map(route => ({
  id: uuidv4(),
  routeId: route.id,
  bags: bags.filter(b => b.collectedBy && route.sites.includes(b.hospitalId)).slice(0, randomBetween(5, 15)).map(b => b.id),
  closedAt: route.date,
  hospitalId: randomFrom(route.sites)
}));

// ── Batches ──
const treatedBags = bags.filter(b => b.status === 'treated');
const batches = Array.from({ length: 8 }, (_, i) => {
  const batchBags = treatedBags.slice(i * 5, i * 5 + randomBetween(3, 8));
  return {
    id: uuidv4(),
    batchNumber: `BATCH-${String(i + 1).padStart(4, '0')}`,
    bags: batchBags.map(b => b.id),
    bagCount: batchBags.length,
    totalWeight: parseFloat(batchBags.reduce((s, b) => s + b.weight, 0).toFixed(2)),
    categories: [...new Set(batchBags.map(b => b.category))],
    createdAt: daysAgo(randomBetween(1, 30)),
    treatedAt: i < 6 ? daysAgo(randomBetween(0, 5)) : null,
    treatmentType: i < 6 ? randomFrom(treatmentTypes) : null,
    operator: i < 6 ? randomFrom(users.filter(u => u.role === 'plant_manager')).name : null,
    status: i < 6 ? 'treated' : 'pending',
    certificate: i < 6 ? {
      id: uuidv4(),
      generatedAt: daysAgo(randomBetween(0, 5)),
    } : null
  };
});

// ── Discrepancies ──
const discrepancies = Array.from({ length: 12 }, (_, i) => ({
  id: uuidv4(),
  bagId: bags[i * 10]?.id || bags[0].id,
  barcode: bags[i * 10]?.barcode || bags[0].barcode,
  type: randomFrom(['MISSING_AT_PLANT', 'UNEXPECTED_AT_PLANT', 'WEIGHT_MISMATCH']),
  description: randomFrom([
    'Bag scanned at collection but not received at plant gate',
    'Bag received at plant but not on any manifest',
    'Weight at collection differs from weight at plant by >20%'
  ]),
  routeId: randomFrom(routes).id,
  createdAt: daysAgo(randomBetween(0, 30)),
  resolvedAt: i < 6 ? daysAgo(randomBetween(0, 5)) : null,
  resolvedBy: i < 6 ? randomFrom(users.filter(u => u.role === 'plant_manager')).id : null,
  resolution: i < 6 ? randomFrom(['Bag located in vehicle', 'Data entry error corrected', 'Bag confirmed destroyed']) : null,
  status: i < 6 ? 'resolved' : 'open'
}));

// ── Audit Logs ──
const auditLogs = [];
function addAudit(userId, action, entity, entityId, details) {
  auditLogs.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    userId,
    userName: users.find(u => u.id === userId)?.name || 'System',
    action,
    entity,
    entityId,
    details
  });
}

// Seed some historical audit entries
const actions = ['BAG_CREATED', 'BAG_SCANNED', 'BAG_COLLECTED', 'BAG_RECEIVED', 'BATCH_CREATED', 'TREATMENT_LOGGED', 'DISCREPANCY_FLAGGED', 'USER_LOGIN', 'ROUTE_CLOSED'];
for (let i = 0; i < 100; i++) {
  auditLogs.push({
    id: uuidv4(),
    timestamp: daysAgo(randomBetween(0, 60)),
    userId: randomFrom(users).id,
    userName: randomFrom(users).name,
    action: randomFrom(actions),
    entity: randomFrom(['bag', 'batch', 'route', 'user', 'discrepancy']),
    entityId: uuidv4(),
    details: 'Automated system action'
  });
}
auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// ── Data Store ──
const db = {
  hospitals,
  users,
  bags,
  routes,
  manifests,
  batches,
  discrepancies,
  auditLogs,
  addAudit
};

export default db;
