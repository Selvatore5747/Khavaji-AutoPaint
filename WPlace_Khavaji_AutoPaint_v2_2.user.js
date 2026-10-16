
// ==UserScript==
// @name         WPlace Khavaji AutoPaint v2.2 — Smart Repair + Auto Upgrade
// @namespace    https://wplace.live/khavaji-autopaint
// @version      2.2.0
// @description  .wplace smart repair, account stats, auto-resume and opt-in auto-purchase of +5 maximum charges for 500 Droplets.
// @match        https://wplace.live/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      backend.wplace.live
// ==/UserScript==

(() => {
  'use strict';

  if (document.querySelector('#khavaji-v2-host')) return;

  const API = 'https://backend.wplace.live';
  const TILE = 1000, WORLD = 2048000;
  const KEY_TEMPLATE = 'khavaji-autopaint-template-v1';
  const KEY_SETTINGS = 'khavaji-autopaint-settings-v2';
  const KEY_LAST = 'khavaji-autopaint-last-v2';
  const POLL_MS = 5000;

  const PALETTE = [
    '', '0,0,0', '60,60,60', '120,120,120',
    '210,210,210', '255,255,255',
    '96,0,24', '237,28,36', '255,127,39',
    '246,170,9', '249,221,59', '255,250,188',
    '14,185,104', '19,230,123', '135,255,94',
    '12,129,110', '16,174,166', '19,225,190',
    '40,80,158', '64,147,228', '96,247,242',
    '107,80,246', '153,177,251',
    '120,12,153', '170,56,185', '224,159,249',
    '203,0,122', '236,31,128', '243,141,169',
    '104,70,52', '149,104,42', '248,178,119',
    '170,170,170', '165,14,30', '250,128,114',
    '228,92,26', '214,181,148', '156,132,49',
    '197,173,49', '232,212,95',
    '74,107,58', '90,148,74', '132,197,115',
    '15,121,159', '187,250,242', '125,199,255',
    '77,49,184', '74,66,132', '122,113,196',
    '181,174,241', '219,164,99', '209,128,81',
    '255,197,165', '155,82,73', '209,128,120',
    '250,182,164', '123,99,82', '156,132,107',
    '51,57,65', '109,117,141', '179,185,209',
    '109,100,63', '148,140,107', '205,197,158'
  ];

  const rgb2id = new Map(
    PALETTE.map((v, i) => [v, i]).filter(([v]) => v)
  );
  const rgbTriples = PALETTE.map(
    v => v ? v.split(',').map(Number) : null
  );

  // ========================================
  // ИНТЕРФЕЙС
  // ========================================

  const el = document.createElement('div');
  el.id = 'khavaji-v2-host';
  document.documentElement.appendChild(el);

  const ui = el.attachShadow({ mode: 'open' });

  ui.innerHTML = `
  <style>
    :host {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      right: 14px;
      top: 64px;
      color: #f2f7ff;
      font: 13px/1.4 system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    #panel {
      width: 355px;
      max-width: calc(100vw - 18px);
      background: #121c2b;
      border: 1px solid #526580;
      border-radius: 12px;
      box-shadow: 0 14px 42px #000a;
      overflow: hidden;
    }
    #head {
      background: #283c58;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      font-weight: 700;
      user-select: none;
    }
    #body {
      padding: 11px;
      display: grid;
      gap: 9px;
      max-height: calc(100vh - 100px);
      overflow: auto;
    }
    #body.hide { display: none; }
    button, input {
      font: inherit;
      border-radius: 7px;
      min-height: 34px;
    }
    button {
      color: #fff;
      padding: 6px 8px;
      background: #334b6a;
      border: 1px solid #5a7392;
      cursor: pointer;
    }
    button:disabled {
      opacity: .45;
      cursor: not-allowed;
    }
    button:not(:disabled):hover {
      filter: brightness(1.15);
    }
    .go {
      background: #18754d;
      border-color: #299568;
    }
    .stop {
      background: #8a3a40;
      border-color: #c3505a;
    }
    .grid3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 7px;
    }
    #file { display: none; }
    .box {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #1d2c40;
      border-radius: 7px;
      padding: 9px;
      font-variant-numeric: tabular-nums;
    }
    .hint {
      color: #b8c8dd;
      font-size: 11px;
    }
    label {
      display: block;
      color: #c7d5e9;
      font-size: 11px;
    }
    label input {
      display: block;
      width: 100%;
      margin-top: 3px;
      padding: 5px 7px;
      border: 1px solid #637993;
      color: #fff;
      background: #22354b;
    }
    .track {
      height: 9px;
      background: #35445b;
      border-radius: 9px;
      overflow: hidden;
    }
    .fill {
      height: 100%;
      width: 0;
      background: #27bc84;
      transition: width .25s;
    }
    #chargesFill { background: #68a5ff; }
    #levelFill { background: #e5af59; }
    .buyrow {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      cursor: pointer;
      color: #f1f6ff;
      font-size: 13px;
      font-weight: 600;
    }
    .buyrow input[type=checkbox] {
      display: inline-block;
      flex: none;
      min-height: 0;
      width: 18px;
      height: 18px;
      margin: 1px 0 0;
      accent-color: #27bc84;
      cursor: pointer;
    }
    #buyStatus {
      color: #bbcce3;
      white-space: pre-wrap;
      margin-top: 5px;
      font-size: 11px;
    }
    #state { color: #b5dcff; }
    #log {
      font: 11px/1.45 ui-monospace, monospace;
      color: #c4d2e4;
      max-height: 105px;
      overflow: auto;
    }
    .running #lamp {
      background: #33df8e;
      animation: pulse 1s infinite alternate;
    }
    #lamp {
      height: 10px;
      width: 10px;
      flex: none;
      border-radius: 50%;
      background: #7388a2;
      display: inline-block;
      margin-right: 7px;
    }
    @keyframes pulse {
      to { opacity: .25; }
    }
  </style>

  <div id="panel">
    <div id="head">
      <div>
        <span id="lamp"></span>
        Khavaji AutoPaint v2.2
      </div>
      <button id="collapse">−</button>
    </div>

    <div id="body">
      <input type="file" id="file"
             accept=".wplace,application/json">

      <button id="import">📂 Загрузить .wplace</button>

      <div class="box" id="template">
        Шаблон не загружен
      </div>

      <div class="box" id="charges">
        Заряды: проверяю…
      </div>

      <div class="track">
        <div class="fill" id="chargesFill"></div>
      </div>

      <div class="box" id="profile">
        👤 Профиль: загружаю…
      </div>

      <div class="track">
        <div class="fill" id="levelFill"></div>
      </div>

      <div class="box" id="autoBuyBox">
        <label class="buyrow">
          <input id="autoBuy" type="checkbox">
          🛒 Автопокупка +5 макс. зарядов (500 💧)
        </label>
        <div id="buyStatus">
          Выключено. Включение разрешает автоматические траты Droplets.
        </div>
      </div>

      <div class="grid3">
        <label>
          Порог ожидания
          <input id="threshold" type="number"
                 min="1" max="10000" value="50">
        </label>
        <label>
          Пикселей / запрос
          <input id="batch" type="number"
                 min="1" max="100" value="1">
        </label>
        <label>
          Пауза, мс
          <input id="delay" type="number"
                 min="300" max="30000" value="1300">
        </label>
      </div>

      <div class="grid3">
        <button id="scan">🔎 Проверить</button>
        <button class="go" id="start">▶ Старт</button>
        <button class="stop" id="stop">■ Стоп</button>
      </div>

      <button id="last">
        📍 Показать последний пиксель
      </button>

      <div class="box" id="progress">
        Совпадает: —
        Осталось: —
        Подтверждено ботом: 0
        Запросов: 0
      </div>

      <div class="track">
        <div class="fill" id="progressFill"></div>
      </div>

      <div class="box" id="state">
        Ожидаю загрузку шаблона.
      </div>

      <div class="box" id="log">
        Журнал действий.
      </div>

      <div class="hint">
        Заряды и баланс: обновление примерно каждые 5 сек.
        Автопокупка тратит все доступные Droplets по 500
        за +5 максимальных зарядов, пока включена.
        При открытии страницы выключена.
        HTTP 403 Cloudflare не обходится.
      </div>
    </div>
  </div>`;

  const $ = id => ui.getElementById(id);

  // ========================================
  // СОСТОЯНИЕ
  // ========================================

  const s = {
    template: null,
    tiles: new Map(),
    running: false,
    stop: false,
    charges: null,
    maxCharges: null,
    chargeChecked: 0,
    chargingError: null,
    chargePromise: null,
    profile: null,
    cursor: 0,
    pass: 0,
    matching: null,
    remaining: null,
    painted: 0,
    requests: 0,
    last: GM_getValue(KEY_LAST, null),
    autoBuyEnabled: false,
    autoBuyBusy: false,
    autoBuyCount: 0,
    autoBuyMessage: 'Автопокупка выключена.'
  };

  const stamp = () =>
    new Date().toLocaleTimeString('ru-RU');

  const log = message => {
    const past = $('log').textContent === 'Журнал действий.'
      ? []
      : $('log').textContent.split('\n');

    $('log').textContent =
      [`[${stamp()}] ${message}`, ...past]
      .slice(0, 9).join('\n');
  };

  const status = (message, kind = 'normal') => {
    $('state').textContent = message;

    $('state').style.color =
      kind === 'error' ? '#ffb7b7' :
      kind === 'ok' ? '#a6ffcc' : '#b5dcff';
  };

  const n = (id, min, max, fallback) => {
    const value = Math.floor(Number($(id).value));

    const out = Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : fallback;

    $(id).value = out;
    return out;
  };

  const settings = () => {
    const v = {
      threshold: n('threshold', 1, 10000, 50),
      batch: n('batch', 1, 100, 1),
      delay: n('delay', 300, 30000, 1300)
    };

    GM_setValue(KEY_SETTINGS, v);
    return v;
  };

  const paintStats = () => {
    const t = s.template;

    $('progress').textContent =
      `Всего пикселей: ${
        t ? t.opaque.toLocaleString('ru-RU') : '—'
      }\n` +
      `Совпадает на последней проверке: ${
        s.matching ?? '—'
      }\n` +
      `Осталось: ${s.remaining ?? '—'}\n` +
      `Подтверждено ботом: ${s.painted}\n` +
      `Запросов / проходов: ${s.requests} / ${s.pass}`;

    $('progressFill').style.width =
      `${t && s.matching !== null
        ? 100 * s.matching / t.opaque
        : 0}%`;

    $('head').classList.toggle('running', s.running);

    $('start').disabled = s.running || !t;
    $('scan').disabled = s.running || !t;
    $('import').disabled = s.running;
    $('stop').disabled = !s.running;
    $('last').disabled = !s.last;
  };

  const showCharges = () => {
    const c = s.charges;
    const max = s.maxCharges;

    const when = s.chargeChecked
      ? ` · ${new Date(s.chargeChecked)
          .toLocaleTimeString('ru-RU')}`
      : '';

    $('charges').textContent = c === null
      ? `Заряды: неизвестно${
          s.chargingError ? '\n' + s.chargingError : ''
        }`
      : `Заряды: ${c.toFixed(1)} / ${
          max ?? '?'
        } (${Math.floor(c)} доступно)${when}`;

    $('chargesFill').style.width =
      `${c !== null && max
        ? Math.min(100, 100 * c / max)
        : 0}%`;
  };

  // ========================================
  // СТАТИСТИКА АККАУНТА
  // ========================================

  const pretty = value =>
    Number.isFinite(value)
      ? new Intl.NumberFormat('ru-RU').format(value)
      : '—';

  const validNumber = value =>
    value === null ||
    value === undefined ||
    value === ''
      ? null
      : Number.isFinite(Number(value))
        ? Number(value)
        : null;

  const formatDuration = ms => {
    if (!Number.isFinite(ms) || ms < 0) return '—';

    let seconds = Math.ceil(ms / 1000);

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    const mins = Math.floor(seconds / 60);
    seconds %= 60;

    return [
      days ? `${days} д` : '',
      hours ? `${hours} ч` : '',
      mins ? `${mins} мин` : '',
      seconds && !days ? `${seconds} сек` : ''
    ].filter(Boolean).join(' ') || '0 сек';
  };

  function showProfile(me) {
    if (!me || typeof me !== 'object') return;

    const total = validNumber(me.pixelsPainted);
    const apiLevel = validNumber(me.level);
    const droplets = validNumber(me.droplets);

    const name =
      typeof me.name === 'string' && me.name.trim()
        ? me.name.trim()
        : '—';

    const level = apiLevel === null
      ? total === null
        ? null
        : 1 + Math.floor(
            Math.pow(Math.max(0, total) / 30, 0.65)
          )
      : Math.max(1, Math.floor(apiLevel));

    let toNext = null;
    let inLevel = null;
    let target = null;
    let progress = 0;

    if (level !== null && total !== null) {
      const from = Math.ceil(
        30 * Math.pow(level - 1, 1 / 0.65) - 1e-9
      );

      target = Math.ceil(
        30 * Math.pow(level, 1 / 0.65) - 1e-9
      );

      toNext = Math.max(0, target - total);
      inLevel = Math.max(0, total - from);

      const totalStep = Math.max(1, target - from);

      progress = Math.min(
        100,
        Math.max(0, (inLevel / totalStep) * 100)
      );
    }

    const current = validNumber(me?.charges?.count);
    const maximum = validNumber(me?.charges?.max);
    const cooldown = validNumber(me?.charges?.cooldownMs);

    const timeToFull =
      current !== null &&
      maximum !== null &&
      cooldown !== null
        ? formatDuration(
            Math.max(0, maximum - current) * cooldown
          )
        : '—';

    const nextCharge =
      current !== null &&
      cooldown !== null &&
      maximum !== null &&
      current < maximum
        ? formatDuration(
            Math.max(0, Math.ceil(current) - current)
            * cooldown
          )
        : maximum !== null &&
          current !== null &&
          current >= maximum
          ? 'полный запас'
          : '—';

    const country =
      typeof me.country === 'string'
        ? me.country
        : null;

    const alliance = validNumber(me.allianceId);

    $('profile').textContent =
      `👤 Аккаунт: ${name}${
        country ? ` (${country})` : ''
      }\n` +
      `🏅 Уровень: ${
        level === null ? '—' : level
      }\n` +
      `⬆️ До уровня ${
        level === null ? '?' : level + 1
      }: ${pretty(toNext)} пикс.\n` +
      `🎨 Всего нарисовано: ${
        pretty(total)
      } пикс.\n` +
      `💧 Droplets: ${
        pretty(droplets)
      }\n` +
      `📊 Прогресс уровня: ${
        Math.round(progress)
      }%\n` +
      `⚡ До следующего заряда: ${
        nextCharge
      }\n` +
      `🔋 До полного запаса: ${
        timeToFull
      }` +
      (alliance !== null
        ? `\n🤝 ID альянса: ${alliance}`
        : '');

    $('levelFill').style.width = `${progress}%`;

    s.profile = me;
    showBuy();
  }

  // ========================================
  // АВТОПОКУПКА +5 МАКСИМАЛЬНЫХ ЗАРЯДОВ
  // ========================================

  const UPGRADE_ID = 70;
  const UPGRADE_PRICE = 500;
  const UPGRADE_MAX_INCREASE = 5;

  function showBuy() {
    const balance = validNumber(s.profile?.droplets);

    const possible = balance === null
      ? '—'
      : Math.floor(
          Math.max(0, balance) / UPGRADE_PRICE
        );

    const mode = s.autoBuyEnabled
      ? s.autoBuyBusy
        ? 'Проверяю / покупаю'
        : 'Включено'
      : 'Выключено';

    $('buyStatus').textContent =
      `${mode} · Droplets: ${pretty(balance)} · ` +
      `Доступно улучшений: ${possible}\n` +
      `Куплено за текущую сессию: ${
        s.autoBuyCount
      } × (+5)\n` +
      s.autoBuyMessage;

    $('autoBuy').checked = s.autoBuyEnabled;
  }

  function turnOffBuy(reason, isError = false) {
    s.autoBuyEnabled = false;
    s.autoBuyMessage = reason;

    showBuy();

    log((isError ? '⚠ ' : '') + reason);
  }

  function pauseBuy(ms) {
    return new Promise(
      resolve => setTimeout(resolve, ms)
    );
  }

  async function buyOneUpgrade() {
    // Обязательно получаем новый баланс перед покупкой.
    await charges();

    const beforeDroplets = validNumber(
      s.profile?.droplets
    );

    const beforeMax = validNumber(
      s.profile?.charges?.max
    );

    if (
      beforeDroplets === null ||
      beforeMax === null
    ) {
      throw new Error(
        'Не удалось прочитать баланс Droplets ' +
        'или максимум зарядов в /me.'
      );
    }

    if (
      beforeDroplets < UPGRADE_PRICE ||
      !s.autoBuyEnabled
    ) {
      return false;
    }

    s.autoBuyMessage =
      'Покупаю +5 макс. зарядов за 500 Droplets…';

    showBuy();

    // Один товар ID 70, количество 1.
    // Не повторяем POST вслепую при ошибке.
    let response;

    try {
      response = await fetch(
        `${API}/purchase`,
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product: {
              id: UPGRADE_ID,
              amount: 1
            }
          })
        }
      );
    } catch (e) {
      throw new Error(
        'Неизвестен результат покупки ' +
        `(сетевая ошибка: ${e.message}). ` +
        'Автопокупка отключена во избежание повтора.'
      );
    }

    const bodyText = await response.text();

    if (
      response.status === 403 &&
      /Just a moment|cloudflare|cf-chl/i.test(bodyText)
    ) {
      throw new Error(
        'Cloudflare 403 на /purchase. ' +
        'Автопокупка остановлена; защиту не обходим.'
      );
    }

    if (!response.ok) {
      throw new Error(
        `Покупка отклонена: HTTP ${response.status}. ` +
        bodyText.slice(0, 120)
      );
    }

    let result;

    try {
      result = JSON.parse(bodyText);
    } catch {
      throw new Error(
        'Сервер вернул неопределённый ответ ' +
        'на покупку. Отключено во избежание повтора.'
      );
    }

    if (
      result?.success !== true ||
      result.error ||
      result.status >= 400
    ) {
      throw new Error(
        'Покупка не подтверждена сервером: ' +
        bodyText.slice(0, 170)
      );
    }

    // Проверяем и прирост лимита, и списание валюты.
    for (const ms of [
      500, 1100, 1900, 3000
    ]) {
      await pauseBuy(ms);

      try {
        await charges();
      } catch {
        continue;
      }

      const afterMax = validNumber(
        s.profile?.charges?.max
      );

      const afterDroplets = validNumber(
        s.profile?.droplets
      );

      if (
        afterMax !== null &&
        afterDroplets !== null &&
        afterMax >=
          beforeMax + UPGRADE_MAX_INCREASE &&
        afterDroplets <=
          beforeDroplets - UPGRADE_PRICE + 10
      ) {
        s.autoBuyCount++;

        s.autoBuyMessage =
          `Успешно: максимум ${
            beforeMax
          } → ${afterMax}, баланс ${
            beforeDroplets
          } → ${afterDroplets}.`;

        log(
          `🛒 Куплено +5 макс. зарядов за 500 💧 ` +
          `(покупка №${s.autoBuyCount}).`
        );

        showBuy();

        return true;
      }
    }

    throw new Error(
      'Покупка получила success, но изменения ' +
      'баланса и максимума не подтверждены. ' +
      'Автопокупка остановлена во избежание ' +
      'повторной траты.'
    );
  }

  async function autoBuyTick() {
    if (
      !s.autoBuyEnabled ||
      s.autoBuyBusy
    ) {
      return;
    }

    s.autoBuyBusy = true;
    showBuy();

    try {
      // Блокировка между вкладками исключает
      // одновременные покупки данным скриптом.
      if (!navigator.locks?.request) {
        throw new Error(
          'Браузер не поддерживает Web Locks: ' +
          'безопасная автопокупка недоступна.'
        );
      }

      await navigator.locks.request(
        'khavaji-wplace-purchase-v22',
        { ifAvailable: true },
        async lock => {
          if (!lock) {
            s.autoBuyMessage =
              'Другая вкладка уже выполняет покупку. ' +
              'Подожду следующей проверки.';
            return;
          }

          let limit = 0;

          while (
            s.autoBuyEnabled &&
            limit < 15
          ) {
            const didBuy =
              await buyOneUpgrade();

            if (!didBuy) {
              s.autoBuyMessage =
                'На счёте меньше 500 Droplets. ' +
                'Ожидаю пополнения.';
              break;
            }

            limit++;

            if (s.autoBuyEnabled) {
              await pauseBuy(850);
            }
          }

          if (
            limit === 15 &&
            s.autoBuyEnabled
          ) {
            s.autoBuyMessage =
              'Выполнено 15 покупок. ' +
              'Продолжение при следующей проверке.';
          }
        }
      );
    } catch (error) {
      turnOffBuy(
        `Автопокупка выключена: ${error.message}`,
        true
      );
    } finally {
      s.autoBuyBusy = false;
      showBuy();
    }
  }

  $('autoBuy').addEventListener(
    'change',
    () => {
      if (!$('autoBuy').checked) {
        turnOffBuy(
          'Автопокупка отключена вручную. ' +
          'Уже отправленная покупка может завершиться.'
        );
        return;
      }

      if (!navigator.locks?.request) {
        turnOffBuy(
          'Автопокупка требует поддержку ' +
          'Web Locks в браузере.',
          true
        );
        return;
      }

      const confirmed = window.confirm(
        'Включить АВТОМАТИЧЕСКУЮ ТРАТУ Droplets?\n\n' +
        'За каждые 500 💧 бот будет покупать ' +
        '+5 МАКСИМАЛЬНЫХ зарядов.\n' +
        'При 800 💧 купит 1 раз, при 1000 💧 — 2 раза.\n' +
        'Покупки продолжатся при поступлении ' +
        'новой валюты, пока галочка включена.\n' +
        'Отключить можно сняв галочку ' +
        '(уже начатая покупка может завершиться).'
      );

      if (!confirmed) {
        turnOffBuy('Включение отменено.');
        return;
      }

      s.autoBuyEnabled = true;
      s.autoBuyMessage =
        'Включено. Проверяю баланс для покупки ' +
        '+5 максимальных зарядов…';

      showBuy();
      void autoBuyTick();
    }
  );

  // ========================================
  // ОЖИДАНИЕ
  // ========================================

  const wait = async ms => {
    const end = Date.now() + ms;

    while (Date.now() < end) {
      if (s.stop) {
        throw new Error('USER_STOP');
      }

      await new Promise(done =>
        setTimeout(
          done,
          Math.min(250, end - Date.now())
        )
      );
    }
  };

  // ========================================
  // КООРДИНАТЫ
  // ========================================

  const locate = i => {
    const t = s.template;

    const gx = t.x + i % t.width;
    const gy = t.y + Math.floor(i / t.width);

    const tx = Math.floor(gx / TILE);
    const ty = Math.floor(gy / TILE);

    return {
      index: i,
      gx, gy, tx, ty,
      px: gx - tx * TILE,
      py: gy - ty * TILE,
      color: t.ids[i]
    };
  };

  const tileKey = (tx, ty) => `${tx}/${ty}`;

  const wpx = longitude =>
    (longitude + 180) * WORLD / 360;

  const wpy = latitude =>
    (
      1 -
      Math.asinh(
        Math.tan(latitude * Math.PI / 180)
      ) / Math.PI
    ) * WORLD / 2;

  // ========================================
  // ЗАГРУЗКА .WPLACE
  // ========================================

  async function decodeWplace(raw) {
    const doc = JSON.parse(raw);

    const im = doc.image;
    const b = doc.bounds;

    if (
      !im?.dataUrl?.startsWith(
        'data:image/png;base64,'
      ) || !b
    ) {
      throw new Error(
        'Это не поддерживаемый .wplace: ' +
        'нужны PNG и bounds.'
      );
    }

    const image = new Image();
    image.src = im.dataUrl;
    await image.decode();

    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (
      !width ||
      !height ||
      width * height > 6000000 ||
      width !== im.width ||
      height !== im.height
    ) {
      throw new Error(
        'Ошибка размеров изображения.'
      );
    }

    const xf = wpx(b.west);
    const yf = wpy(b.north);
    const x2 = wpx(b.east);
    const y2 = wpy(b.south);

    const x = Math.round(xf);
    const y = Math.round(yf);

    if (
      ![xf, yf, x2, y2].every(Number.isFinite) ||
      Math.abs(x2 - xf - width) > 1.1 ||
      Math.abs(y2 - yf - height) > 1.1 ||
      x < 0 ||
      y < 0 ||
      x + width > WORLD ||
      y + height > WORLD
    ) {
      throw new Error(
        'Координаты bounds не совпадают ' +
        'с размерами шаблона.'
      );
    }

    const canvas =
      document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext(
      '2d',
      { willReadFrequently: true }
    );

    ctx.drawImage(image, 0, 0);

    const rgba = ctx.getImageData(
      0, 0, width, height
    ).data;

    const ids =
      new Uint8Array(width * height);

    let opaque = 0;
    const unknown = new Set();

    for (let i = 0; i < ids.length; i++) {
      const p = 4 * i;

      if (rgba[p + 3] < 128) continue;

      const key =
        `${rgba[p]},${rgba[p + 1]},${rgba[p + 2]}`;

      const id = rgb2id.get(key);

      if (id === undefined) {
        unknown.add(key);
        continue;
      }

      ids[i] = id;
      opaque++;
    }

    if (unknown.size) {
      throw new Error(
        'В шаблоне есть цвета вне палитры WPlace: ' +
        [...unknown].slice(0, 3).join(' / ') +
        '. Закраска отменена.'
      );
    }

    if (!opaque) {
      throw new Error(
        'В .wplace нет непрозрачных пикселей.'
      );
    }

    const tiles = [];

    for (
      let ty = Math.floor(y / TILE);
      ty <= Math.floor(
        (y + height - 1) / TILE
      );
      ty++
    ) {
      for (
        let tx = Math.floor(x / TILE);
        tx <= Math.floor(
          (x + width - 1) / TILE
        );
        tx++
      ) {
        tiles.push([tx, ty]);
      }
    }

    return {
      name: String(doc.name || 'Без имени'),
      width,
      height,
      x,
      y,
      ids,
      opaque,
      tiles
    };
  }

  async function loadTemplate(raw, save) {
    const t = await decodeWplace(raw);

    s.template = t;
    s.tiles.clear();
    s.matching = null;
    s.remaining = null;
    s.cursor = 0;

    if (save) {
      GM_setValue(KEY_TEMPLATE, raw);
    }

    $('template').textContent =
      `${t.name} · ${t.width}×${t.height}\n` +
      `Пикселей: ${
        t.opaque.toLocaleString('ru-RU')
      } · плиток: ${t.tiles.length}\n` +
      `Начало: X${t.x}, Y${t.y}`;

    status(
      'Шаблон загружен. Нажми «Проверить» или «Старт».',
      'ok'
    );

    log(`Шаблон «${t.name}» загружен.`);
    paintStats();
  }

  // ========================================
  // ЧТЕНИЕ КАРТЫ
  // ========================================

  function getTile(tx, ty) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 25000,

        url:
          `${API}/files/s0/tiles/${tx}/${ty}.png` +
          `?v=${Date.now()}_` +
          Math.random().toString(36).slice(2),

        headers: {
          'Cache-Control': 'no-cache'
        },

        onload: r => {
          if (
            r.status === 200 &&
            r.response
          ) {
            resolve(
              new Blob(
                [r.response],
                { type: 'image/png' }
              )
            );
          } else {
            reject(
              new Error(
                `Плитка ${tx}/${ty}: HTTP ${r.status}`
              )
            );
          }
        },

        ontimeout: () =>
          reject(
            new Error(
              'Тайм-аут загрузки карты.'
            )
          ),

        onerror: () =>
          reject(
            new Error(
              'Ошибка загрузки карты.'
            )
          )
      });
    });
  }

  async function refresh(
    keys = s.template.tiles
  ) {
    for (
      let i = 0;
      i < keys.length;
      i += 4
    ) {
      if (s.stop) {
        throw new Error('USER_STOP');
      }

      const chunk = await Promise.all(
        keys.slice(i, i + 4).map(
          async ([tx, ty]) => {
            const bmp = await createImageBitmap(
              await getTile(tx, ty)
            );

            try {
              if (
                bmp.width !== TILE ||
                bmp.height !== TILE
              ) {
                throw new Error(
                  `Плитка ${tx}/${ty}: неверный размер.`
                );
              }

              const c =
                document.createElement('canvas');

              c.width = TILE;
              c.height = TILE;

              const ctx = c.getContext(
                '2d',
                { willReadFrequently: true }
              );

              ctx.drawImage(bmp, 0, 0);

              return [
                tileKey(tx, ty),
                ctx.getImageData(
                  0, 0, TILE, TILE
                ).data
              ];
            } finally {
              bmp.close();
            }
          }
        )
      );

      for (const [key, data] of chunk) {
        s.tiles.set(key, data);
      }
    }
  }

  // ========================================
  // СРАВНЕНИЕ ПИКСЕЛЕЙ
  // ========================================

  const same = p => {
    const tile = s.tiles.get(
      tileKey(p.tx, p.ty)
    );

    if (!tile) {
      throw new Error(
        `Нет плитки ${p.tx}/${p.ty}.`
      );
    }

    const j = 4 * (
      p.py * TILE + p.px
    );

    const color =
      rgbTriples[p.color];

    return (
      tile[j + 3] >= 128 &&
      tile[j] === color[0] &&
      tile[j + 1] === color[1] &&
      tile[j + 2] === color[2]
    );
  };

  const countMap = () => {
    let matching = 0;
    let remaining = 0;

    for (
      let i = 0;
      i < s.template.ids.length;
      i++
    ) {
      if (!s.template.ids[i]) continue;

      if (same(locate(i))) {
        matching++;
      } else {
        remaining++;
      }
    }

    s.matching = matching;
    s.remaining = remaining;

    paintStats();

    return remaining;
  };

  function nextBatch(limit) {
    const arr = [];

    while (
      s.cursor < s.template.ids.length &&
      arr.length < limit
    ) {
      const i = s.cursor++;

      if (!s.template.ids[i]) continue;

      const p = locate(i);

      if (!same(p)) {
        arr.push(p);
      }
    }

    return arr;
  }

  // ========================================
  // ЗАРЯДЫ И ПРОФИЛЬ
  // ========================================

  async function charges() {
    if (s.chargePromise) {
      return s.chargePromise;
    }

    s.chargePromise = (async () => {
      const res = await fetch(
        `${API}/me`,
        {
          credentials: 'include',
          cache: 'no-store'
        }
      );

      if (!res.ok) {
        throw new Error(
          `/me: HTTP ${res.status}`
        );
      }

      const me = await res.json();

      const count =
        Number(me?.charges?.count);

      const max =
        Number(me?.charges?.max);

      if (!Number.isFinite(count)) {
        throw new Error(
          'В /me отсутствует charges.count.'
        );
      }

      s.charges = Math.max(0, count);

      s.maxCharges =
        Number.isFinite(max) && max > 0
          ? max
          : null;

      s.chargeChecked = Date.now();
      s.chargingError = null;

      showCharges();
      showProfile(me);

      return Math.floor(s.charges);
    })()
      .catch(e => {
        s.chargingError = e.message;
        showCharges();
        throw e;
      })
      .finally(() => {
        s.chargePromise = null;
      });

    return s.chargePromise;
  }

  // ========================================
  // ОЖИДАНИЕ ЗАРЯДОВ
  // ========================================

  async function waitForCharges(threshold) {
    let announced = false;

    while (!s.stop) {
      let available;

      try {
        available = await charges();
      } catch (e) {
        throw new Error(
          'Невозможно проверить заряды: ' +
          e.message
        );
      }

      const required = s.maxCharges
        ? Math.min(
            threshold,
            Math.floor(s.maxCharges)
          )
        : threshold;

      if (available >= required) {
        status(
          `Набралось ${available} зарядов ` +
          `(порог ${required}). ` +
          'Возобновляю проверку карты…',
          'ok'
        );

        log(
          `Заряды восстановились: ` +
          `${available}/${s.maxCharges ?? '?'}.`
        );

        return;
      }

      status(
        '⏳ Заряды закончились или ниже порога.\n' +
        `${s.charges.toFixed(1)}/` +
        `${s.maxCharges ?? '?'}\n` +
        `Жду ${required} зарядов.\n` +
        'Следующая проверка через 5 сек.'
      );

      if (!announced) {
        log(
          `Ожидание зарядов до ${required}. ` +
          'Автопродолжение включено.'
        );

        announced = true;
      }

      await wait(POLL_MS);
    }

    throw new Error('USER_STOP');
  }

  // ========================================
  // ПОДГОТОВКА ПАКЕТА
  // ========================================

  const makeBody = pixels => {
    const groups = new Map();

    for (const p of pixels) {
      const key = tileKey(p.tx, p.ty);

      if (!groups.has(key)) {
        groups.set(key, {
          x: p.tx,
          y: p.ty,
          pixels: {
            x: [],
            y: [],
            colors: []
          }
        });
      }

      const out = groups.get(key).pixels;

      out.x.push(p.px);
      out.y.push(p.py);
      out.colors.push(p.color);
    }

    return {
      season: 0,
      tiles: [...groups.values()]
    };
  };

  // ========================================
  // ОТПРАВКА ПИКСЕЛЕЙ
  // ========================================

  async function submit(pixels) {
    s.requests++;
    paintStats();

    const res = await fetch(
      `${API}/paint`,
      {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(
          makeBody(pixels)
        )
      }
    );

    const reply = await res.text();

    if (
      res.status === 403 &&
      /Just a moment|cloudflare|cf-chl/i.test(reply)
    ) {
      throw new Error(
        'HTTP 403: Cloudflare блокирует /paint. ' +
        'Это НЕ конец зарядов. Запросы остановлены; ' +
        'автоматический обход защиты не выполняется.'
      );
    }

    if (!res.ok) {
      const now = await charges()
        .catch(() => null);

      if (now === 0) {
        return 'NO_CHARGES';
      }

      throw new Error(
        `/paint: HTTP ${res.status}. ` +
        reply.slice(0, 130)
      );
    }

    if (reply) {
      let parsed;

      try {
        parsed = JSON.parse(reply);
      } catch {
        // Ответ может быть текстовым.
      }

      if (
        parsed &&
        (
          parsed.ok === false ||
          parsed.success === false ||
          parsed.error ||
          parsed.err
        )
      ) {
        const now = await charges()
          .catch(() => null);

        if (now === 0) {
          return 'NO_CHARGES';
        }

        throw new Error(
          'Сервер отклонил пиксели: ' +
          reply.slice(0, 170)
        );
      }
    }

    return 'OK';
  }

  // ========================================
  // ПОДТВЕРЖДЕНИЕ ЗАКРАСКИ
  // ========================================

  async function verify(pixels) {
    const tileList = [
      ...new Map(
        pixels.map(p => [
          tileKey(p.tx, p.ty),
          [p.tx, p.ty]
        ])
      ).values()
    ];

    for (const delay of [
      700, 1500, 3000, 5000
    ]) {
      await wait(delay);

      await refresh(tileList);

      if (pixels.every(same)) {
        return true;
      }
    }

    return false;
  }

  // ========================================
  // ПРОВЕРКА КАРТЫ
  // ========================================

  async function scan() {
    status(
      '🔎 Проверяю актуальные плитки карты…'
    );

    await refresh();

    const remaining = countMap();

    status(
      `Проверено: ${s.matching} совпадают, ` +
      `${remaining} требуют закраски.`,
      'ok'
    );

    log(
      `Проверка: совпадает ${s.matching}, ` +
      `осталось ${remaining}.`
    );
  }

  // ========================================
  // ОСНОВНОЙ ЦИКЛ ЗАКРАСКИ
  // ========================================

  async function paintLoop() {
    const cfg = settings();

    s.cursor = 0;
    s.pass = 0;

    while (!s.stop) {
      s.pass++;

      status(
        `🔄 Проход ${s.pass}: ` +
        'сканирование с верхнего левого пикселя…'
      );

      await refresh();

      if (countMap() === 0) {
        status(
          '✅ Все пиксели совпадают с шаблоном.',
          'ok'
        );

        log('Всё закрашено.');
        return;
      }

      s.cursor = 0;

      let available = await charges();

      if (available === 0) {
        await waitForCharges(cfg.threshold);
        continue;
      }

      while (!s.stop) {
        if (available <= 0) {
          await waitForCharges(cfg.threshold);
          break;
        }

        const pixels = nextBatch(
          Math.min(available, cfg.batch)
        );

        if (!pixels.length) {
          break;
        }

        const p = pixels[0];

        status(
          `🎨 Рисую ${pixels.length} пикс.\n` +
          `Координаты: ${p.gx}, ${p.gy}\n` +
          `Заряды: ${
            s.charges?.toFixed(1) ?? '?'
          }\n` +
          `Проход: ${s.pass}`
        );

        const result = await submit(pixels);

        if (result === 'NO_CHARGES') {
          await waitForCharges(
            cfg.threshold
          );
          break;
        }

        // HTTP 200 не является доказательством закраски.
        const verified =
          await verify(pixels);

        if (!verified) {
          countMap();

          throw new Error(
            'Сервер ответил успешно, но не все ' +
            'пиксели появились на карте. ' +
            'Остановлено без повторной траты зарядов.'
          );
        }

        s.painted += pixels.length;

        s.last =
          pixels[pixels.length - 1];

        GM_setValue(KEY_LAST, {
          gx: s.last.gx,
          gy: s.last.gy,
          time: Date.now()
        });

        s.matching = Math.min(
          s.template.opaque,
          (s.matching ?? 0) + pixels.length
        );

        s.remaining = Math.max(
          0,
          (s.remaining ?? 0) - pixels.length
        );

        paintStats();

        log(
          `✓ Подтверждено ${pixels.length}; ` +
          `последний: ${s.last.gx}, ${s.last.gy}.`
        );

        available = await charges();

        if (s.stop) break;

        await wait(cfg.delay);

        // Свежая карта перед следующим пакетом.
        await refresh();
      }

      if (s.stop) {
        break;
      }
    }

    throw new Error('USER_STOP');
  }

  // ========================================
  // ОБРАБОТКА ОШИБОК
  // ========================================

  async function task(fn) {
    if (s.running) return;

    s.running = true;
    s.stop = false;

    paintStats();

    try {
      await fn();
    } catch (e) {
      if (
        s.stop ||
        e.message === 'USER_STOP'
      ) {
        status(
          '■ Остановлено пользователем.',
          'ok'
        );

        log(
          'Пользователь остановил работу.'
        );
      } else {
        status(
          `❌ ${e.message}`,
          'error'
        );

        log(
          `ОШИБКА: ${e.message}`
        );

        console.error(
          '[Khavaji v2.2]',
          e
        );
      }
    } finally {
      s.running = false;
      paintStats();
    }
  }

  // ========================================
  // ПОКАЗАТЬ ПОСЛЕДНИЙ ПИКСЕЛЬ
  // ========================================

  const jumpLast = () => {
    const p = s.last;

    if (!p) return;

    const lng =
      (p.gx + 0.5) / WORLD * 360 - 180;

    const lat =
      Math.atan(
        Math.sinh(
          Math.PI *
          (1 - 2 * (p.gy + 0.5) / WORLD)
        )
      ) * 180 / Math.PI;

    const url =
      `https://wplace.live/?lat=${lat}` +
      `&lng=${lng}&zoom=18&select=1`;

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );

    log(
      'Показан последний подтверждённый ' +
      `пиксель: ${p.gx}, ${p.gy}.`
    );
  };

  // ========================================
  // КНОПКИ
  // ========================================

  $('import').onclick = () =>
    $('file').click();

  $('file').onchange = async () => {
    const f = $('file').files?.[0];

    if (!f) return;

    await task(async () => {
      await loadTemplate(
        await f.text(),
        true
      );
    });

    $('file').value = '';
  };

  $('scan').onclick = () =>
    task(scan);

  $('start').onclick = () =>
    task(paintLoop);

  $('stop').onclick = () => {
    s.stop = true;

    status(
      'Остановка после текущего ' +
      'запроса или проверки…'
    );
  };

  $('last').onclick = jumpLast;

  $('collapse').onclick = () => {
    $('body').classList.toggle('hide');

    $('collapse').textContent =
      $('body').classList.contains('hide')
        ? '+'
        : '−';
  };

  // ========================================
  // ПЕРЕМЕЩЕНИЕ ПАНЕЛИ
  // ========================================

  let dragging = null;

  $('head').onpointerdown = e => {
    if (e.target.closest('button')) return;

    const r = el.getBoundingClientRect();

    dragging = {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };

    $('head').setPointerCapture(
      e.pointerId
    );
  };

  $('head').onpointermove = e => {
    if (!dragging) return;

    const r = el.getBoundingClientRect();

    el.style.left =
      `${
        Math.max(
          0,
          Math.min(
            innerWidth - r.width,
            e.clientX - dragging.x
          )
        )
      }px`;

    el.style.top =
      `${
        Math.max(
          0,
          Math.min(
            innerHeight - 30,
            e.clientY - dragging.y
          )
        )
      }px`;

    el.style.right = 'auto';
  };

  $('head').onpointerup =
    $('head').onpointercancel =
      () => {
        dragging = null;
      };

  // ========================================
  // ВОССТАНОВЛЕНИЕ НАСТРОЕК
  // ========================================

  const config = GM_getValue(
    KEY_SETTINGS,
    {}
  );

  if (
    config &&
    typeof config === 'object'
  ) {
    for (const key of [
      'batch',
      'delay',
      'threshold'
    ]) {
      if (config[key] !== undefined) {
        $(key).value = config[key];
      }
    }
  }

  for (const key of [
    'batch',
    'delay',
    'threshold'
  ]) {
    $(key).onchange = settings;
  }

  // ========================================
  // ВОССТАНОВЛЕНИЕ ШАБЛОНА
  // ========================================

  const saved = GM_getValue(
    KEY_TEMPLATE,
    ''
  );

  if (saved) {
    loadTemplate(saved, false)
      .catch(e => {
        status(
          'Сохранённый шаблон: ' +
          e.message,
          'error'
        );
      });
  }

  paintStats();
  showCharges();
  showBuy();

  // ========================================
  // АВТООБНОВЛЕНИЕ
  // ========================================

  charges().catch(e => {
    log(
      'Не удалось обновить заряды: ' +
      e.message
    );
  });

  setInterval(() => {
    if (
      document.visibilityState === 'hidden' &&
      !s.autoBuyEnabled
    ) {
      return;
    }

    charges()
      .then(() => {
        if (
          s.autoBuyEnabled &&
          !s.autoBuyBusy
        ) {
          void autoBuyTick();
        }
      })
      .catch(e => {
        if (!s.running) {
          log(
            'Заряды: ' + e.message
          );
        }
      });
  }, POLL_MS);

  document.addEventListener(
    'visibilitychange',
    () => {
      if (
        document.visibilityState === 'visible'
      ) {
        charges()
          .then(() => {
            if (
              s.autoBuyEnabled &&
              !s.autoBuyBusy
            ) {
              void autoBuyTick();
            }
          })
          .catch(() => {});
      }
    }
  );
})();
