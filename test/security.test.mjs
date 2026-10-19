import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, mkdirSync, unlinkSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { withWriteGate, buildConfirmPrompt } from '../instagram-mcp/dist/src/mcp/write-mode.js';
import { buildUrl } from '../instagram-mcp/dist/src/core/host.js';
import { writeCredentials } from '../instagram-mcp/dist/src/core/config-write.js';
import { selectPackages, buildManifest } from '../instagram-mcp/dist/src/mcp/registry.js';
import { allTools } from '../instagram-mcp/dist/src/tools/index.js';
import { commentsTools } from '../instagram-mcp/dist/src/tools/comments.js';
import { startHttp } from '../instagram-mcp/dist/src/mcp/transport.js';
import { authorize, createWriteGate } from '../facebook-mcp/build/mcp/write-mode.js';
import { createConfirmer } from '../facebook-mcp/build/mcp/confirm.js';
import { DEFAULT_PROFILE_PACKAGES } from '../facebook-mcp/build/mcp/packages.js';
import { readCappedResponse, MAX_RESPONSE_BYTES } from '../facebook-mcp/build/core/response-body.js';
import { resolveLocalMediaPath, readLocalPhoto } from '../facebook-mcp/build/api/media-photos.js';
import { parseSetupTokenArgs } from '../facebook-mcp/build/mcp/setup-token.js';

// These tests use actual compiled gate/tool modules, fake Meta callbacks and synthetic secrets.
globalThis.fetch = async () => { throw new Error('Live networking is forbidden in security tests'); };
const dir = mkdtempSync(join(tmpdir(), 'secure-meta-tests-'));
after(() => {
  const target = resolve(dir), allowed = resolve(tmpdir()) + sep;
  assert.ok(target.startsWith(allowed) && target.slice(allowed.length).startsWith('secure-meta-tests-'));
  rmSync(target, { recursive: true, force: true });
});
let serial = 0;
const log = { debug() {}, info() {}, warn() {}, error() {} };
const yes = { isSupported: () => true, ask: async () => ({ action: 'accept', content: { confirm: true } }) };
function context(extra = {}) {
  return {
    profile: { name: 'synthetic', authPath: 'ig-login', accountId: '123', accessToken: 'SYNTHETIC_TEST_TOKEN' },
    settings: { writeMode: 'preview', allowDestructive: false, prettyJson: false, writeJournal: join(dir, `journal-${++serial}.jsonl`) },
    clock: { now: () => Date.now() }, log, confirm: yes, ...extra,
  };
}
const intent = { action: 'synthetic_write', summary: 'Synthetic write', details: { mediaId: '123' } };
const fakeResult = { content: [{ type: 'text', text: '{"status":"synthetic_success"}' }], structuredContent: { status: 'synthetic_success' } };
function gate(extra = {}) {
  return createWriteGate({ clock: { now: () => Date.now() }, journal: { append: async () => 'ok' }, defaultWriteMode: 'plan', confirmer: { confirm: async () => ({ confirmed: true, method: 'elicitation' }) }, ...extra });
}
const action = () => ({ tool: 'synthetic_action', tier: 'reversible', pageId: '123', params: { message: 'synthetic message' }, summary: 'Synthetic operation', perform: async () => ({ id: '99' }) });

test('Instagram defaults to a read-only reader profile', () => {
  const selected = selectPackages(buildManifest(allTools), {});
  assert.ok(!selected.active.has('publishing'));
  for (const pkg of selected.active) assert.ok(selected.readonly.has(pkg));
});
test('Facebook default profile excludes all write packages', () => {
  assert.deepEqual([...DEFAULT_PROFILE_PACKAGES], ['core', 'reader', 'insights']);
});
for (const supplied of [undefined, false]) {
  test(`Instagram ${String(supplied)} cannot be overridden by global apply`, async () => {
    let writes = 0; const ctx = context(); ctx.settings.writeMode = 'apply'; ctx.settings.allowDestructive = true;
    await withWriteGate({ ...intent, destructive: true }, { ...(supplied !== undefined ? { apply: supplied } : {}) }, ctx, async () => { writes++; return { result: fakeResult }; });
    assert.equal(writes, 0);
  });
}
for (const confirmer of [undefined, { isSupported: () => false }, { isSupported: () => true, ask: async () => { throw new Error('offline'); } }, { isSupported: () => true, ask: async () => ({ action: 'decline' }) }]) {
  test('Instagram missing/unsupported/failed/declined approval refuses before mutation', async () => {
    let writes = 0;
    const result = await withWriteGate(intent, { apply: true }, context({ confirm: confirmer }), async () => { writes++; return { result: fakeResult }; });
    assert.equal(writes, 0); assert.equal(JSON.parse(result.content[0].text).mode, 'refused');
  });
}
test('Instagram approval includes the entire actual reply, not just its target ID', async () => {
  const message = 'A'.repeat(400) + 'END_OF_ACTUAL_REPLY'; let prompt, sent;
  const ctx = context({ confirm: { isSupported: () => true, ask: async p => { prompt = p; return { action: 'accept', content: { confirm: true } }; } }, req: async opts => { sent = opts.body.message; return { id: '456' }; } });
  await commentsTools.find(t => t.name === 'instagram_reply_to_comment').handler({ commentId: '123', message, apply: true }, ctx);
  assert.equal(sent, message); assert.ok(prompt.message.includes(message));
});
test('Instagram full parameters are not silently truncated in the approval UI', () => {
  assert.throws(() => buildConfirmPrompt({ ...intent, details: { request: 'X'.repeat(70_000) } }, context()), /too large/);
});
test('Instagram approved writes have durable intent and outcome records', async () => {
  const ctx = context(); let writes = 0;
  const result = await withWriteGate(intent, { apply: true, message: 'synthetic' }, ctx, async () => {
    const before = readFileSync(ctx.settings.writeJournal, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(before[0].phase, 'authorized'); writes++; return { result: fakeResult, targetId: '456' };
  });
  const records = readFileSync(ctx.settings.writeJournal, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(writes, 1); assert.deepEqual(records.map(r => r.phase), ['authorized', 'completed']);
  assert.equal(records[0].attemptId, records[1].attemptId); assert.equal(JSON.parse(result.content.at(-1).text).audit.status, 'ok');
});
test('Instagram refuses a mutation if intent audit cannot be written', async () => {
  const ctx = context(); ctx.settings.writeJournal = dir; let writes = 0;
  const result = await withWriteGate(intent, { apply: true }, ctx, async () => { writes++; return { result: fakeResult }; });
  assert.equal(writes, 0); assert.equal(JSON.parse(result.content[0].text).mode, 'refused');
});
test('Instagram outcome audit failure is explicit and never causes a second mutation', async () => {
  const ctx = context(); let writes = 0;
  const result = await withWriteGate(intent, { apply: true }, ctx, async () => {
    writes++; unlinkSync(ctx.settings.writeJournal); mkdirSync(ctx.settings.writeJournal); return { result: fakeResult };
  });
  assert.equal(writes, 1); assert.equal(result.structuredContent.status, 'synthetic_success');
  assert.equal(JSON.parse(result.content.at(-1).text).audit.status, 'failed');
});
test('Instagram credential files require a deliberate plaintext-storage opt-in', async () => {
  await assert.rejects(writeCredentials('default', { accessToken: 'SYNTHETIC' }, { env: {} }), /Plaintext credential persistence is disabled/);
});
test('Facebook setup-token does not persist plaintext credentials by default', () => {
  assert.equal(parseSetupTokenArgs([], {}).write, false);
});
test('Instagram rejects unapproved Graph destinations and URL restructuring', () => {
  for (const host of ['evil.example', '127.0.0.1', 'graph.instagram.com.evil.example']) assert.throws(() => buildUrl(host, '/me'));
  assert.throws(() => buildUrl('graph.instagram.com', '/../me'));
  assert.throws(() => buildUrl('graph.instagram.com', '/me?access_token=evil'));
});
for (const tier of ['safe', 'reversible', 'irreversible', 'spend']) {
  test(`Facebook ${tier}: false/missing apply and missing plan always preview`, () => {
    assert.equal(authorize({ tier, apply: false, defaultWriteMode: 'apply', planId: '123' }).mode, 'plan');
    assert.equal(authorize({ tier, defaultWriteMode: 'apply', planId: '123' }).mode, 'plan');
    assert.equal(authorize({ tier, apply: true, defaultWriteMode: 'apply' }).mode, 'plan');
  });
}
test('Facebook reusable confirmation passwords cannot authorize a write', async () => {
  const c = createConfirmer({ settings: { confirmToken: 'SYNTHETIC_CONFIRM_PASSWORD' }, resolveOperatorToken: () => 'SYNTHETIC_CONFIRM_PASSWORD' });
  assert.equal((await c.confirm({ tool: 'synthetic', tier: 'spend', summary: 'test', reason: 'test' }, 'SYNTHETIC_CONFIRM_PASSWORD')).confirmed, false);
});
test('Facebook failed elicitation cannot fall back to a password', async () => {
  const c = createConfirmer({ settings: { confirmToken: 'SYNTHETIC' }, elicit: async () => { throw new Error('not supported'); } });
  assert.equal((await c.confirm({ tool: 'synthetic', tier: 'spend', summary: 'test', reason: 'test' }, 'SYNTHETIC')).confirmed, false);
});
test('Facebook even reversible writes require confirmation of complete parameters', async () => {
  let writes = 0, asked; const records = [];
  const g = gate({ confirmer: { confirm: async r => { asked = r; return { confirmed: true, method: 'elicitation' }; } }, journal: { append: async r => { records.push(r); return 'ok'; } } });
  const a = { ...action(), params: { message: 'X'.repeat(400) + 'END_OF_FULL_TEXT' }, perform: async () => { assert.equal(records[0].metadata.phase, 'authorized'); writes++; return {}; } };
  const preview = await g.execute(a); await g.execute({ ...a, apply: true, planId: preview.preview.planId });
  assert.equal(writes, 1); assert.ok(asked.summary.includes('END_OF_FULL_TEXT')); assert.ok(asked.summary.includes(a.params.message));
});
test('Facebook failed audit intent refuses before a network mutation', async () => {
  let writes = 0; const g = gate({ journal: { append: async () => 'failed' } });
  const a = { ...action(), perform: async () => { writes++; return {}; } }; const p = await g.execute(a);
  await assert.rejects(g.execute({ ...a, apply: true, planId: p.preview.planId }), /audit intent/); assert.equal(writes, 0);
});
test('Facebook refuses changed parameters and prevents plan reuse', async () => {
  const g = gate(), a = action(); const p = await g.execute(a);
  await assert.rejects(g.execute({ ...a, params: { message: 'changed' }, apply: true, planId: p.preview.planId }), /params differ/);
  await g.execute({ ...a, apply: true, planId: p.preview.planId });
  await assert.rejects(g.execute({ ...a, apply: true, planId: p.preview.planId }), /no such plan_id/);
});
test('Facebook detects changes made while the operator reads the approval', async () => {
  let state = 1, writes = 0; const g = gate({ confirmer: { confirm: async () => { state = 2; return { confirmed: true, method: 'elicitation' }; } } });
  const a = { ...action(), readState: async () => ({ budget: state }), perform: async () => { writes++; return {}; } };
  const p = await g.execute(a); const r = await g.execute({ ...a, apply: true, planId: p.preview.planId });
  assert.equal(writes, 0); assert.equal(r.result.applied, false);
});
test('Facebook response reader caps both announced and streaming body sizes', async () => {
  await assert.rejects(readCappedResponse(new Response('x', { headers: { 'content-length': String(MAX_RESPONSE_BYTES + 1) } })), /5 MiB/);
  await assert.rejects(readCappedResponse(new Response(new Uint8Array(MAX_RESPONSE_BYTES + 1))), /5 MiB/);
  assert.equal(await readCappedResponse(new Response('{"ok":true}')), '{"ok":true}');
});
test('Facebook current local reader refuses traversal outside the allowed directory', async () => {
  const media = join(dir, 'media'); mkdirSync(media); writeFileSync(join(dir, 'outside.jpg'), 'synthetic');
  await assert.rejects(resolveLocalMediaPath('../outside.jpg', { mediaDir: media }), /outside/);
  writeFileSync(join(media, 'inside.jpg'), Buffer.from([255, 216, 255, 0]));
  const item = await readLocalPhoto('inside.jpg', { mediaDir: media }); assert.equal(item.bytes, 4);
});
test('Instagram no longer reads ambient project .env files', () => {
  const source = readFileSync(new URL('../instagram-mcp/src/index.ts', import.meta.url), 'utf8');
  assert.ok(!source.includes("path.resolve(process.cwd(), '.env')"));
});

for (const options of [
  { host: '127.0.0.1', port: 0 },
  { host: 'localhost', port: 0, token: 'short' },
  { host: '0.0.0.0', port: 0, token: 'x'.repeat(32) },
]) {
  test('Instagram refuses unsafe HTTP options before starting a listener', async () => {
    let created = false;
    await assert.rejects(startHttp(() => { created = true; throw new Error('unreachable'); }, options, log), /HTTP/);
    assert.equal(created, false);
  });
}
