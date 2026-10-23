// End-to-end tests of the database API through PostgREST and the real supabase-js client.
// Run against the local test stack:
//   ./supabase/tests/reset_local.sh && ./supabase/tests/local_api.sh &   then   node --test supabase/tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.TEST_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const SECRET = process.env.PGRST_JWT_SECRET ?? 'golden-bloom-local-test-secret-0123456789'
const MOD_CODE = 'local-test-code'

function anonJwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64({ role: 'anon', iss: 'supabase', exp: Math.floor(Date.now() / 1000) + 3600 })
  const sig = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}

// Each "browser" gets its own fake IP so the per-IP join limit can be tested.
function client(ip = '10.0.0.1') {
  return createClient(URL, anonJwt(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-test-ip': ip } },
  })
}

const sb = client()

async function rpc(fn, args = {}, c = sb) {
  const { data, error } = await c.rpc(fn, args)
  if (error) {
    const err = new Error(error.message)
    err.code = error.code
    throw err
  }
  return data
}

async function rejects(promise, message) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.message, message)
    return true
  })
}

let n = 0
const letters = (i) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? letters(Math.floor(i / 26) - 1) : '')
const PASSWORD = 'sunny-day-77'

// every call gets its own last name ("Tester" + letters), so names never collide between tests
function newName(first, last) {
  n += 1
  return { p_first_name: first, p_last_name: last ?? `Tester${letters(n)}`, p_age: 15, p_gender: 'girl', p_password: PASSWORD }
}

async function join(name = 'Mel', extra = {}) {
  const res = await rpc('sign_up', { ...newName(name), ...extra })
  return res.key
}

test('the garden starts with the class notes, most loved first', async () => {
  const stats = await rpc('garden_stats')
  assert.equal(stats.notes, 12)
  const loved = await rpc('list_notes', { p_sort: 'loved', p_limit: 3 })
  assert.equal(loved.length, 3)
  assert.equal(loved[0].author, 'Lyana')
  assert.equal(loved[0].hearts, 42)
  assert.equal(loved[0].liked, false)
  assert.equal(loved[0].mine, false)
  assert.ok(!('author_id' in loved[0]))
  const latest = await rpc('list_notes', { p_sort: 'new', p_limit: 1 })
  assert.equal(latest[0].author, 'Béatrice')
  const mirror = await rpc('list_notes', { p_category: 'mirror_talk' })
  assert.deepEqual(mirror.map((x) => x.author).sort(), ['Isaac', 'Lyana'])
  const page2 = await rpc('list_notes', { p_sort: 'loved', p_limit: 5, p_offset: 5 })
  assert.equal(page2[0].author, 'Victoria')
})

test('joining checks names, age, gender and password', async () => {
  const bad = (extra) => rpc('sign_up', { ...newName('Mel'), ...extra })
  await rejects(bad({ p_first_name: '  ' }), 'invalid_name')
  await rejects(bad({ p_first_name: 'Mel123' }), 'invalid_name')
  await rejects(bad({ p_first_name: 'A'.repeat(25) }), 'invalid_name')
  await rejects(bad({ p_first_name: 'Bitch' }), 'unkind_name')
  await rejects(bad({ p_last_name: '' }), 'invalid_last_name')
  await rejects(bad({ p_last_name: 'Smith99' }), 'invalid_last_name')
  await rejects(bad({ p_last_name: 'Fuck' }), 'unkind_name')
  await rejects(bad({ p_age: 9 }), 'invalid_age')
  await rejects(bad({ p_age: 100 }), 'invalid_age')
  await rejects(bad({ p_gender: 'cat' }), 'invalid_gender')
  await rejects(bad({ p_password: 'short' }), 'weak_password')
  await rejects(bad({ p_password: '123456' }), 'weak_password')
  await rejects(bad({ p_first_name: 'Charlotte', p_password: 'charlotte' }), 'weak_password')
  for (const name of ['Zoé', 'Théo', 'Marie-Lou', "D'Arcy", 'Łucja', 'Anne Sophie']) {
    const res = await rpc('sign_up', { ...newName(name), p_age: 16, p_gender: 'prefer_not_to_say' })
    assert.equal(res.member.first_name, name)
  }
  const res = await rpc('sign_up', newName('  Mélanie  ', 'Dupont'))
  assert.match(res.key, /^gb_[0-9a-f]{64}$/)
  assert.equal(res.member.first_name, 'Mélanie')
  assert.equal(res.member.last_name, 'Dupont')
  assert.equal(res.member.display_name, 'Mélanie D.')
  assert.equal(res.member.is_moderator, false)
  assert.ok(!JSON.stringify(res).includes(PASSWORD), 'the password never comes back')
  const me = await rpc('me', { p_key: res.key })
  assert.equal(me.first_name, 'Mélanie')
  assert.equal(me.age, 15)
  await rejects(rpc('me', { p_key: 'gb_' + '0'.repeat(64) }), 'not_a_member')
  await rejects(rpc('me', { p_key: 'short' }), 'not_a_member')
})

test('two people cannot share a name, accents and spacing do not matter', async () => {
  await rpc('sign_up', newName('Camille', 'Durand'))
  await rejects(rpc('sign_up', newName('camille', 'DURAND')), 'name_taken')
  await rejects(rpc('sign_up', newName('Cámille', 'Durand')), 'name_taken')
  await rpc('sign_up', newName('Marie Lou', 'Petit'))
  await rejects(rpc('sign_up', newName('Marie-Lou', 'Petit')), 'name_taken')
  // a second Camille Durand adds a detail to the last name
  const other = await rpc('sign_up', newName('Camille', 'Durand B'))
  assert.equal(other.member.display_name, 'Camille D.')
})

test('logging in from another device with first name, last name and password', async () => {
  const first = await rpc('sign_up', newName('Nina', 'Laurent'))
  const note = await rpc('post_note', { p_key: first.key, p_category: 'mirror_talk', p_body: 'You are doing better than you think.' })
  assert.equal(note.author, 'Nina L.')

  const login = await rpc('log_in', { p_first_name: ' nina ', p_last_name: 'LAURENT', p_password: PASSWORD })
  assert.equal(login.ok, true)
  assert.match(login.key, /^gb_[0-9a-f]{64}$/)
  assert.notEqual(login.key, first.key)
  assert.equal(login.member.display_name, 'Nina L.')
  // both devices work, and the second one sees the first one's notes
  assert.equal((await rpc('me', { p_key: first.key })).id, login.member.id)
  assert.equal((await rpc('my_notes', { p_key: login.key })).length, 1)

  for (const wrong of [
    { p_first_name: 'Nina', p_last_name: 'Laurent', p_password: 'wrong-password' },
    { p_first_name: 'Nina', p_last_name: 'Nobody', p_password: PASSWORD },
    { p_first_name: 'Nina', p_last_name: 'Laurent', p_password: '' },
  ]) {
    const res = await rpc('log_in', wrong)
    assert.deepEqual(res, { ok: false, error: 'wrong_login' }, 'the same answer for a wrong password and an unknown name')
  }
})

test('wrong passwords are limited, per name', async () => {
  await rpc('sign_up', newName('Olivia', 'Bernard'))
  const guess = (password, last = 'Bernard') => rpc('log_in', { p_first_name: 'Olivia', p_last_name: last, p_password: password })
  for (let i = 0; i < 8; i += 1) assert.equal((await guess(`guess-number-${i}`)).error, 'wrong_login')
  await rejects(guess('guess-number-9'), 'slow_down')
  await rejects(guess(PASSWORD), 'slow_down')
  // someone else is not affected
  await rpc('sign_up', newName('Olivia', 'Bernardo'))
  assert.equal((await guess(PASSWORD, 'Bernardo')).ok, true)
})

test('changing a password keeps this device and checks the old one', async () => {
  const me = await rpc('sign_up', newName('Paul', 'Garnier'))
  const other = await rpc('log_in', { p_first_name: 'Paul', p_last_name: 'Garnier', p_password: PASSWORD })
  assert.deepEqual(await rpc('change_password', { p_key: me.key, p_old_password: 'not-my-password', p_new_password: 'brand-new-pass' }), { ok: false, error: 'wrong_password' })
  await rejects(rpc('change_password', { p_key: me.key, p_old_password: PASSWORD, p_new_password: 'abc' }), 'weak_password')
  assert.deepEqual(await rpc('change_password', { p_key: me.key, p_old_password: PASSWORD, p_new_password: 'brand-new-pass' }), { ok: true })
  assert.equal((await rpc('log_in', { p_first_name: 'Paul', p_last_name: 'Garnier', p_password: PASSWORD })).ok, false)
  assert.equal((await rpc('log_in', { p_first_name: 'Paul', p_last_name: 'Garnier', p_password: 'brand-new-pass' })).ok, true)
  assert.equal((await rpc('me', { p_key: me.key })).first_name, 'Paul')
  assert.equal((await rpc('me', { p_key: other.key })).first_name, 'Paul')
})

test('posting a note: categories, length, kind words, personal info', async () => {
  const key = await join('Ines')
  const post = (body, extra = {}) => rpc('post_note', { p_key: key, p_category: 'confidence_boost', p_body: body, ...extra })
  await rejects(rpc('post_note', { p_key: key, p_category: 'nope', p_body: 'hello there' }), 'invalid_category')
  await rejects(post('hi'), 'too_short')
  await rejects(post('x'.repeat(281)), 'too_long')
  for (const mean of ["you're a b1tch", 'f u c k this', 'fuuuuck', 'SHIT!', 'ta gueule', 'kys', 'go die', 'espèce de connard', 'sale pute']) {
    await rejects(post(mean), 'unkind_words')
  }
  for (const contact of ['text me 06 12 34 56 78', 'add me insta: mel.lou', 'follow @mel_lou', 'www.example.com', 'go to mysite.com', 'mel@example.com']) {
    await rejects(post(contact), 'personal_info')
  }
  // words that are often unkind need a second "yes, it's kind"
  await rejects(post("You're not ugly, you're stunning"), 'please_confirm')
  const reviewed = await post("You're not ugly, you're stunning", { p_confirm: true })
  assert.equal(reviewed.author, 'Ines T.')
  // innocent words that contain blocked ones must pass
  for (const fine of ['You are a class act, truly', 'Your passion is contagious', 'You make Scunthorpe proud', 'Cocktails of joy for you', 'Dickens would write a novel about your smile']) {
    const note = await post(fine)
    assert.equal(note.body, fine)
  }
})

test('starred-out swear words are caught, starred kind words are not', async () => {
  const key = await join('Lou')
  const post = (body) => rpc('post_note', { p_key: key, p_category: 'bad_day_comfort', p_body: body })
  for (const mean of ['f*ck this day', 'you are such a b**ch', 'what a sh#t day']) {
    await rejects(post(mean), 'unkind_words')
  }
  for (const fine of ['*hugs* for you today', 'You are a *star*, always', 'C# and F# are both lovely notes, like you']) {
    const note = await post(fine)
    assert.equal(note.body, fine)
  }
})

test('rate limits and duplicates', async () => {
  const key = await join('Rose')
  const post = (body) => rpc('post_note', { p_key: key, p_category: 'mirror_talk', p_body: body })
  await post('You are enough, today and every day')
  await rejects(post('you are enough, today and every day'), 'duplicate')
  for (let i = 0; i < 5; i += 1) await post(`Kind note number ${i + 1} for you`)
  await rejects(post('One more kind note for you'), 'slow_down')
})

test('anonymous notes never reveal their author', async () => {
  const key = await join('Secret')
  const note = await rpc('post_note', {
    p_key: key,
    p_category: 'from_me_to_you',
    p_body: 'Whoever reads this: you matter more than you know.',
    p_recipient: '  anyone who needs it ',
    p_paper: 'sky',
  })
  assert.equal(note.author, null)
  assert.equal(note.recipient, 'anyone who needs it')
  assert.equal(note.paper, 'sky')
  assert.equal(note.mine, true)
  const seenByOthers = await rpc('get_note', { p_note_id: note.id })
  assert.equal(seenByOthers.author, null)
  assert.equal(seenByOthers.mine, false)
  assert.equal(seenByOthers.status, null)
  assert.deepEqual(Object.keys(seenByOthers).sort(), ['author', 'body', 'category', 'created_at', 'hearts', 'id', 'is_seed', 'liked', 'mine', 'paper', 'recipient', 'shares', 'status'])
  // a recipient line is ignored outside From Me To You
  const signed = await rpc('post_note', { p_key: key, p_category: 'bad_day_comfort', p_body: 'Tomorrow is a fresh page.', p_recipient: 'Sam' })
  assert.equal(signed.recipient, null)
  assert.equal(signed.author, 'Secret T.')
})

test('hearts and shares', async () => {
  const key = await join('Lou')
  const [top] = await rpc('list_notes', { p_sort: 'loved', p_limit: 1 })
  let res = await rpc('toggle_like', { p_key: key, p_note_id: top.id })
  assert.deepEqual(res, { liked: true, hearts: top.hearts + 1 })
  const again = await rpc('get_note', { p_key: key, p_note_id: top.id })
  assert.equal(again.liked, true)
  const loved = await rpc('loved_notes', { p_key: key })
  assert.equal(loved[0].id, top.id)
  res = await rpc('toggle_like', { p_key: key, p_note_id: top.id })
  assert.deepEqual(res, { liked: false, hearts: top.hearts })
  await rejects(rpc('toggle_like', { p_key: null, p_note_id: top.id }), 'not_a_member')

  const s1 = await rpc('record_share', { p_key: key, p_note_id: top.id })
  const s2 = await rpc('record_share', { p_key: key, p_note_id: top.id })
  assert.equal(s1.shares, 1)
  assert.equal(s2.shares, 1)
  const visitor = await rpc('record_share', { p_note_id: top.id })
  assert.equal(visitor.shares, 1)
})

test('three reports hide a note, a moderator can keep or remove it', async () => {
  const author = await join('Max', { p_gender: 'boy' })
  const note = await rpc('post_note', { p_key: author, p_category: 'confidence_boost', p_body: 'Someone will report this note' })
  // reporting your own note does nothing
  await rpc('report_note', { p_key: author, p_note_id: note.id, p_reason: 'mean' })
  const r1 = await join('Ana')
  const r2 = await join('Bea')
  const r3 = await join('Cleo')
  let res = await rpc('report_note', { p_key: r1, p_note_id: note.id, p_reason: 'mean' })
  assert.equal(res.hidden, false)
  await rpc('report_note', { p_key: r1, p_note_id: note.id, p_reason: 'mean' }) // counted once
  await rpc('report_note', { p_key: r2, p_note_id: note.id, p_reason: 'body_shaming' })
  res = await rpc('report_note', { p_key: r3, p_note_id: note.id, p_reason: 'spam' })
  assert.equal(res.hidden, true)
  assert.equal(await rpc('get_note', { p_note_id: note.id }), null)
  const own = await rpc('get_note', { p_key: author, p_note_id: note.id })
  assert.equal(own.status, 'hidden')
  const all = await rpc('list_notes', { p_limit: 60 })
  assert.ok(!all.some((x) => x.id === note.id))

  // moderators
  const mod = await join('Mod')
  await rejects(rpc('moderation_queue', { p_key: mod }), 'not_allowed')
  assert.deepEqual(await rpc('claim_moderator', { p_key: mod, p_code: 'nope' }), { ok: false, error: 'wrong_code' })
  const claimed = await rpc('claim_moderator', { p_key: mod, p_code: ` ${MOD_CODE} ` })
  assert.equal(claimed.ok, true)
  assert.equal(claimed.member.is_moderator, true)
  let queue = await rpc('moderation_queue', { p_key: mod })
  const item = queue.find((x) => x.id === note.id)
  assert.equal(item.status, 'hidden')
  assert.equal(item.reports, 3)
  assert.deepEqual(item.reasons, { mean: 1, body_shaming: 1, spam: 1 })
  assert.ok(queue.some((x) => x.needs_review), 'notes with review words are listed')

  assert.equal(await rpc('moderate_note', { p_key: mod, p_note_id: note.id, p_action: 'keep' }), true)
  assert.equal((await rpc('get_note', { p_note_id: note.id })).id, note.id)
  const r4 = await join('Dee')
  res = await rpc('report_note', { p_key: r4, p_note_id: note.id, p_reason: 'mean' })
  assert.equal(res.hidden, false, 'a note kept by a moderator is not hidden again automatically')
  queue = await rpc('moderation_queue', { p_key: mod })
  assert.ok(!queue.some((x) => x.id === note.id))

  assert.equal(await rpc('moderate_note', { p_key: mod, p_note_id: note.id, p_action: 'remove' }), true)
  assert.equal(await rpc('get_note', { p_note_id: note.id }), null)
  assert.equal(await rpc('get_note', { p_key: author, p_note_id: note.id }), null)
  await rejects(rpc('moderate_note', { p_key: r1, p_note_id: note.id, p_action: 'keep' }), 'not_allowed')
})

test('moderator code attempts are limited', async () => {
  const key = await join('Guess')
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await rpc('claim_moderator', { p_key: key, p_code: `guess${i}` })).error, 'wrong_code')
  }
  await rejects(rpc('claim_moderator', { p_key: key, p_code: MOD_CODE }), 'slow_down')
})

test('deleting notes and leaving the garden', async () => {
  const key = await join('Temp')
  const other = await join('Other')
  const note = await rpc('post_note', { p_key: key, p_category: 'you_are_not_alone', p_body: 'We are all figuring it out together.' })
  await rejects(rpc('delete_note', { p_key: other, p_note_id: note.id }), 'not_allowed')
  const [top] = await rpc('list_notes', { p_sort: 'loved', p_limit: 1 })
  await rpc('toggle_like', { p_key: key, p_note_id: top.id })
  const mine = await rpc('my_notes', { p_key: key })
  assert.equal(mine.length, 1)
  assert.equal(mine[0].status, 'visible')
  const profile = await rpc('me', { p_key: key })
  assert.equal(profile.notes, 1)
  assert.equal(profile.hearts_given, 1)
  assert.equal(await rpc('leave_garden', { p_key: key }), true)
  await rejects(rpc('me', { p_key: key }), 'not_a_member')
  assert.equal(await rpc('get_note', { p_note_id: note.id }), null)
  const after = await rpc('get_note', { p_note_id: top.id })
  assert.equal(after.hearts, top.hearts, 'the heart left with the member')
  const del = await rpc('post_note', { p_key: other, p_category: 'you_are_not_alone', p_body: 'Taking this one back.' })
  assert.equal(await rpc('delete_note', { p_key: other, p_note_id: del.id }), true)
})

test('editing your profile renames your signed notes only', async () => {
  const key = await join('Old')
  const signed = await rpc('post_note', { p_key: key, p_category: 'mirror_talk', p_body: 'Be gentle with yourself today.' })
  const anon = await rpc('post_note', { p_key: key, p_category: 'from_me_to_you', p_body: 'You light up every room.' })
  const me = await rpc('update_profile', { p_key: key, p_first_name: 'New', p_last_name: 'Surname', p_age: 17, p_gender: 'non_binary' })
  assert.equal(me.first_name, 'New')
  assert.equal(me.gender, 'non_binary')
  assert.equal((await rpc('get_note', { p_note_id: signed.id })).author, 'New S.')
  assert.equal((await rpc('get_note', { p_note_id: anon.id })).author, null)
  await rejects(rpc('update_profile', { p_key: key, p_first_name: 'Connard', p_last_name: 'Surname', p_age: 17, p_gender: 'boy' }), 'unkind_name')
  // a name that is already taken
  const taken = await rpc('sign_up', newName('Taken', 'Name'))
  await rejects(rpc('update_profile', { p_key: key, p_first_name: 'taken', p_last_name: 'name', p_age: 17, p_gender: 'boy' }), 'name_taken')
  assert.ok(taken.key)
  // the new name is the one to log in with
  assert.equal((await rpc('log_in', { p_first_name: 'New', p_last_name: 'Surname', p_password: PASSWORD })).ok, true)
})

test('moderators can reset a forgotten password', async () => {
  const mod = await join('Helper')
  await rpc('claim_moderator', { p_key: mod, p_code: MOD_CODE })
  const lost = await rpc('sign_up', newName('Quinn', 'Forgetful'))
  const plain = await join('Plain')
  await rejects(rpc('reset_password', { p_key: plain, p_first_name: 'Quinn', p_last_name: 'Forgetful' }), 'not_allowed')
  assert.deepEqual(await rpc('reset_password', { p_key: mod, p_first_name: 'Nobody', p_last_name: 'Here' }), { ok: false, error: 'not_found' })
  const res = await rpc('reset_password', { p_key: mod, p_first_name: 'quinn', p_last_name: 'forgetful' })
  assert.equal(res.ok, true)
  assert.equal(res.name, 'Quinn F.')
  assert.match(res.temp_password, /^[a-z2-9]{8}$/)
  await rejects(rpc('me', { p_key: lost.key }), 'not_a_member')
  assert.equal((await rpc('log_in', { p_first_name: 'Quinn', p_last_name: 'Forgetful', p_password: PASSWORD })).ok, false)
  const back = await rpc('log_in', { p_first_name: 'Quinn', p_last_name: 'Forgetful', p_password: res.temp_password })
  assert.equal(back.ok, true)
  assert.equal(back.member.display_name, 'Quinn F.')
})

test('the old sign-up without a password is switched off', async () => {
  const { error } = await sb.rpc('join_garden', { p_first_name: 'Sneaky', p_age: 15, p_gender: 'girl' })
  assert.ok(error)
})

test('random note never picks your own', async () => {
  const key = await join('Solo')
  const mine = await rpc('post_note', { p_key: key, p_category: 'you_are_not_alone', p_body: 'You are never really alone.' })
  for (let i = 0; i < 15; i += 1) {
    const pick = await rpc('random_note', { p_key: key, p_category: 'you_are_not_alone' })
    assert.ok(pick === null || pick.id !== mine.id)
  }
  const any = await rpc('random_note', {})
  assert.ok(any.id)
  const other = await rpc('random_note', { p_exclude: any.id, p_category: any.category })
  assert.ok(other === null || other.id !== any.id)
})

test('the API exposes nothing but the functions', async () => {
  const res = await fetch(`${URL}/rest/v1/notes?select=*`, { headers: { apikey: anonJwt(), Authorization: `Bearer ${anonJwt()}` } })
  assert.ok(res.status === 404 || res.status === 400, `tables are not reachable (got ${res.status})`)
  const priv = await sb.rpc('fail', { p_code: 'x' })
  assert.ok(priv.error)
  const card = await sb.rpc('card', {})
  assert.ok(card.error)
})

test('too many joins from one network slow down', async () => {
  const c = client('10.9.9.9')
  for (let i = 0; i < 60; i += 1) {
    await rpc('sign_up', newName('Classmate'), c)
  }
  await rejects(rpc('sign_up', newName('Late'), c), 'slow_down')
  // another network is not affected
  const other = await rpc('sign_up', { ...newName('Elsewhere'), p_gender: 'boy' }, client('10.8.8.8'))
  assert.ok(other.key)
})
