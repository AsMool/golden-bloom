// Prints a key for the local test API (the "anon" role, signed with the local test secret).
import { createHmac } from 'node:crypto'

const secret = process.env.PGRST_JWT_SECRET ?? 'golden-bloom-local-test-secret-0123456789'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const head = b64({ alg: 'HS256', typ: 'JWT' })
const body = b64({ role: 'anon', iss: 'local', exp: Math.floor(Date.now() / 1000) + 86400 })
const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
console.log(`${head}.${body}.${sig}`)
