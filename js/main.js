// Мобильное меню
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

navToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
});

mainNav.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    mainNav.classList.remove('open');
  }
});

// Форма захвата лидов
const leadForm = document.getElementById('leadForm');
const formStatus = document.getElementById('formStatus');

// Точка приёма заявок: подставьте URL вашего бэкенда или CRM-вебхука
// (например, amoCRM, Bitrix24, Google Sheets через Apps Script и т.п.).
// Пока URL не задан, заявки сохраняются локально в браузере для теста.
const LEAD_ENDPOINT = '';

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(leadForm).entries());

  // Валидация обязательных полей
  let valid = true;
  ['name', 'phone'].forEach((field) => {
    const input = leadForm.elements[field];
    if (!data[field] || !data[field].trim()) {
      input.classList.add('invalid');
      valid = false;
    } else {
      input.classList.remove('invalid');
    }
  });

  if (!valid) {
    setStatus('Пожалуйста, заполните имя и телефон.', 'error');
    return;
  }

  const phoneDigits = data.phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    leadForm.elements.phone.classList.add('invalid');
    setStatus('Проверьте номер телефона.', 'error');
    return;
  }

  const lead = { ...data, createdAt: new Date().toISOString() };

  try {
    if (LEAD_ENDPOINT) {
      const res = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
    } else {
      const stored = JSON.parse(localStorage.getItem('leads') || '[]');
      stored.push(lead);
      localStorage.setItem('leads', JSON.stringify(stored));
    }

    leadForm.reset();
    setStatus('Спасибо! Мы свяжемся с вами в течение 24 часов.', 'success');
  } catch (err) {
    console.error('Не удалось отправить заявку:', err);
    setStatus('Ошибка отправки. Позвоните нам или попробуйте позже.', 'error');
  }
});

function setStatus(message, type) {
  formStatus.textContent = message;
  formStatus.className = 'form-status ' + type;
}
