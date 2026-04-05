const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const KEYWORDS = '(横浜 OR 海老名) (フリーライブ OR ミニライブ OR "無料ライブ" OR 無銭 OR ストリートライブ OR インストア)';

async function fetchYahooRealtime() {
  try {
    console.log('🔍 Yahoo!リアルタイム検索から情報を取得中...');
    
    const url = `https://search.yahoo.co.jp/realtime/search?p=${encodeURIComponent(KEYWORDS)}`;
    
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const lives = [];

    // 2026年現在のYahoo!リアルタイム検索のセレクタ（変わりやすいので複数パターン対応）
    const selectors = ['.result', '.stream-item', 'article', '.post'];
    
    selectors.forEach(selector => {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        const link = $(el).find('a').first().attr('href') || '#';
        const time = $(el).find('time, .time, .date').text().trim() || '時間不明';

        if (text.length > 20 && (text.includes('ライブ') || text.includes('演奏') || text.includes('歌'))) {
          lives.push({
            time: time,
            content: text.replace(/\s+/g, ' ').substring(0, 220) + '...',
            link: link.startsWith('http') ? link : 'https://search.yahoo.co.jp/realtime/search?p=' + encodeURIComponent(KEYWORDS)
          });
        }
      });
    });

    // 重複除去
    const uniqueLives = lives.filter((v, i, a) => 
      a.findIndex(t => t.content === v.content) === i
    ).slice(0, 15); // 最大15件まで

    // HTML生成（GitHub Pages + Google Sites埋め込み用）
    let html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>今日の横浜・海老名 無料ライブ情報</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #f8f9fa; line-height: 1.6; }
    h1 { color: #d32f2f; margin-bottom: 10px; }
    .update { color: #666; font-size: 0.95em; margin-bottom: 20px; }
    .live { background: white; margin: 12px 0; padding: 16px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .time { color: #1976d2; font-weight: bold; }
    a { color: #1976d2; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .no-result { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <h1>🆓 今日の横浜・海老名 無料ライブ情報</h1>
  <p class="update">更新日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
`;

    if (uniqueLives.length === 0) {
      html += '<p class="no-result">本日該当する無料ライブ情報は見つかりませんでした。<br>Yahoo!リアルタイム検索で直接「横浜 フリーライブ」などで確認してください。</p>';
    } else {
      uniqueLives.forEach(live => {
        html += `
        <div class="live">
          <div class="time">🕒 ${live.time}</div>
          <div>${live.content}</div>
          <p><a href="${live.link}" target="_blank">→ X/Twitterで詳細を見る</a></p>
        </div>`;
      });
    }

    html += '</body></html>';

    // ルートに直接保存（GitHub Pages用）
    fs.writeFileSync('today.html', html);
    console.log(`✅ ${uniqueLives.length}件の情報を取得しました！ today.html を作成しました。`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    const errorHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>エラー</title></head><body><h1>取得エラー</h1><p>${error.message}</p><p>GitHub Actionsのログを確認してください。</p></body></html>`;
    fs.writeFileSync('today.html', errorHtml);
  }
}

fetchYahooRealtime();
