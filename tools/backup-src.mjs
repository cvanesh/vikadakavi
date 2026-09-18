// Mirror the gitignored plaintext (src/, references/) into a separate local git
// repo outside this project and commit it. Never pushes.
// Usage: npm run backup [-- <dir>]   default dir: ../vikadakavi-src
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dest = resolve(process.argv[2] ?? resolve(root, '../vikadakavi-src'));
const run = (cmd, args, cwd = dest) => execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString();

if (!existsSync(resolve(dest, '.git'))) {
  run('mkdir', ['-p', dest], root);
  run('git', ['init', '-q', '-b', 'main']);
  writeFileSync(resolve(dest, 'README.md'),
    '# vikadakavi-src\n\nPrivate backup of the gitignored plaintext of vikadakavi: `src/` and `references/`.\n' +
    'Written by `npm run backup` in the app repo. Restore with `rsync -a src/ <app>/src/`.\n');
}
for (const dir of ['src', 'references']) run('rsync', ['-a', '--delete', `${root}/${dir}/`, `${dest}/${dir}/`], root);

run('git', ['add', '-A']);
if (!run('git', ['status', '--porcelain']).trim()) { console.log(`backup: no changes in ${dest}`); process.exit(0); }
const head = run('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], root).trim();
run('git', ['commit', '-q', '-m', `Backup at app ${head}`]);
console.log(`backup: committed ${run('git', ['rev-parse', '--short', 'HEAD']).trim()} in ${dest} (not pushed)`);
