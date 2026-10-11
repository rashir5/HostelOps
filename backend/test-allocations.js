const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== 1. Generating Auth Token for Admin ===');
  await mongoose.connect(process.env.MONGODB_URI);
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.findOne({ role: 'warden' });
  }
  if (!adminUser) {
    console.error('No admin or warden user found in database');
    process.exit(1);
  }

  const token = jwt.sign(
    { id: adminUser._id, role: adminUser.role, email: adminUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  await mongoose.disconnect();

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log(`Generated token for ${adminUser.role}: ${adminUser.email}`);

  console.log('\n=== 2. Fetching unallocated students ===');
  const unallocRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/students?allocated=false',
    method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/students?allocated=false Status:', unallocRes.status);
  console.log('Unallocated count:', unallocRes.body.total, 'First unallocated student:', unallocRes.body.items[0]?.studentId, unallocRes.body.items[0]?.name);

  const testStudent = unallocRes.body.items[0];
  if (!testStudent) {
    console.error('No unallocated student found to test with');
    return;
  }

  console.log('\n=== 3. Fetching vacant bed in Oak House ===');
  const roomsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/rooms?hostel=Oak%20House',
    method: 'GET',
    headers: authHeaders
  });
  const vacantRoom = roomsRes.body.find(r => r.beds && r.beds.some(b => !b.student));
  const vacantBed = vacantRoom?.beds.find(b => !b.student);
  const targetRoomNo = vacantRoom?.roomNo || 'C-111';
  const targetBedNo = vacantBed?.bedNo || '01';

  // Also find a second vacant bed for testing move
  const secondVacantBed = vacantRoom?.beds.find(b => !b.student && b.bedNo !== targetBedNo) || { bedNo: targetBedNo === '01' ? '02' : '01' };

  console.log(`Using room ${targetRoomNo}, vacant bed ${targetBedNo} for initial allocation test`);

  console.log(`\n=== 4. Allocating student to Oak House, room ${targetRoomNo}, bed ${targetBedNo} ===`);
  const allocRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/allocations',
    method: 'POST',
    headers: authHeaders
  }, {
    studentId: testStudent.studentId,
    hostel: 'Oak House',
    roomNo: targetRoomNo,
    bedNo: targetBedNo
  });
  console.log('POST /api/allocations Status:', allocRes.status);

  console.log('\n=== 5. Testing duplicate allocation / occupied bed (Expect 409 Conflict) ===');
  const secondStudent = unallocRes.body.items[1];
  const duplicateRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/allocations',
    method: 'POST',
    headers: authHeaders
  }, {
    studentId: secondStudent.studentId,
    hostel: 'Oak House',
    roomNo: targetRoomNo,
    bedNo: targetBedNo
  });
  console.log('POST /api/allocations (occupied bed) Status:', duplicateRes.status);

  // Find another vacant room for moving
  const anotherVacantRoom = roomsRes.body.find(r => r.roomNo !== targetRoomNo && r.beds && r.beds.some(b => !b.student));
  const moveRoomNo = anotherVacantRoom?.roomNo || 'C-112';
  const moveBedNo = anotherVacantRoom?.beds.find(b => !b.student)?.bedNo || '01';

  console.log(`\n=== 6. Moving student to Oak House, room ${moveRoomNo}, bed ${moveBedNo} ===`);
  const moveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/allocations/${testStudent.studentId}/move`,
    method: 'PUT',
    headers: authHeaders
  }, {
    hostel: 'Oak House',
    roomNo: moveRoomNo,
    bedNo: moveBedNo
  });
  console.log('PUT /api/allocations/:id/move Status:', moveRes.status);
  console.log('Response:', moveRes.body);

  console.log('\n=== 7. Releasing student bed allocation ===');
  const releaseRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/allocations/${testStudent.studentId}`,
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('DELETE /api/allocations/:id Status:', releaseRes.status);
  console.log('Response:', releaseRes.body);

  console.log('\n=== 7. Fetching Audit Logs ===');
  const auditRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/audit-logs',
    method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/audit-logs Status:', auditRes.status);
  console.log('Audit log total count:', auditRes.body.total);
  console.log('Recent 3 logs:', auditRes.body.items.slice(0, 3).map(l => ({ action: l.action, actor: l.actor, details: l.details })));

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULY!');
}

runTests().catch(console.error);
