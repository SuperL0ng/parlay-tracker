import { readFile, rm, writeFile } from 'node:fs/promises';

const removals=[
  '.github/scripts/apply-builder-fixes-v10.js',
  '.github/scripts/apply-builder-fixes-v6.js',
  '.github/scripts/apply-builder-fixes-v7.js',
  '.github/scripts/apply-builder-fixes-v8.js',
  '.github/scripts/fix-date-width-v2.js',
  '.github/scripts/fix-native-date-width.js',
  '.github/workflows/apply-builder-reorder-v10.yml',
  '.github/workflows/apply-builder-reorder-v8.yml',
  '.github/workflows/fix-date-width-v2.yml',
  '.github/workflows/fix-native-date-width.yml',
  '.github/workflows/gate6-inventory-audit.yml',
  '.github/workflows/patch-leg-drag.yml',
  '.github/workflows/verify-dashboard-v5-behavior.yml',
  'CNAME',
  'actual-settlement-time.js',
  'apple-touch-icon-precomposed.png',
  'apple-touch-icon.png',
  'builder-behavior-fixes.js',
  'code-panel-default.js',
  'dashboard-layout-v56.js',
  'dashboard-more-actions-v64.js',
  'dashboard-polish-v63.js',
  'dashboard-refresh-v58.js',
  'dashboard-sort-filter-v78.js',
  'doubleheader-game-binding.js',
  'favicon-silver-v2-192.png',
  'favicon-silver-v2-512.png',
  'favicon.png',
  'favicon.svg',
  'favicon_silver_visible_128.png',
  'favicon_silver_visible_180.png',
  'favicon_silver_visible_64.png',
  'game-display-fixes.js',
  'import-mlb-default.js',
  'index.html',
  'label-lifecycle-v52.js',
  'league-code-output.js',
  'library-backup.js',
  'manifest-gold-v1.json',
  'manifest-v2.json',
  'manifest.json',
  'manual-fields.js',
  'mlb-live-loader.js',
  'mlb-live-v50.js',
  'mlb-live.js',
  'navigation-links-v24.js',
  'optional-sportsbook.js',
  'png-icon-control',
  'pregame-status-correction.js',
  'reference-slip.js',
  'scripts/test-doubleheader-game-binding.mjs',
  'scripts/test-ticket-id-binding-regression.mjs',
  'scripts/verify-hosting-contract.mjs',
  'settlement-status.js',
  'show-legs-label-fix.js',
  'simon-sports-betting-nameplate.png',
  'ssb-favicon-v3.ico',
  'ssb-favicon-v3.svg',
  'ssb_apple_touch_home_dark_180.png',
  'ssb_emblem_webapp_box_transparent_768.png',
  'ssb_emblem_webapp_logo_transparent_768.png',
  'ssb_favicon_full_transparent_128.png',
  'ssb_favicon_full_transparent_64.png',
  'ssb_ios_zoom_dark_512.png',
  'ticket-dashboard-details-v54.js',
  'ticket-outcome.js',
  'ticket-sharing.js',
  'tracker-core-v51.js',
  'tracker-evaluator-v51.js',
  'tracker-sources-v51.js',
  'tracker-view-v51.js',
  'view-fixes.js'
];

for(const path of removals)await rm(path,{recursive:true,force:false});

const readme=`# Parlay Tracker\n\nThis repository contains one canonical application source for both domains.\n\n- Source: \`app/src\`\n- Build identities: \`app/config/builds.json\`\n- Generator: \`scripts/build-static.mjs\`\n- Gold output: \`build/gold\` for \`simonsports.bet\`\n- Silver output: \`build/silver\` for \`simonsportsbetting.com\`\n\nGenerated deployment output is not committed to the development branch. See [the hosting workflow](docs/HOSTING_WORKFLOW.md).\n`;

const architecture=`# Canonical application dependency map\n\n## Source and build chain\n\n\`app/src\` and \`app/config/builds.json\` are the only application source. \`scripts/build-static.mjs\` generates both theme builds. Gold and silver share identical JavaScript and application styles; only configured identity, metadata, theme tokens, domain files, and required assets differ.\n\n## Runtime ownership\n\n| Responsibility | Sole owner |\n|---|---|\n| Ticket persistence and stable IDs | \`storage.js\` |\n| Builder state, serialization, validation, and leg ordering | \`builder-controller.js\` |\n| Dashboard sorting, filtering, rendering, expansion, selection, deletion, and actions | \`dashboard-controller.js\` |\n| Score refresh and outcome persistence | \`tracker-service.js\` |\n| Event-ledger settlement | \`settlement-service.js\` |\n| Ticket and active-ticket views | \`ticket-view-controller.js\` |\n| Import and sportsbook-free sharing | \`sharing-controller.js\` |\n| Navigation and cross-controller commands | \`app-controller.js\` |\n| Initialization and teardown | \`bootstrap.js\` |\n| Dashboard presentation | \`dashboard.css\` |\n\n## Data contract\n\nThe storage key remains \`parlayTracker.savedTickets.v1\`. Existing IDs are preserved. Missing or duplicate IDs are repaired once by storage. Rendering and actions bind records only by canonical ticket ID, never card position.\n\n## Retired architecture\n\nThe former live-root runtime fetched or rewrote historical HTML, injected versioned patch scripts, repeatedly wrapped dashboard functions, and used mutation observers and delayed repair passes. That entire runtime, including \`show-legs-label-fix.js\`, historical loaders, duplicate dashboard controllers, patch workflows, and superseded regression scripts, has been removed from the canonical branch.\n\n## Enforced prohibitions\n\n- no runtime historical-HTML loading or \`document.write()\`;\n- no application runtime outside \`app/src\`;\n- no duplicate dashboard controller or stylesheet;\n- no positional ticket ownership;\n- no post-render DOM sorting;\n- no dashboard render wrappers, broad mutation observers, or delayed repair layers;\n- no committed generated build output;\n- no historical patch or verification workflows.\n`;

const hosting=`# Parlay Tracker hosting and release workflow\n\n## Repository roles\n\n- \`SuperL0ng/parlay-tracker\` is the canonical source repository and gold deployment target for \`simonsports.bet\`.\n- \`SuperL0ng/SuperL0ng.github.io\` is the independent silver deployment target for \`simonsportsbetting.com\`.\n\nNeither production site may fetch, mirror, rewrite, or import the other repository at runtime.\n\n## Build contract\n\nFrom one audited source commit:\n\n1. run \`npm ci\`;\n2. run \`npm test\`;\n3. run \`npm run build\`;\n4. verify \`build/gold\` and \`build/silver\` with \`npm run verify:hosting\`;\n5. retain the exact source commit and build hashes used for both deployments.\n\nGenerated \`build/\` output is ignored on the development branch.\n\n## Gold deployment\n\n1. Export the existing \`simonsports.bet\` ticket library as a precaution.\n2. Replace the gold repository deployment root with the complete contents of \`build/gold\`; do not retain historical root scripts or manifests.\n3. Publish and verify \`simonsports.bet\` before touching silver.\n4. Test saved-ticket preservation, four-ticket ordering, expansion, filters, selection/deletion, actions, settlement timestamps, refresh, sharing, mobile layout, icons, manifest, and theme identity.\n\n## Silver deployment\n\n1. Use \`build/silver\` produced from the exact same audited source commit as gold.\n2. Export the existing \`simonsportsbetting.com\` ticket library as a precaution.\n3. Replace the silver repository deployment root completely; do not copy gold metadata or retain old runtime patches.\n4. Publish and repeat the production verification matrix.\n\n## Storage boundary\n\nThe domains are separate browser origins and therefore maintain separate \`localStorage\` libraries. Deployment on the same domain preserves its existing \`parlayTracker.savedTickets.v1\` data, but ticket libraries do not transfer between domains automatically.\n`;

const cleanliness=`#!/usr/bin/env node\nimport assert from 'node:assert/strict';\nimport { execFileSync } from 'node:child_process';\nimport { readFileSync, readdirSync } from 'node:fs';\nimport { dirname, join, resolve } from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst root=resolve(dirname(fileURLToPath(import.meta.url)),'..');\nconst read=(...parts)=>readFileSync(join(root,...parts),'utf8');\nconst tracked=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split(/\\r?\\n/).filter(Boolean);\nconst config=JSON.parse(read('app','config','builds.json'));\nconst assets=new Set();\nfor(const build of Object.values(config)){\n  for(const value of [build.icon,build.touchIcon,build.shareImage,build.logo,...(build.extraAssets||[]),...(build.manifestIcons||[]).map(icon=>icon.src)])assets.add(value);\n}\nconst allowedRoot=new Set(['.gitignore','README.md','package.json','package-lock.json','playwright.config.mjs',...assets]);\nconst allowedTrees=['app/','architecture/','docs/','scripts/','tests/'];\nfor(const path of tracked){\n  if(!path.includes('/'))assert.ok(allowedRoot.has(path),'Unexpected tracked root file: '+path);\n  else assert.ok(allowedTrees.some(prefix=>path.startsWith(prefix)),'Unexpected tracked tree: '+path);\n}\nassert.deepEqual(tracked.filter(path=>!path.includes('/')).sort(),[...allowedRoot].sort(),'Tracked root must contain only canonical metadata and required build assets');\nassert.equal(tracked.some(path=>path.startsWith('.github/')),false,'Historical GitHub patch or verification machinery remains tracked');\nassert.equal(tracked.some(path=>path.startsWith('png-icon-control/')),false,'Historical icon test deployment remains tracked');\nconst bannedNames=['show-legs-label-fix.js','ticket-dashboard-details-v54.js','dashboard-layout-v56.js','dashboard-refresh-v58.js','dashboard-polish-v63.js','dashboard-more-actions-v64.js','dashboard-sort-filter-v78.js','mlb-live-loader.js','navigation-links-v24.js','ticket-sharing.js','library-backup.js','test-doubleheader-game-binding.mjs','test-ticket-id-binding-regression.mjs','verify-hosting-contract.mjs'];\nfor(const name of bannedNames)assert.equal(tracked.some(path=>path.endsWith(name)),false,'Retired file remains tracked: '+name);\nconst template=read('app','src','index.template.html');\nconst scriptRefs=[...template.matchAll(/<script\\s+src="\\.\\/([^"]+)"/g)].map(match=>match[1]);\nconst styleRefs=[...template.matchAll(/<link\\s+rel="stylesheet"\\s+href="\\.\\/([^"]+)"/g)].map(match=>match[1]);\nconst scriptFiles=readdirSync(join(root,'app','src','scripts')).filter(name=>name.endsWith('.js')).sort();\nassert.deepEqual([...scriptRefs].sort(),scriptFiles,'Every canonical script must be referenced exactly once and no extra runtime script may exist');\nassert.equal(new Set(scriptRefs).size,scriptRefs.length,'Canonical template contains a duplicate script reference');\nassert.deepEqual(styleRefs.sort(),['app.css','dashboard.css','theme.css'].sort(),'Canonical template stylesheet set changed');\nassert.deepEqual(readdirSync(join(root,'app','src','styles')).filter(name=>name.endsWith('.css')).sort(),['app.css','dashboard.css'],'Exactly one application stylesheet and one dashboard stylesheet must exist');\nconst source=[template,...scriptFiles.map(name=>read('app','src','scripts',name)),read('app','src','styles','app.css'),read('app','src','styles','dashboard.css')].join('\\n');\nfor(const needle of ['document.write(','document.open(','MutationObserver','renderTicketDashboard','show-legs-label-fix.js','raw.githubusercontent.com/SuperL0ng/parlay-tracker/'])assert.equal(source.includes(needle),false,'Forbidden canonical runtime dependency: '+needle);\nconst packageData=JSON.parse(read('package.json'));\nassert.equal(packageData.scripts['verify:cleanliness'],'node scripts/verify-repository-cleanliness.mjs','Repository cleanliness verifier must remain permanent');\nassert.ok(packageData.scripts.test.includes('npm run verify:cleanliness'),'Integrated test pipeline must enforce repository cleanliness');\nconsole.log('Repository cleanliness verification passed.');\n`;

await writeFile('README.md',readme);
await writeFile('architecture/dashboard-dependency-map.md',architecture);
await writeFile('docs/HOSTING_WORKFLOW.md',hosting);
await writeFile('scripts/verify-repository-cleanliness.mjs',cleanliness,{mode:0o755});

const packageData=JSON.parse(await readFile('package.json','utf8'));
packageData.scripts['verify:cleanliness']='node scripts/verify-repository-cleanliness.mjs';
packageData.scripts.test='npm run check:syntax && npm run verify:cleanliness && npm run build && npm run verify:architecture && npm run test:components && npm run test:tracker && npm run test:controllers && npm run test:regressions && npm run verify:hosting && npm run test:browser';
await writeFile('package.json',`${JSON.stringify(packageData,null,2)}\n`);

await rm('.github/workflows/apply-gate6-cleanup.yml',{force:false});
await rm('.gate6/apply-cleanup.mjs',{force:false});
