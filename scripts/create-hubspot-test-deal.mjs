#!/usr/bin/env node
/**
 * Creates a test deal in HubSpot using a Private App access token.
 *
 * Prerequisites:
 * - Set HUBSPOT_ACCESS_TOKEN in repo-root .env to a real token (starts with pat-...),
 *   not the placeholder.
 * - Private app scopes: crm.objects.deals.read + crm.objects.deals.write (and any
 *   scopes required for account-info if your account restricts it).
 *
 * Usage (from repo root):
 *   node scripts/create-hubspot-test-deal.mjs
 *
 * Prints: portalId (hubId), deal id, and deal name.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

async function hubspotFetch(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body.message || body.raw || res.statusText;
    throw new Error(`${res.status} ${url}: ${msg}`);
  }
  return body;
}

function main() {
  const env = loadEnvFile(envPath);
  const token = env.HUBSPOT_ACCESS_TOKEN;
  if (!token || token.includes('your-private-app')) {
    console.error(
      'Set a real HubSpot Private App token in .env as HUBSPOT_ACCESS_TOKEN (must start with pat-).',
    );
    console.error(
      'HubSpot CLI login tokens cannot call the CRM API (they return "User level OAuth token is not allowed").',
    );
    process.exit(1);
  }

  return run(token);
}

async function run(token) {
  const details = await hubspotFetch(token, 'https://api.hubapi.com/account-info/v3/details');
  const portalId =
    details.portalId ?? details.hubId ?? details?.properties?.portalId ?? details?.portalId;
  if (portalId == null) {
    console.error('Unexpected account-info response:', JSON.stringify(details, null, 2));
    process.exit(1);
  }
  console.log('Portal (hub) ID from API:', portalId);

  const pipelinesData = await hubspotFetch(
    token,
    'https://api.hubapi.com/crm/v3/pipelines/deals',
  );
  const pipelines = pipelinesData.results || [];
  if (pipelines.length === 0) {
    throw new Error('No deal pipelines returned');
  }
  const pipeline = pipelines[0];
  const stages = pipeline.stages || [];
  if (stages.length === 0) {
    throw new Error(`Pipeline ${pipeline.id} has no stages`);
  }
  const stage = stages[0];
  const dealName = `Winnow API test ${new Date().toISOString().slice(0, 19)}Z`;

  const created = await hubspotFetch(token, 'https://api.hubapi.com/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        dealname: dealName,
        pipeline: pipeline.id,
        dealstage: stage.id,
      },
    }),
  });

  console.log('Created deal id:', created.id);
  console.log('Deal name:', dealName);
  console.log('Pipeline:', pipeline.label, `(${pipeline.id})`);
  console.log('Stage:', stage.label, `(${stage.id})`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
