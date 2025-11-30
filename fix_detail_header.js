const fs = require('fs');

const filePath = 'C:\\Users\\Administrator\\Downloads\\meoris-v3-main\\src\\app\\produk\\[id]\\detail\\page.tsx';

// Read file
let content = fs.readFileSync(filePath, 'utf8');

// Split into lines
let lines = content.split('\n');

// Keep lines 0-331 (Header component added)
// Skip lines 332-828 (custom sidebar/headers)
// Keep lines 829+ (Section 1 onwards)

const keepStart = lines.slice(0, 332);  // Lines 0-331
const keepEnd = lines.slice(829);        // Lines 829+

// Combine
const newContent = [...keepStart, ...keepEnd].join('\n');

// Write back
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Custom header removed successfully!');
console.log('Removed lines: 332-828');
console.log('Total lines removed:', 829 - 332);
