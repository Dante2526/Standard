import fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/border-white/g, 'border-surface');

fs.writeFileSync(filePath, content);
console.log('Replaced successfully');
