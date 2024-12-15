import fs from 'node:fs';

const rebaseTodo = fs.readFileSync(process.argv[2], { encoding: 'utf-8' }).replace('\r\n', '\n').trim();

const dateRegex = /^\w+\s+\w+\s+(\d{4}-\d{2}-\d{2})/;

const lines = rebaseTodo.trim().split('\n');
let lastDate = '';
const result = lines.map((line) => {
  if (line.startsWith('#')) {
    return line;
  }
  const match = line.match(dateRegex);
  if (!match) {
    lastDate = '';
    return line;
  }
  const currentDate = match[1];
  if (currentDate === lastDate) {
    return line.replace('pick', 'squash');
  } else {
    lastDate = currentDate;
    return line;
  }
});

const resultText = result.join('\n');
fs.writeFileSync(process.argv[2], resultText);
console.log('rebase todo was automatically modified');
