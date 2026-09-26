const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(root, 'public/app-src/00-bootstrap.js'), 'utf8');
const events = fs.readFileSync(path.join(root, 'public/app-src/tank/events-recaps-and-save.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'public/app-src/ui/management-and-overlays.js'), 'utf8');
const emails = JSON.parse(fs.readFileSync(path.join(root, 'assets/web/websurf/auto_emails.json'), 'utf8'));

function milestoneRewards() {
  const start = bootstrap.indexOf('const PROGRESSION_MILESTONES');
  const end = bootstrap.indexOf(']);', start);
  assert.ok(start >= 0 && end > start, 'milestone catalog should exist');
  const block = bootstrap.slice(start, end);
  const out = new Map();
  const regex = /id:\s*"([^"]+)"[\s\S]*?reward:\s*(\d+)/g;
  let match;
  while ((match = regex.exec(block))) out.set(match[1], Number(match[2]));
  return out;
}

test('Phase 27 uses only the six intended milestone coin rewards', () => {
  const rewards = milestoneRewards();
  assert.equal(rewards.size, 31);
  const intended = new Map([
    ['first-care', 3],
    ['stable-tank', 5],
    ['happy-habitat', 5],
    ['master-keeper', 8],
    ['marine-curator', 8],
    ['borough-legends', 10]
  ]);
  for (const [id, reward] of rewards) {
    assert.equal(reward, intended.get(id) || 0, `${id} reward`);
  }
});

test('zero-value milestones do not create wallet credits', () => {
  assert.match(events, /if \(milestone\.reward > 0\) \{[\s\S]*?recordWalletTransaction\(\{ amount: milestone\.reward/);
  assert.doesNotMatch(events, /\n\s*recordWalletTransaction\(\{ amount: milestone\.reward[^\n]*\n\s*const speciesUnlocked/);
});

test('milestone UI avoids +0 coin badges and zero-reward copy', () => {
  assert.match(ui, /milestone\.reward > 0 \? renderBubbleBankCoinAmount/);
  assert.match(ui, /milestone\.reward > 0 \? `<span>\$\{escapeHtml\(`\$\{milestone\.reward\} coin reward`\)\}<\/span>` : ""/);
  assert.match(ui, /milestone\.reward <= 0 && !unlockLabels\.length \? "<span>Achievement milestone<\/span>"/);
});

test('milestone email template uses conditional outcome text supplied by milestone data', () => {
  const template = emails.templates.milestone_reward;
  assert.equal(template.preview, '{{milestonePreview}}');
  const serialized = JSON.stringify(template.body);
  assert.match(serialized, /milestoneOutcome/);
  assert.match(serialized, /milestoneUnlockSummary/);
  assert.doesNotMatch(serialized, /coin:reward/);
  assert.match(ui, /milestone\.reward > 0\s*\? `\$\{milestone\.reward\} Fish Coins have been deposited into your account\.`\s*:\s*"Achievement recorded\."/);
});
