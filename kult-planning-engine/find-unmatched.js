const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/AIWizard.jsx', 'utf-8');
const lines = content.split('\n');

let stack = [];
let unmatchedLines = [];

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const prevChar = i > 0 ? line[i-1] : '';
    const nextChar = i < line.length - 1 ? line[i+1] : '';
    
    // Skip characters in strings and comments
    if (char === '{') {
      stack.push({ char: '{', line: lineNum, col: i });
    } else if (char === '}') {
      if (stack.length === 0 || stack[stack.length - 1].char !== '{') {
        unmatchedLines.push({ type: 'extra }', line: lineNum, col: i, text: line.trim().substring(0, 80) });
      } else {
        stack.pop();
      }
    }
  }
});

if (stack.length > 0) {
  console.log('Unmatched opening braces:');
  stack.forEach(item => {
    console.log(`  Line ${item.line}, col ${item.col}: ${lines[item.line-1].trim().substring(0, 80)}`);
  });
}

if (unmatchedLines.length > 0) {
  console.log('\nExtra closing braces:');
  unmatchedLines.forEach(item => {
    console.log(`  Line ${item.line}, col ${item.col}: ${item.text}`);
  });
}

console.log(`\nTotal stack depth at end: ${stack.length}`);
