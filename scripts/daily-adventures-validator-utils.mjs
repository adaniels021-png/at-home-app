import fs from 'node:fs';
import path from 'node:path';

export const root = process.cwd();

export function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function contains(source, pattern, message) {
  assert(pattern.test(source), message);
}

export function excludes(source, pattern, message) {
  assert(!pattern.test(source), message);
}

export function pass(name) {
  console.log(`PASS: ${name}`);
}
