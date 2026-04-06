const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function fetchYahooRealtime() {
  try {
    console.log('🔍 Yahoo!リアルタイム検索から横浜・海老名の無料ライブ情報を取得中...');

    // 検索キーワード（路上系除外済み）
    const keywords = `(横浜 OR 海老名) (無料ライブ OR フリーライブ OR ミニライブ OR インストアライブ OR リリイベ OR リリースイベント OR Niigoひろば OR クィーンズスクウェア OR 日本丸メモリアルパーク OR 海老名中央公園 OR 横浜ワールドポーターズ)`;
    const url = `https://search.yahoo.co.jp/realtime/search?p=${encodeURIComponent(keywords)}`;

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
      },
      timeout: 20000
    });

    const $ = cheerio.load(data);
    const lives = [];

    $('.result, .stream-item, article, .post, [data-testid], .content').each((i, el) => {
      const fullText = $(el).text().trim();
      if (fullText.length < 25) return;

      const link = $(el).find('a').first().attr('href') || '#';
      const timeText = $(el).find('time, .time, .date, .timestamp').text().trim() || '時間不明';

      // 必須キーワードだけを抽出（除外キーワードなし）
      if (fullText.match(/無料ライブ|フリーライブ|ミニライブ|インストアライブ|リリイベ|リリースイベント|Niigoひろば|クィーンズスクウェア|日本丸メモリアルパーク|海老名中央公園|横浜ワールドポーターズ/i)) {
        lives.push({
          time: timeText,
          content: fullText.replace(/\s+/g, ' ').substring(0, 250) + '...',
          link: link.startsWith('http') ? link : url
        });
      }
    });

    const uniqueLives = [...new Map(lives.map(item => [item.content, item])).values()].slice(0, 15);

    let html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>今日の横浜・海老名 無料ライブ情報</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #f8f9fa; line-height: 1.7; }
    h1 { color: #d32f2f; font-size: 1.8em; }
    .update { color: #555; margin-bottom: 25px; }
    .live { background: white; margin: 15px 0; padding: 18px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .time { color: #1976d2; font-weight: bold; font-size: 1.05em; }
    a { color: #1976d2; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .no-result { padding: 50px 20px; text-align: center; color: #666; background: white; border-radius: 12px; }
  </style>
</head>
<body>
  <h1>🆓 今日の横浜・海老名 無料ライブ情報</h1>
  <p class="update">更新日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>`;

    if (uniqueLives.length === 0) {
      html += `<div class="no-result">
        <p>本日該当する無料ライブ情報は見つかりませんでした。</p>
        <p>直接Yahoo!リアルタイム検索で確認 → 
        <a href="${url}" target="_blank">検索ページを開く</a></p>
      </div>`;
    } else {
      uniqueLives.forEach(live => {
        html += `
        <div class="live">
          <div class="time">🕒 ${live.time}</div>
          <div>${live.content}</div>
          <p><a href="${live.link}" target="_blank">→ X/Twitterで詳細を確認する</a></p>
        </div>`;
      });
    }

    html += '</body></html>';
    fs.writeFileSync('today.html', html);
    console.log(`✅ ${uniqueLives.length}件の無料ライブ情報を取得しました！`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    fs.writeFileSync('today.html', `<h1>取得エラー</h1><p>${error.message}</p><p>しばらく経ってから再度実行してください。</p>`);
  }
}

fetchYahooRealtime();
