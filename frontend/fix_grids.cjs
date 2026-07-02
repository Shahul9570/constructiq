const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('/home/ciods/Shahul/projects/construct-iq/frontend/src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace grid-cols-2, 3, 4 with responsive equivalents, only if not prefixed
    content = content.replace(/(?<!(sm:|md:|lg:|xl:|2xl:|\w-))grid-cols-2/g, 'grid-cols-1 md:grid-cols-2');
    content = content.replace(/(?<!(sm:|md:|lg:|xl:|2xl:|\w-))grid-cols-3/g, 'grid-cols-1 md:grid-cols-3');
    content = content.replace(/(?<!(sm:|md:|lg:|xl:|2xl:|\w-))grid-cols-4/g, 'grid-cols-1 lg:grid-cols-4');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated grids in ${file}`);
    }
});
