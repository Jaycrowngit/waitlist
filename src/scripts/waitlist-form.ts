import { apiBaseUrl } from './config';

type FieldErrors = Record<string, string[]>;
type SuccessInfo = { position?: number; already_registered?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

// Which fields live on which step, so server errors can jump back to them
const FIELD_STEP: Record<string, number> = {
  full_name: 1, whatsapp_number: 1, email: 1,
  network: 2, monthly_data: 2,
  electricity_provider: 3, betting_interest: 3,
};

export function initWaitlistForm() {
  const API = apiBaseUrl();
  const form = document.getElementById('waitlistForm') as HTMLFormElement;
  const steps = form.querySelectorAll<HTMLFieldSetElement>('.step');
  const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;
  const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
  const alertBox = document.getElementById('formAlert')!;
  const TOTAL = steps.length;
  let step = 1;

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

  function setError(name: string, msg = '') {
    const el = form.querySelector(`.error[data-for="${name}"]`);
    if (el) el.textContent = msg;
    const input =
      form.querySelector(`input[name="${name}"]:not([type="radio"])`) ||
      form.querySelector(`[data-other="${name}"].show`);
    input?.classList.toggle('invalid', !!msg);
  }

  // "Other" option: show a text box, and hide it again when a preset is chosen
  form.querySelectorAll<HTMLElement>('.options').forEach((group) => {
    const name = group.dataset.name!;
    const other = form.querySelector<HTMLInputElement>(`[data-other="${name}"]`);
    group.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type !== 'radio') return;
      setError(name);
      if (!other) return;
      if (target.value === '__other') {
        other.classList.add('show');
        other.focus();
      } else {
        other.classList.remove('show', 'invalid');
        other.value = '';
      }
    });
  });

  form.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const name = target.name || target.getAttribute('data-other');
    if (name && target.type !== 'radio') setError(name);
  });

  // Value of a choice group: the preset, or the typed "Other" text
  function choice(name: string): string {
    const picked = form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
    if (!picked) return '';
    if (picked.value !== '__other') return picked.value;
    return form.querySelector<HTMLInputElement>(`[data-other="${name}"]`)!.value.trim();
  }

  function otherPicked(name: string): boolean {
    return form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value === '__other';
  }

  function validateStep(n: number): boolean {
    let ok = true;
    const fail = (name: string, msg: string) => { setError(name, msg); ok = false; };

    if (n === 1) {
      if (field('full_name').value.trim().length < 2) fail('full_name', 'Please enter your full name.');
      if (!PHONE_RE.test(field('whatsapp_number').value.trim())) fail('whatsapp_number', 'Please enter a valid WhatsApp number.');
      if (!EMAIL_RE.test(field('email').value.trim())) fail('email', 'Please enter a valid email address.');
    }
    if (n === 2) {
      if (!choice('network')) fail('network', otherPicked('network') ? 'Please type your network.' : 'Please choose a network.');
      if (!choice('monthly_data')) fail('monthly_data', otherPicked('monthly_data') ? 'Please type how much data.' : 'Please choose an option.');
    }
    if (n === 3) {
      if (!choice('electricity_provider')) fail('electricity_provider', otherPicked('electricity_provider') ? 'Please type your provider.' : 'Please choose a provider.');
      if (!choice('betting_interest')) fail('betting_interest', 'Please choose yes or no.');
    }

    if (!ok) {
      const first = steps[n - 1].querySelector<HTMLInputElement>('.invalid, input');
      if (first?.classList.contains('invalid')) first.focus();
    }
    return ok;
  }

  function goTo(n: number) {
    const back = n < step;
    steps[step - 1].classList.remove('is-active', 'from-left');
    step = n;
    const el = steps[step - 1];
    el.classList.toggle('from-left', back);
    el.classList.add('is-active');

    document.getElementById('progressBar')!.style.width = (step / TOTAL) * 100 + '%';
    document.getElementById('stepCount')!.textContent = `Step ${step} of ${TOTAL}`;
    backBtn.hidden = step === 1;
    nextBtn.textContent = step === TOTAL ? 'Join waitlist' : 'Continue';
    alertBox.hidden = true;

    const focusable = el.querySelector<HTMLInputElement>('input:not([type="radio"])');
    if (step === 1 && focusable) focusable.focus();
  }

  backBtn.addEventListener('click', () => goTo(step - 1));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;
    if (step < TOTAL) return goTo(step + 1);
    submit();
  });

  function showAlert(msg: string) {
    alertBox.textContent = msg;
    alertBox.hidden = false;
  }

  function showErrors(errors: FieldErrors) {
    Object.keys(errors).forEach((k) => setError(k, errors[k][0]));
  }

  async function submit() {
    const data = {
      full_name: field('full_name').value.trim(),
      whatsapp_number: field('whatsapp_number').value.trim(),
      email: field('email').value.trim().toLowerCase(),
      network: choice('network'),
      monthly_data: choice('monthly_data'),
      electricity_provider: choice('electricity_provider'),
      betting_interest: choice('betting_interest') === '1',
      website: field('website').value,
    };

    nextBtn.disabled = true;
    nextBtn.textContent = 'Joining…';
    alertBox.hidden = true;

    try {
      const r = await fetch(API + '/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await r.json().catch(() => ({}));

      if (r.ok) return showSuccess(body.data || {}, data);

      if (r.status === 422 && body.errors) {
        const errors = body.errors as FieldErrors;
        let firstStep = TOTAL;
        Object.keys(errors).forEach((k) => {
          if (FIELD_STEP[k]) firstStep = Math.min(firstStep, FIELD_STEP[k]);
        });
        if (firstStep !== step) goTo(firstStep);
        // Show field errors after any step switch (goTo clears the alert)
        showErrors(errors);
        return;
      }

      showAlert(
        r.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : body.message || 'Something went wrong. Please try again.',
      );
    } catch {
      showAlert('We couldn’t reach our server. Check your connection and try again.');
    } finally {
      nextBtn.disabled = false;
      nextBtn.textContent = step === TOTAL ? 'Join waitlist' : 'Continue';
    }
  }

  function showSuccess(info: SuccessInfo, data: { full_name: string; email: string }) {
    const first = data.full_name.split(/\s+/)[0];
    const spot = info.position ? ` You’re number ${Number(info.position).toLocaleString()} in line.` : '';

    document.getElementById('successTitle')!.textContent = info.already_registered
      ? `You’re already on the list, ${first}!`
      : `You’re in, ${first}!`;
    document.getElementById('successMsg')!.textContent = info.already_registered
      ? `We’ll reach you at ${data.email} when your access is ready.${spot}`
      : `We’ve sent a confirmation to ${data.email}.${spot}`;

    form.hidden = true;
    const success = document.getElementById('successState')!;
    success.hidden = false;
    success.focus();
    confetti(success);
  }
}

/* Short brand-coloured confetti burst from the tick */
function confetti(host: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#FFD727', '#F5BE00', '#FFE766', '#2F2707', '#25D366', '#FFFFFF'];
  const box = document.createElement('div');
  box.className = 'confetti';
  box.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 130;
    p.style.setProperty('--x', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--y', Math.sin(angle) * dist * 0.8 - 40 + 'px');
    p.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.animationDelay = 0.15 + Math.random() * 0.12 + 's';
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.appendChild(p);
  }
  host.appendChild(box);
  setTimeout(() => box.remove(), 1800);
}
