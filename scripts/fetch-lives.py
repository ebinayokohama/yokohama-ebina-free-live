import requests
from bs4 import BeautifulSoup
import datetime

def fetch_live_info():
    print("🔍 Yahoo!リアルタイム検索から横浜・海老名 無料/路上ライブ情報を取得中...")

    keywords = '(横浜 OR 海老名) (フリーライブ OR 路上ライブ OR ストリートライブ OR 無銭 OR 無料ライブ OR ミニライブ OR 弾き語り OR アコースティック)'
    url = f"https://search.yahoo.co.jp/realtime/search?p={requests.utils.quote(keywords)}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        lives = []
        
        # より安全に投稿を探す（テキストにキーワードを含む要素を広く拾う）
        items = soup.find_all(['div', 'article', 'section', 'li'])
        
        for item in items:
            text = item.get_text(strip=True)
            if len(text) < 40:
                continue

            # リンクを探す（エラー回避）
            link = "#"
            link_tag = item.find('a')
            if link_tag and link_tag.get('href'):
                link = link_tag['href']
                if not link.startswith('http'):
                    link = "https://search.yahoo.co.jp/realtime/search?p=" + requests.utils.quote(keywords)

            # 時間情報
            time_text = "時間不明"
            time_tag = item.find('time')
            if time_tag:
                time_text = time_tag.get_text(strip=True)
            else:
                # 相対時間っぽいテキストを探す
                if any(t in text for t in ['分前', '時間前', '昨日', '今日']):
                    time_text = "最近"

            # ライブ関連キーワードでフィルタ
            if any(kw in text for kw in ['ライブ', '路上', 'ストリート', '弾き語り', '無銭', '無料', 'フリーライブ', 'ミニライブ', 'アコースティック']):
                lives.append({
                    'time': time_text,
                    'content': text[:280] + '...' if len(text) > 280 else text,
                    'link': link
                })

        # 重複除去
        unique_lives = []
        seen = set()
        for live in lives:
            content_key = live['content'][:100]
            if content_key not in seen:
                seen.add(content_key)
                unique_lives.append(live)

        unique_lives = unique_lives[:12]

        # HTML生成
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
        update_time = now.strftime('%Y年%m月%d日 %H:%M')

        html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>今日の横浜・海老名 無料・路上ライブ情報</title>
  <style>
    body {{ font-family: system-ui, sans-serif; padding: 20px; background: #f8f9fa; line-height: 1.7; }}
    h1 {{ color: #d32f2f; }}
    .update {{ color: #555; margin-bottom: 25px; }}
    .live {{ background: white; margin: 15px 0; padding: 18px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
    .time {{ color: #1976d2; font-weight: bold; }}
    a {{ color: #1976d2; }}
    .no-result {{ padding: 50px 20px; text-align: center; color: #666; background: white; border-radius: 12px; }}
  </style>
</head>
<body>
  <h1>🆓 今日の横浜・海老名 無料・路上ライブ情報</h1>
  <p class="update">更新日時: {update_time}</p>
"""

        if not unique_lives:
            html += f'''<div class="no-result">
        <p>本日該当する無料・路上ライブ情報は見つかりませんでした。</p>
        <p>手動で確認 → <a href="{url}" target="_blank">Yahoo!リアルタイム検索を開く</a></p>
      </div>'''
        else:
            for live in unique_lives:
                html += f'''
        <div class="live">
          <div class="time">🕒 {live["time"]}</div>
          <div>{live["content"]}</div>
          <p><a href="{live["link"]}" target="_blank">→ 詳細を確認する</a></p>
        </div>'''

        html += '</body></html>'

        with open('today.html', 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"✅ {len(unique_lives)}件の情報を取得しました（改善版）")

    except Exception as e:
        print(f"❌ エラー: {e}")
        with open('today.html', 'w', encoding='utf-8') as f:
            f.write(f"<h1>取得エラー</h1><p>{str(e)}</p><p>Yahoo!のページ構造が変わっている可能性があります。</p>")

if __name__ == "__main__":
    fetch_live_info()
