import {describe,it,expect} from 'vitest';
import {findRegistryDestination} from './find-registry-link';
describe('find registry link',()=>{
  const origin='https://bayou.example';
  it('accepts an exact address or a local link with its share token',()=>{
    expect(findRegistryDestination('maryaj-jean',origin)).toBe('/r/maryaj-jean');
    expect(findRegistryDestination('https://bayou.example/fr/r/maryaj-jean?share=abc_123',origin)).toBe('/r/maryaj-jean?share=abc_123');
  });
  it('rejects other origins, credentials, malformed tokens and non-registry paths',()=>{
    for(const value of ['https://evil.example/r/abc','//evil.example/r/abc','javascript:alert(1)','https://user@bayou.example/r/abc','/admin','/r/abc?share=%2Fbad','/r/a%2Fb'])expect(findRegistryDestination(value,origin)).toBeNull();
  });
});
