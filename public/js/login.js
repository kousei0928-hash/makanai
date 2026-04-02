let isRegister = false;

const formTitle = document.getElementById('formTitle');
const nameField = document.getElementById('nameField');
const submitBtn = document.getElementById('submitBtn');
const toggleMode = document.getElementById('toggleMode');
const message = document.getElementById('message');

// URLパラメータからエラー表示
const urlParams = new URLSearchParams(location.search);
const lineError = urlParams.get('error');
if (lineError) {
  const errorMessages = {
    line_cancelled: 'LINEログインがキャンセルされました。',
    invalid_state: 'セッションが無効です。もう一度お試しください。',
    line_token_failed: 'LINEログインに失敗しました。',
    line_profile_failed: 'LINEプロフィールの取得に失敗しました。',
    line_error: 'LINEログイン中にエラーが発生しました。',
  };
  message.className = 'error';
  message.textContent = errorMessages[lineError] || 'エラーが発生しました。';
}

function updateMode() {
  if (isRegister) {
    formTitle.textContent = '新規登録';
    nameField.style.display = '';
    submitBtn.textContent = '登録';
    toggleMode.textContent = 'アカウントをお持ちの方はこちら';
  } else {
    formTitle.textContent = 'ログイン';
    nameField.style.display = 'none';
    submitBtn.textContent = 'ログイン';
    toggleMode.textContent = 'アカウントをお持ちでない方はこちら';
  }
  message.textContent = '';
}

toggleMode.addEventListener('click', (e) => {
  e.preventDefault();
  isRegister = !isRegister;
  updateMode();
});

submitBtn.addEventListener('click', async () => {
  submitBtn.disabled = true;
  message.className = '';
  message.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value.trim();

  const url = isRegister ? '/api/auth/register' : '/api/auth/login';
  const body = isRegister ? { email, password, name } : { email, password };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || '処理に失敗しました。');
    }

    location.href = '/mypage.html';
  } catch (e) {
    message.className = 'error';
    message.textContent = e.message;
  } finally {
    submitBtn.disabled = false;
  }
});
