const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/AIWizard.jsx', 'utf-8');

// Count brackets
const openCurly = (content.match(/{/g) || []).length;
const closeCurly = (content.match(/}/g) || []).length;
const openParen = (content.match(/\(/g) || []).length;
const closeParen = (content.match(/\)/g) || []).length;
const openSquare = (content.match(/\[/g) || []).length;
const closeSquare = (content.match(/\]/g) || []).length;

console.log('Bracket counts:');
console.log('  { } :', openCurly, '/', closeCurly, openCurly === closeCurly ? '✓' : '✗');
console.log('  ( ) :', openParen, '/', closeParen, openParen === closeParen ? '✓' : '✗');
console.log('  [ ] :', openSquare, '/', closeSquare, openSquare === closeSquare ? '✓' : '✗');

// Check for unclosed template literals
const backticks = (content.match(/`/g) || []).length;
console.log('  ` ` :', backticks, backticks % 2 === 0 ? '(even ✓)' : '(odd ✗)');
