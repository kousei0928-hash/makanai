const params = new URLSearchParams(location.search);
const orderId = params.get('orderId');
const el = document.getElementById('completeText');

if (orderId) {
  el.textContent = `注文番号 #${orderId} を受け付けました。`;
} else {
  el.textContent = '注文が完了しました。';
}

// 2秒後に購入履歴ページへ自動遷移
setTimeout(() => {
  location.href = '/history.html';
}, 2000);
