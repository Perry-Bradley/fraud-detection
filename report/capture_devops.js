// Captures screenshots of the locally-running DevOps tool UIs into report/images/.
// Uses the installed Chrome (no browser download). Run: node capture_devops.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const IMG = path.join(__dirname, 'images');
const ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const out = {};
    for (const line of txt.split(/\r?\n/)) {
      if (!line.includes('=') || line.trim().startsWith('#')) continue;
      const i = line.indexOf('=');
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return out;
  } catch { return {}; }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(IMG, name) });
  console.log('  saved', name);
}

(async () => {
  const env = loadEnv();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // ---- Grafana ----
  try {
    console.log('Grafana...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    await page.fill('input[name=user]', env.GRAFANA_ADMIN_USER || 'admin');
    await page.fill('input[name=password]', env.GRAFANA_ADMIN_PASSWORD || 'admin');
    await page.click('button[type=submit]');
    await page.waitForTimeout(3500);
    // skip "change password" prompt if shown
    await page.click('a:has-text("Skip"), button:has-text("Skip")', { timeout: 3000 }).catch(() => {});
    await page.goto('http://localhost:3001/d/sms-overview/sms-overview?orgId=1&from=now-3h&to=now&refresh=10s',
      { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);
    await shot(page, 'grafana_dashboard.png');
    await page.goto('http://localhost:3001/connections/datasources', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await shot(page, 'grafana_datasources.png');
  } catch (e) { console.log('  Grafana error:', e.message); }

  // ---- Prometheus ----
  try {
    console.log('Prometheus...');
    await page.goto('http://localhost:9090/targets', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: path.join(IMG, 'prometheus_targets.png'), fullPage: true });
    console.log('  saved prometheus_targets.png');
    await page.goto('http://localhost:9090/graph?g0.expr=up&g0.tab=0&g0.range_input=1h',
      { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await shot(page, 'prometheus_graph.png');
  } catch (e) { console.log('  Prometheus error:', e.message); }

  // ---- pgAdmin ----
  try {
    console.log('pgAdmin...');
    await page.goto('http://localhost:5050/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const email = page.locator('#email, input[name=email], input[type=email]').first();
    await email.waitFor({ timeout: 15000 });
    await email.fill(env.PGADMIN_DEFAULT_EMAIL || 'admin@school.com');
    await page.locator('#password, input[name=password], input[type=password]').first()
      .fill(env.PGADMIN_DEFAULT_PASSWORD || 'admin');
    await page.click('button[type=submit]');
    await page.waitForTimeout(7000);
    await shot(page, 'pgadmin.png');
  } catch (e) { console.log('  pgAdmin error:', e.message); }

  // ---- ML service docs (Swagger) ----
  try {
    console.log('ML docs...');
    await page.goto('http://localhost:8000/docs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await shot(page, 'ml_docs.png');
  } catch (e) { console.log('  ML docs error:', e.message); }

  await browser.close();
  console.log('done.');
})();
