import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pbkdf2Sync} from 'node:crypto';
import {verifyPassword,sessionCookie,authorized} from '../app/admin/security.ts';
test('Password verification rejects incorrect and malformed credentials',async()=>{
const salt='test-salt';const hash=pbkdf2Sync('test-password',salt,100000,32,'sha256').toString('hex');
assert.equal(await verifyPassword('test-password',salt+':'+hash),true);
assert.equal(await verifyPassword('wrong',salt+':'+hash),false);
assert.equal(await verifyPassword('anything',''),false);
});
test('Production sessions have HttpOnly, Secure and SameSite protections',()=>{
const cookie=sessionCookie(new Request('https://example.com/api/admin/session'),'token',3600);
for(const attribute of ['HttpOnly','SameSite=Strict','Secure','Max-Age=3600'])assert(cookie.includes(attribute));
});
test('Unconfigured and expired sessions fail closed',async()=>{
const request=new Request('https://example.com',{headers:{cookie:'mir_admin_session='+'a'.repeat(64)}});
assert.equal(await authorized(request,{}),false);
assert.equal(await authorized(request,{ADMIN_PASSWORD_HASH:'set',DB:{prepare:()=>({bind:()=>({first:async()=>null})})}}),false);
});
