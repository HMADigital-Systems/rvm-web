#!/usr/bin/env node

/**
 * Batch Sync: Update all Supabase users with totals from vendor API
 * 
 * Usage: node batch-sync-all-users.js
 * 
 * For each user in Supabase with a phone number:
 * 1. Fetch their recycling records from vendor API
 * 2. Calculate totals (weight, points)
 * 3. Update Supabase user record
 */

const https = require('https');

const SUPABASE_URL = 'https://aultuckuvussdyynglkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_S9EulCL4BbZfmJft6Ly90g_03fxAe6u';

const PROXY_URL = 'https://app.mygreenplus.com/api/proxy';

async function fetch(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const req = https.get(url.toString(), {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function fetchWithBody(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function updateUser(userId, totals) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(totals);
    const parsed = new URL(`/rest/v1/users?id=eq.${userId}`, SUPABASE_URL);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Prefer': 'return=minimal'
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getVendorRecords(phone, page = 1, pageSize = 100) {
  // Convert to local format for vendor API
  const localPhone = phone.replace(/[^0-9]/g, '').replace(/^60/, '0');
  
  const body = {
    endpoint: '/api/open/v1/put',
    method: 'GET',
    params: { phone: localPhone, pageNum: page, pageSize }
  };
  
  try {
    const result = await fetchWithBody(PROXY_URL, body);
    if (result.code === 200 && result.data) {
      return result.data.list || [];
    }
    return [];
  } catch (err) {
    console.error(`  Vendor API error for ${phone}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Batch Sync: Syncing all users from vendor API to Supabase\n');

  // 1. Get all users from Supabase
  const users = await fetch('/rest/v1/users?select=id,user_id,phone,total_weight,total_points,last_synced_at');
  
  if (!Array.isArray(users)) {
    console.error('Failed to fetch users:', users);
    process.exit(1);
  }

  console.log(`📊 Found ${users.length} users in Supabase\n`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    const phone = user.phone;
    if (!phone) { skipped++; continue; }

    process.stdout.write(`📱 ${phone.padEnd(15)}... `);

    try {
      const records = await getVendorRecords(phone);
      
      if (records.length === 0) {
        console.log(`⏭️  No records`);
        skipped++;
        continue;
      }

      const totalWeight = records.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
      const totalPoints = records.reduce((sum, r) => sum + (Number(r.integral) || 0), 0);

      // Check if already synced
      const weightDiff = Math.abs(totalWeight - (user.total_weight || 0));
      const pointsDiff = Math.abs(totalPoints - (user.total_points || 0));

      if (weightDiff < 0.01 && pointsDiff < 0.01) {
        console.log(`✅ Already synced (${records.length} records, ${totalWeight.toFixed(2)}kg, RM${totalPoints.toFixed(2)})`);
        synced++;
        continue;
      }

      await updateUser(user.id, {
        total_weight: Math.round(totalWeight * 100) / 100,
        total_points: Math.round(totalPoints * 100) / 100,
        last_synced_at: new Date().toISOString()
      });

      const oldW = user.total_weight || 0;
      const oldP = user.total_points || 0;
      console.log(`🔄 Updated: ${oldW}kg→${totalWeight.toFixed(2)}kg, RM${oldP}→RM${totalPoints.toFixed(2)} (${records.length} records)`);
      synced++;
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Sync Complete`);
  console.log(`   ✅ Synced/Verified: ${synced}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
}

main().catch(console.error);
