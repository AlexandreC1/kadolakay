import {describe,it,expect} from 'vitest';
import {authProviderConfig} from './auth-provider-config';
const valid={AUTH_GOOGLE_ID:'123456789-example.apps.googleusercontent.com',AUTH_GOOGLE_SECRET:'GOCSPX-fictional-test-only'};
describe('OAuth provider configuration',()=>{
 it('disables incomplete and literal undefined credentials',()=>{
  for(const env of [{},{AUTH_GOOGLE_ID:'undefined',AUTH_GOOGLE_SECRET:'undefined'},{...valid,AUTH_GOOGLE_SECRET:''},{...valid,AUTH_GOOGLE_ID:'https://evil.example'}]) expect(authProviderConfig(env).google).toBe(false);
 });
 it('enables a complete server credential pair',()=>expect(authProviderConfig(valid).google).toBe(true));
 it('does not assume a verified email sender exists',()=>{
  expect(authProviderConfig({AUTH_RESEND_KEY:'re_example'}).email).toBe(false);
  expect(authProviderConfig({AUTH_RESEND_KEY:'re_example',AUTH_RESEND_FROM:'Bayou <hello@example.com>'}).email).toBe(true);
 });
});
