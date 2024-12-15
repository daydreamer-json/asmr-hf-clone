import { readFileSync, writeFileSync } from 'fs';
// import readline from 'readline';

// ファイルパスを取得
const filePath = process.argv[2];

// ファイルの読み込み
const fileData = readFileSync(filePath, 'utf-8');

// ファイル内容を行ごとに分割
const lines = fileData.split('\n');

// 4行目から日付部分を抽出 (例: 2023-04-01_AB01044717 -> 2023-04-01)
const line4 = lines[3]; // インデックスは0ベースなので4行目はindex 3
const isoDate = line4.match(/\d{4}-\d{2}-\d{2}/)[0]; // 正規表現でISO日付を抽出

// 上書き保存する内容を表示
console.log('以下の内容を3秒後にファイルに書き込みます: ' + isoDate);

// readlineインターフェースの作成
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

setTimeout(() => {
  writeFileSync(filePath, isoDate);
  console.log(`ファイルが更新されました: ${filePath}`);
}, 2000);

// ユーザーにキー入力を促してからファイルを上書き保存
// rl.question('続行するにはEnterキーを押してください ...', () => {
//   // ファイルを上書き保存
//   writeFileSync(filePath, isoDate);
//   // readlineインターフェースを閉じる
//   rl.close();
// });
