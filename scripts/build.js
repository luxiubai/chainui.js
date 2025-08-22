const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
async function build() {
  const commonOptions = {
    entryPoints: ['src/chainui.js'],
    bundle: true,
    minify: true,
    legalComments: 'external' // 将所有法律注释提取到单独的文件中
  };

  // IIFE format
  await esbuild.build({
    ...commonOptions,
    format: 'iife',
    globalName: 'ChainUI',
    outfile: 'build/iife/chainui.min.js',
  });

  // ESM format
  await esbuild.build({
    ...commonOptions,
    format: 'esm',
    outfile: 'build/esm/chainui.min.js',
  });

  // CJS format
  await esbuild.build({
    ...commonOptions,
    format: 'cjs',
    outfile: 'build/cjs/chainui.min.js',
  });

  console.log('Build finished successfully!');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
