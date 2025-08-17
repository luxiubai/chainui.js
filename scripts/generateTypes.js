const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const projectVersion = packageJson.version;

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function copyFile(src, dest) {
    fs.copyFileSync(src, dest);
}
function generatePackageJson(dir, type) {
    const packageJsonContent = {
        name: "chainui",
        version: projectVersion,
        type: type,
        main: type === "module" ? "./chainui.min.js" : "./chainui.min.js",
        module: "./chainui.min.js",
        types: "./chainui.d.ts"
    };
    
    fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify(packageJsonContent, null, 2)
    );
}

function generateTypeEntry(dir, format) {
    // Simplified type entry that properly exposes named exports
    const content = `// Type definitions for ChainUI
// Project: ChainUI
// Definitions by: ChainUI Team

export * from './chainui';
export { default } from './chainui';
`;
    
    fs.writeFileSync(
        path.join(dir, 'index.d.ts'),
        content
    );
}

function main() {
    const srcTypes = path.join(__dirname, '../src/chainui.d.ts');
    
    const buildDir = path.join(__dirname, '../build');
    const iifeDir = path.join(buildDir, 'iife');
    const esmDir = path.join(buildDir, 'esm');
    const cjsDir = path.join(buildDir, 'cjs');
    
    ensureDir(iifeDir);
    ensureDir(esmDir);
    ensureDir(cjsDir);
    
    copyFile(srcTypes, path.join(iifeDir, 'chainui.d.ts'));
    copyFile(srcTypes, path.join(esmDir, 'chainui.d.ts'));
    copyFile(srcTypes, path.join(cjsDir, 'chainui.d.ts'));
    
    generatePackageJson(iifeDir, "module");
    generatePackageJson(esmDir, "module"); 
    generatePackageJson(cjsDir, "commonjs");
    
    generateTypeEntry(iifeDir, 'iife');
    generateTypeEntry(esmDir, 'esm');
    generateTypeEntry(cjsDir, 'cjs');
    
    console.log('Type definition files generated successfully!');
}

main();
