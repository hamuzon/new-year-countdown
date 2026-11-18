const theme = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark' : 'light';
document.documentElement.classList.add(theme);

const languageParam = new URLSearchParams(location.search).get('lang');
const isJa = languageParam ? languageParam !== 'en' : navigator.language.toLowerCase().includes('ja');
const translations = isJa ? {
    title: year => year + '年カウントダウン',
    pageTitle: year => year + '年カウントダウン！',
    description: year => year + '年（来年）の元旦までの残り時間をリアルタイムでカウントダウン表示します。',
    countText: year => year + '年',
    countLabel: 'まで残り',
    dayUnit: '日',
    tzLabel: 'タイムゾーンを選択',
    tzCurrent: tz => '現在: ' + tz,
    settingsTitle: '設定',
    langLabel: '言語を選択',
    yearSep: '年 / ',
    monthSep: '月 / ',
    daySep: '日'
} : {
    title: year => 'Countdown to ' + year,
    pageTitle: year => 'Countdown to ' + year + '!',
    description: year => "Real-time countdown to New Year's Day " + year + '.',
    countText: year => String(year),
    countLabel: 'Time Remaining',
    dayUnit: 'd',
    tzLabel: 'Select Timezone',
    tzCurrent: tz => 'Current: ' + tz,
    settingsTitle: 'Settings',
    langLabel: 'Select Language',
    yearSep: '/',
    monthSep: '/',
    daySep: ''
};
document.documentElement.lang = isJa ? 'ja' : 'en';

const browserTz = (() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';
    } catch(e) {
        return 'Asia/Tokyo';
    }
})();

const urlParams = new URLSearchParams(location.search);
const currentTz = urlParams.get('tz') || browserTz;
const currentYear = Number(new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    timeZone: currentTz
}).format(new Date()));
const initialNextYear = currentYear + 1;

document.title = translations.title(initialNextYear);
document.getElementById('page_title').textContent = translations.pageTitle(initialNextYear);
document.querySelector('meta[name="description"]').content = translations.description(initialNextYear);
document.querySelector('meta[property="og:title"]').content = translations.pageTitle(initialNextYear);
document.querySelector('meta[property="og:description"]').content = translations.description(initialNextYear);
document.querySelector('meta[name="twitter:title"]').content = translations.pageTitle(initialNextYear);
document.querySelector('meta[name="twitter:description"]').content = translations.description(initialNextYear);
document.querySelector('.countText').textContent = translations.countText(initialNextYear);
document.querySelector('.countLabel').textContent = translations.countLabel;
document.getElementById('dayUnit').textContent = translations.dayUnit;
document.querySelector('.panelLabel[for="tzSelect"]').lastChild.textContent = translations.tzLabel;
document.getElementById('tzCurrentDetail').textContent = translations.tzCurrent(currentTz);
document.querySelector('.panelLabel[for="langSelect"]').lastChild.textContent = translations.langLabel;
document.getElementById('tzSettingsBtn').title = translations.settingsTitle;
document.getElementById('tzSettingsBtn').setAttribute('aria-label', translations.settingsTitle);
document.getElementById('tzHeaderBtn').setAttribute('aria-label', currentTz);
document.getElementById('langSelect').value = isJa ? 'ja' : 'en';
document.querySelector('.yearSep').textContent = translations.yearSep;
document.querySelector('.monthSep').textContent = translations.monthSep;
document.querySelector('.daySep').textContent = translations.daySep;

const yearForCopyright = currentYear > 2025 ? '2025 ~ ' + currentYear : '2025';
const copyrightHosts = {
    'hamusata.f5.si': ['https://hamusata.f5.si', '@hamusata'],
    'hamuzon-jp.f5.si': ['https://hamuzon-jp.f5.si', '@hamuzon'],
    'hamuzon.web.fc2.com': ['https://hamuzon.web.fc2.com', '@hamuzon'],
    'hamuzon.github.io': ['https://hamuzon.github.io', '@hamuzon']
};
const copyright = copyrightHosts[location.hostname];
document.getElementById('footer-copy').innerHTML = copyright
    ? '&copy; ' + yearForCopyright + ' New Year Countdown <a href="' + copyright[0] + '" target="_blank" rel="noopener noreferrer">' + copyright[1] + '</a>'
    : '&copy; ' + yearForCopyright + ' New Year Countdown';
