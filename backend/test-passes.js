/**
 * Pass Management Verification Script
 * Uses JWT tokens signed from env — never prints passwords or tokens.
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

// ── helpers ────────────────────────────────────────────────────────────────────
function req(options, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const reqOpts = {
      hostname: 'localhost',
      port: 5000,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(options.headers || {})
      }
    };
    const r = http.request(reqOpts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body: json, raw });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function authHdr(token) {
  return { Authorization: `Bearer ${token}` };
}

function check(label, actual, expected, body) {
  const ok = actual === expected;
  console.log(`  [${ok ? 'OK' : 'FAIL'}] ${label} → ${actual} (expected ${expected})`);
  if (!ok) {
    console.log('       body:', JSON.stringify(body));
    process.exitCode = 1;
  }
}

// ── main ───────────────────────────────────────────────────────────────────────
async function run() {
  // 1. Get tokens by signing JWTs for admin and student users from DB
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({
    email: String, role: String, student: mongoose.Schema.Types.ObjectId, isActive: Boolean
  }));

  const adminUser  = await User.findOne({ role: 'admin',   isActive: true });
  const studentUser = await User.findOne({ role: 'student', isActive: true });
  const anotherStudentUser = await User.findOne({
    role: 'student', isActive: true, _id: { $ne: studentUser._id }
  });

  if (!adminUser || !studentUser || !anotherStudentUser) {
    console.error('Could not find required users in DB');
    process.exit(1);
  }

  const secret = process.env.JWT_SECRET;
  const adminToken   = jwt.sign({ id: adminUser._id,   role: adminUser.role },   secret, { expiresIn: '1h' });
  const studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, secret, { expiresIn: '1h' });
  const anotherToken = jwt.sign({ id: anotherStudentUser._id, role: anotherStudentUser.role }, secret, { expiresIn: '1h' });

  await mongoose.disconnect();

  console.log(`\nStudent under test: ${studentUser.email}`);
  console.log(`Another student:    ${anotherStudentUser.email}`);
  console.log(`Admin:              ${adminUser.email}\n`);

  // 2. Date helpers — future dates
  const dep1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();  // +2 days
  const ret1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();  // +5 days
  const pastDep = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();    // -3 hours (past)
  const futureRet = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +1 day

  // ── TEST BLOCK 1: Student creates a pass ─────────────────────────────────────
  console.log('=== 1. Student creates a valid pass (expect 201) ===');
  const c1 = await req({
    path: '/api/passes', method: 'POST',
    headers: authHdr(studentToken)
  }, { reason: 'Family visit', destination: 'Home - Chennai', departureAt: dep1, expectedReturnAt: ret1 });
  check('POST /api/passes (valid)', c1.status, 201, c1.body);
  const passId = c1.body?.pass?._id;
  console.log(`  passId: ${passId}`);

  // ── TEST BLOCK 2: Past departure → 400 ───────────────────────────────────────
  console.log('\n=== 2. Past departure date (expect 400) ===');
  const c2 = await req({
    path: '/api/passes', method: 'POST',
    headers: authHdr(studentToken)
  }, { reason: 'Test', destination: 'Somewhere', departureAt: pastDep, expectedReturnAt: futureRet });
  check('POST /api/passes (past departure)', c2.status, 400, c2.body);

  // ── TEST BLOCK 3: Overlapping pass → 409 ────────────────────────────────────
  console.log('\n=== 3. Overlapping pass (expect 409) ===');
  const dep3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const ret3 = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const c3 = await req({
    path: '/api/passes', method: 'POST',
    headers: authHdr(studentToken)
  }, { reason: 'Overlap test', destination: 'Overlap city', departureAt: dep3, expectedReturnAt: ret3 });
  check('POST /api/passes (overlap)', c3.status, 409, c3.body);

  // ── TEST BLOCK 4: Admin tries student endpoint → 403 ─────────────────────────
  console.log('\n=== 4. Admin using student-only endpoint (expect 403) ===');
  const c4 = await req({
    path: '/api/passes', method: 'POST',
    headers: authHdr(adminToken)
  }, { reason: 'Admin test', destination: 'Somewhere', departureAt: dep1, expectedReturnAt: ret1 });
  check('POST /api/passes as admin', c4.status, 403, c4.body);

  // ── TEST BLOCK 5: Admin lists pending passes ─────────────────────────────────
  console.log('\n=== 5. Admin lists pending passes (expect 200) ===');
  const c5 = await req({
    path: '/api/passes?status=pending', method: 'GET',
    headers: authHdr(adminToken)
  });
  check('GET /api/passes?status=pending', c5.status, 200, c5.body);
  console.log(`  Total pending: ${c5.body?.total}`);

  // ── TEST BLOCK 6: Admin approves the pass ───────────────────────────────────
  console.log(`\n=== 6. Admin approves pass ${passId} (expect 200) ===`);
  const c6 = await req({
    path: `/api/passes/${passId}/approve`, method: 'PUT',
    headers: authHdr(adminToken)
  }, { decisionNote: 'Approved for family emergency' });
  check('PUT /api/passes/:id/approve', c6.status, 200, c6.body);

  // ── TEST BLOCK 7: Approve again → 409 ───────────────────────────────────────
  console.log('\n=== 7. Admin approves again (expect 409) ===');
  const c7 = await req({
    path: `/api/passes/${passId}/approve`, method: 'PUT',
    headers: authHdr(adminToken)
  });
  check('PUT /api/passes/:id/approve (again)', c7.status, 409, c7.body);

  // ── TEST BLOCK 8: Reject without note → 400 ─────────────────────────────────
  // Need a fresh pending pass for this — create a second student pass
  console.log('\n=== 8. Student creates a second pass for reject test ===');
  const dep8 = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();
  const ret8 = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
  const c8pre = await req({
    path: '/api/passes', method: 'POST',
    headers: authHdr(studentToken)
  }, { reason: 'Second visit', destination: 'Grandparents', departureAt: dep8, expectedReturnAt: ret8 });
  check('POST /api/passes (second, for reject test)', c8pre.status, 201, c8pre.body);
  const passId2 = c8pre.body?.pass?._id;

  console.log('\n=== 8b. Reject without decisionNote (expect 400) ===');
  const c8 = await req({
    path: `/api/passes/${passId2}/reject`, method: 'PUT',
    headers: authHdr(adminToken)
  }, {});
  check('PUT /api/passes/:id/reject (no note)', c8.status, 400, c8.body);

  console.log('\n=== 8c. Reject with decisionNote (expect 200) ===');
  const c8c = await req({
    path: `/api/passes/${passId2}/reject`, method: 'PUT',
    headers: authHdr(adminToken)
  }, { decisionNote: 'Denied — exam period' });
  check('PUT /api/passes/:id/reject (with note)', c8c.status, 200, c8c.body);

  // ── TEST BLOCK 9: mark-out ───────────────────────────────────────────────────
  console.log(`\n=== 9. Admin marks pass ${passId} as out (expect 200) ===`);
  const c9 = await req({
    path: `/api/passes/${passId}/mark-out`, method: 'PUT',
    headers: authHdr(adminToken)
  });
  check('PUT /api/passes/:id/mark-out', c9.status, 200, c9.body);

  // ── TEST BLOCK 10: mark-returned ────────────────────────────────────────────
  console.log(`\n=== 10. Admin marks pass ${passId} as returned (expect 200) ===`);
  const c10 = await req({
    path: `/api/passes/${passId}/mark-returned`, method: 'PUT',
    headers: authHdr(adminToken)
  });
  check('PUT /api/passes/:id/mark-returned', c10.status, 200, c10.body);
  console.log(`  actualReturnAt: ${c10.body?.pass?.actualReturnAt}`);

  // ── TEST BLOCK 11: GET /api/passes/overdue ───────────────────────────────────
  console.log('\n=== 11. Overdue list (expect 200) ===');
  const c11 = await req({
    path: '/api/passes/overdue', method: 'GET',
    headers: authHdr(adminToken)
  });
  check('GET /api/passes/overdue', c11.status, 200, c11.body);
  console.log(`  Overdue passes: ${c11.body?.total}`);

  // ── TEST BLOCK 12: Another student cannot read this student's passes ──────────
  console.log('\n=== 12. Another student reads /passes/mine (their own, 200) ===');
  const c12 = await req({
    path: '/api/passes/mine', method: 'GET',
    headers: authHdr(anotherToken)
  });
  check('GET /api/passes/mine (another student)', c12.status, 200, c12.body);
  // Verify the other student's passes don't include passId
  const otherIds = (c12.body?.items || []).map(p => p._id);
  const leaked = otherIds.includes(passId);
  console.log(`  [${!leaked ? 'OK' : 'FAIL'}] Pass isolation — other student cannot see passId`);
  if (leaked) process.exitCode = 1;

  // ── TEST BLOCK 13: Student gets /passes/mine ─────────────────────────────────
  console.log('\n=== 13. Student reads their own passes (expect 200) ===');
  const c13 = await req({
    path: '/api/passes/mine', method: 'GET',
    headers: authHdr(studentToken)
  });
  check('GET /api/passes/mine', c13.status, 200, c13.body);
  console.log(`  Student pass count: ${c13.body?.total}`);

  // ── CLEANUP: Delete the test passes ─────────────────────────────────────────
  console.log('\n=== Cleanup: deleting test passes directly from DB ===');
  await mongoose.connect(process.env.MONGODB_URI);
  const Pass = mongoose.model('Pass', new mongoose.Schema({}, { strict: false }));
  const ids = [passId, passId2].filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
  const del = await Pass.deleteMany({ _id: { $in: ids } });
  console.log(`  Deleted ${del.deletedCount} test pass(es)`);
  await mongoose.disconnect();

  console.log('\n=== All verification tests complete ===');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
