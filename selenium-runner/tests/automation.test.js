import test from 'node:test';import assert from 'node:assert/strict';
import {validateFields,validateConfig} from '../automation.js';
test('only configured voucher fields are accepted',()=>{assert.deepEqual(validateFields({vendor:' A ',date:''}),{vendor:'A'});for(const fields of [{},{url:'http://other'},{vendor:12},{vendor:'x'.repeat(2001)}])assert.throws(()=>validateFields(fields));});
test('target requires HTTP(S) and fixed selectors',()=>{assert.throws(()=>validateConfig({targetUrl:'file:///etc/passwd',fields:{}}));assert.throws(()=>validateConfig({targetUrl:'https://example.com'}));});
