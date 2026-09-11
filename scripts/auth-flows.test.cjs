"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('public/app-src/core/cloud-save.js', 'utf8');
function harness(href = 'https://bubbleborough.com/', existing = null) {
  const storage = new Map(existing ? [['session', JSON.stringify(existing)]] : []);
  const calls = [];
  const c = vm.createContext({ URL, URLSearchParams, TypeError, console, Date,
    runtime: {}, dom: {}, document: { title: 'Bubble Borough', querySelector: () => null, querySelectorAll: () => [] },
    window: { location: new URL(href), history: { replaceState(_s, _t, url) { c.window.location = new URL(url, c.window.location); } } },
    localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    CLOUD_AUTH_SESSION_KEY: 'session', CLOUD_SAVE_META_KEY: 'meta',
    syncDebugToolsAuthorization() {}, escapeHtml: text => String(text),
  });
  vm.runInContext(source, c);
  c.renderStartupActions = () => {};
  c.renderCloudAccountPanel = () => {};
  c.ensureStartupActions = () => null;
  c.supabaseAuthFetch = async (path, options) => { calls.push({path, options}); return { id: 'user', email: 'new@example.com' }; };
  c.resolveCloudAfterLogin = async () => { throw new Error('Callback must not load a cloud save'); };
  return { c, storage, calls };
}
const callback = (route, type) => `https://bubbleborough.com/?keep=1&auth=${route}#access_token=test&refresh_token=refresh&type=${type}`;
for (const [route, type, title] of [['signup-confirmed','signup','Email Confirmed'], ['email-changed','email_change','Email Address Changed']]) {
  test(`${route} validates callback, isolates session, returns to clean login`, async () => {
    const {c, storage, calls} = harness(callback(route,type), {access_token:'existing', user:{id:'old'}});
    await c.handleAuthRoute();
    assert.equal(c.runtime.cloudAuthScreen.title,title);
    assert.equal(c.getCloudSession().access_token,'existing');
    assert.equal(c.runtime.cloudAuthTemporarySession.access_token,'test');
    assert.equal(calls[0].path,'/auth/v1/user');
    assert.equal(c.window.location.search,'?keep=1');
    assert.equal(c.window.location.hash,'');
    c.returnToCloudLogin();
    assert.equal(storage.has('session'),false);
    assert.equal(c.runtime.cloudAuthScreen,null);
    assert.equal((await c.handleAuthRoute()).handled,false);
  });
}
test('recovery validates session, updates password and shows success without cloud login', async () => {
  const {c,calls} = harness(callback('recovery','recovery'));
  await c.handleAuthRoute();
  assert.equal(c.hasCloudPasswordRecoverySession(),true);
  await c.completeCloudPasswordReset('test-password','test-password');
  assert.equal(calls[1].options.body.password,'test-password');
  assert.equal(c.runtime.cloudAuthScreen.title,'Password Changed');
  assert.equal(c.getCloudSession(),null);
  assert.equal(c.hasCloudPasswordRecoverySession(),false);
});
test('recovery rejects mismatches and missing session before network mutation', async () => {
  const {c,calls} = harness();
  await assert.rejects(c.completeCloudPasswordReset('abcdef','ghijkl'),/do not match/);
  await assert.rejects(c.completeCloudPasswordReset('abcdef','abcdef'),/expired/);
  assert.equal(calls.length,0);
});
for (const route of ['signup-confirmed','email-changed','password-changed','recovery','reauth']) {
  test(`bare ${route} cannot claim verification or trigger reauthentication`,async () => {
    const {c,calls} = harness(`https://bubbleborough.com/?auth=${route}`);
    await c.handleAuthRoute();
    assert.equal(c.runtime.cloudAuthScreen.error,true);
    assert.equal(calls.length,0);
    assert.equal(c.window.location.search,'');
  });
}
test('expired, invalid, already verified and failed callback requests are themed',async () => {
  for (const [error,title] of [['otp_expired','Verification Link Expired'],['invalid link','Something Went Wrong'],['already verified','Email Already Verified']]) {
    const {c} = harness(`https://bubbleborough.com/#error=access_denied&error_description=${encodeURIComponent(error)}`);
    await c.handleAuthRoute();
    assert.equal(c.runtime.cloudAuthScreen.title,title);
    assert.equal(c.window.location.hash,'');
  }
  const {c} = harness(callback('signup-confirmed','signup'));
  c.supabaseAuthFetch = async () => { throw new TypeError('Failed to fetch'); };
  await c.handleAuthRoute();
  assert.match(c.runtime.cloudAuthScreen.message,/internet/);
  assert.equal(c.getCloudSession(),null);
});
test('secure email change does not prematurely claim final verification', async () => {
  const {c} = harness(callback('email-changed','email_change'));
  c.supabaseAuthFetch = async () => ({id:'user',new_email:'pending@example.com'});
  await c.handleAuthRoute();
  assert.equal(c.runtime.cloudAuthScreen.title,'Verification Still Needed');
});
test('normal loads preserve session and unrelated URL state',async () => {
  const {c} = harness('https://bubbleborough.com/?keep=1#tank',{access_token:'existing'});
  assert.equal((await c.handleAuthRoute()).handled,false);
  assert.equal(c.getCloudSession().access_token,'existing');
  assert.equal(c.window.location.hash,'#tank');
});
test('invite lands on login; legacy magic links retain their session behavior',async () => {
  const invite = harness(callback('','invite')).c;
  await invite.handleAuthRoute();
  assert.equal(invite.runtime.cloudForceLogin,true);
  assert.equal(invite.getCloudSession(),null);
  const magic = harness(callback('','magiclink')).c;
  await magic.handleAuthRoute();
  assert.equal(magic.getCloudSession().access_token,'test');
});
test('requests use the correct redirect and authenticated email update endpoint',async () => {
  const {c,calls} = harness('https://bubbleborough.com/?keep=1');
  await c.createCloudAccount('new@example.com','test-password');
  await c.requestCloudPasswordReset('new@example.com');
  c.refreshCloudSessionIfNeeded = async () => ({access_token:'existing',user:{email:'old@example.com'}});
  await c.requestCloudEmailChange('new@example.com');
  assert.match(decodeURIComponent(calls[0].path),/auth=signup-confirmed/);
  assert.match(decodeURIComponent(calls[1].path),/auth=recovery/);
  assert.match(decodeURIComponent(calls[2].path),/auth=email-changed/);
  assert.equal(calls[2].options.method,'PUT');
  assert.equal(calls[2].options.accessToken,'existing');
  await assert.rejects(c.requestCloudEmailChange('bad-address'),/valid email/);
  await assert.rejects(c.requestCloudEmailChange('old@example.com'),/already/);
});
test('reauthentication only sends code when server requires it; nonce retries the password update',async () => {
  const {c,calls} = harness();
  const session = {access_token:'test'};
  c.supabaseAuthFetch = async (path,options) => {
    calls.push({path,options});
    if (path === '/auth/v1/user' && !options.body.nonce) throw Object.assign(new Error('Verify identity'),{code:'reauthentication_needed'});
    return {id:'user'};
  };
  await c.submitCloudPasswordUpdate(session,'test-password');
  assert.equal(calls[1].path,'/auth/v1/reauthenticate');
  assert.equal(calls[1].options.method,'GET');
  assert.equal(c.runtime.cloudReauth.password,'test-password');
  await c.submitCloudPasswordUpdate(session,'test-password','123456');
  assert.equal(calls[2].options.body.nonce,'123456');
  assert.equal(c.runtime.cloudReauth,null);
  assert.equal(c.runtime.cloudAuthScreen.title,'Password Changed');
  assert.match(c.getCloudAuthErrorMessage({code:'reauthentication_not_valid'}),/incorrect or expired/);
  assert.match(c.getCloudAuthErrorMessage({status:429}),/wait/);
});
test('startup request guard ignores duplicate actions and unlocks on completion',async () => {
  const {c} = harness();
  let resolve, count = 0;
  const first = c.runStartupAuthAction(() => {count++;return new Promise(r=>{resolve=r;});});
  await c.runStartupAuthAction(() => {count++;});
  assert.equal(count,1);
  resolve(); await first;
  assert.equal(c.runtime.cloudStartupAuthBusy,false);
});
test('email change card handles duplicate submits, errors, and inline secure-change instructions',async () => {
  const {c} = harness();
  let resolve, count = 0;
  const status = {textContent:''}, button = {disabled:false};
  const panel = {querySelector: sel => ({'[data-cloud-email-status]':status,'[data-cloud-settings-change-email]':button,'[data-cloud-settings-new-email]':{value:'new@example.com'}}[sel] || null)};
  c.Element = class {};
  const target = new c.Element();
  target.closest = sel => sel === '[data-cloud-account-panel]' ? panel : sel === '[data-cloud-settings-change-email]' ? button : null;
  c.requestCloudEmailChange = () => {count++;return new Promise(r=>{resolve=r;});};
  const first = c.handleCloudSettingsClick({target});
  await c.handleCloudSettingsClick({target});
  assert.equal(count,1); assert.equal(button.disabled,true);
  resolve(); await first;
  assert.equal(button.disabled,false);
  assert.match(status.textContent,/new@example.com/); assert.match(status.textContent,/current email/);
  c.requestCloudEmailChange = async () => {throw Object.assign(new Error('limited'),{status:429});};
  await c.handleCloudSettingsClick({target});
  assert.match(status.textContent,/wait/); assert.equal(button.disabled,false);
});
