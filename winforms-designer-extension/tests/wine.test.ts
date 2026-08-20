import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripWineNoise } from '../src/wine';

test('removes Wine diagnostic lines and preserves useful output', () => {
    const output = 'fixme:unimplemented call\nDesigner started\nerr:ignored detail\n';

    assert.equal(stripWineNoise(output), 'Designer started');
});

test('matches diagnostic prefixes case-insensitively with leading whitespace', () => {
    const output = '  WARN: noisy\nTRACE: noisy\nUseful failure';

    assert.equal(stripWineNoise(output), 'Useful failure');
});

test('returns an empty string when output contains only Wine diagnostics', () => {
    assert.equal(stripWineNoise('wine: noise\nfixme: more noise\n'), '');
});