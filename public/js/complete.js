const params = new URLSearchParams(location.search);
const orderId = params.get('orderId');
const el = document.getElementById('completeText');

if (orderId) {
  el.textContent = `注文番号 #${orderId} を受け付けました。`;
} else {
  el.textContent = '注文が完了しました。';
}
