    let lastYearNum = 0;
    let timeOffset = 0;
    let newYearShown = false;



    function getCityDisplayName(z) {
        if (isJa && CITY_JA[z]) return CITY_JA[z];

        const parts = z.split('/');
        return parts[parts.length - 1].replace(/_/g, ' ');
    }

    function getTimeZoneInfo(tzName, date) {
        const d = date || new Date();

        try {
            const parts = new Intl.DateTimeFormat(
                isJa ? 'ja-JP' : 'en-US',
                {
                    timeZone: tzName,
                    timeZoneName: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hourCycle: 'h23'
                }
            ).formatToParts(d);

            const tzLong = (
                parts.find(p => p.type === 'timeZoneName') || {}
            ).value || '';

            const h = (parts.find(p => p.type === 'hour') || {}).value || '00';
            const m = (parts.find(p => p.type === 'minute') || {}).value || '00';
            const s = (parts.find(p => p.type === 'second') || {}).value || '00';

            const offParts = new Intl.DateTimeFormat('en-US', {
                timeZone: tzName,
                timeZoneName: 'longOffset'
            }).formatToParts(d);

            const gmt = (
                offParts.find(p => p.type === 'timeZoneName') || {}
            ).value || 'GMT+00:00';

            const utcOffset = gmt.replace('GMT', 'UTC');

            let minutes = 0;
            const match = gmt.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?/);

            if (match) {
                const sign = match[1] === '-' ? -1 : 1;
                minutes = sign * (
                    parseInt(match[2], 10) * 60 +
                    parseInt(match[3] || '0', 10)
                );
            }

            return {
                tz: tzName,
                city: getCityDisplayName(tzName),
                name: tzLong,
                utcOffset,
                offsetMinutes: minutes,
                time: h + ':' + m + ':' + s,
                shortTime: h + ':' + m
            };

        } catch(e) {
            return {
                tz: tzName,
                city: tzName,
                name: tzName,
                utcOffset: 'UTC',
                offsetMinutes: 0,
                time: '--:--:--',
                shortTime: '--:--'
            };
        }
    }

    (function() {
        const sel = document.getElementById('tzSelect');

        let zones = [];

        try {
            if (
                typeof Intl !== 'undefined' &&
                typeof Intl.supportedValuesOf === 'function'
            ) {
                zones = Intl.supportedValuesOf('timeZone');
            }
        } catch(e) {}

        if (zones.length === 0) {
            zones = [
                'UTC',
                'Asia/Tokyo',
                'America/New_York',
                'Europe/London',
                'Europe/Paris',
                'Asia/Singapore',
                'Australia/Sydney'
            ];
        }

        const now = new Date();

        const utcInfo = getTimeZoneInfo('UTC', now);
        const utcGroup = document.createElement('optgroup');
        utcGroup.label = 'UTC';

        const utcOption = document.createElement('option');
        utcOption.value = 'UTC';
        utcOption.textContent = utcInfo.city + ' - ' + utcInfo.utcOffset;
        utcOption.selected = currentTz === 'UTC';
        utcGroup.appendChild(utcOption);

        const jstOption = document.createElement('option');
        jstOption.value = 'Asia/Tokyo';
        jstOption.textContent = isJa ? 'JST（日本時間）' : 'JST (Japan Standard Time)';
        jstOption.selected = currentTz === 'Asia/Tokyo';
        utcGroup.appendChild(jstOption);

        sel.appendChild(utcGroup);

        const tzList = zones
            .filter(z => z !== 'UTC')
            .map(z => getTimeZoneInfo(z, now));

        tzList.sort((a, b) => {
            if (a.offsetMinutes !== b.offsetMinutes) {
                return a.offsetMinutes - b.offsetMinutes;
            }

            return a.city.localeCompare(b.city);
        });

        tzList.forEach(info => {
            const opt = document.createElement('option');

            opt.value = info.tz;

            opt.textContent = info.city + ' - ' + info.utcOffset;

            if (info.tz === currentTz) {
                opt.selected = true;
            }

            sel.appendChild(opt);
        });

        if (currentTz !== 'UTC' && !zones.includes(currentTz)) {
            const opt = document.createElement('option');
            opt.value = currentTz;
            opt.textContent = currentTz;
            opt.selected = true;
            sel.insertBefore(opt, sel.firstChild);
        }
    })();

    function toggleTzPanel() {
        const panel = document.getElementById('tzPanel');
        const isOpen = panel.style.display === 'block';

        panel.style.display = isOpen ? 'none' : 'block';

        document.getElementById('tzSettingsBtn')
            .setAttribute('aria-expanded', String(!isOpen));

        document.getElementById('tzHeaderBtn')
            .setAttribute('aria-expanded', String(!isOpen));
    }

    document.getElementById('tzSettingsBtn')
        .addEventListener('click', toggleTzPanel);

    document.getElementById('tzHeaderBtn')
        .addEventListener('click', toggleTzPanel);

    document.addEventListener('click', function(e) {
        const panel = document.getElementById('tzPanel');
        const settings = document.getElementById('tzSettingsBtn');
        const headerBtn = document.getElementById('tzHeaderBtn');

        if (
            panel.style.display === 'block' &&
            !panel.contains(e.target) &&
            !settings.contains(e.target) &&
            !headerBtn.contains(e.target)
        ) {
            panel.style.display = 'none';
            settings.setAttribute('aria-expanded', 'false');
            headerBtn.setAttribute('aria-expanded', 'false');
        }
    });

    document.getElementById('tzSelect')
        .addEventListener('change', function() {
            const u = new URL(location.href);

            if (this.value === browserTz) {
                u.searchParams.delete('tz');
            } else {
                u.searchParams.set('tz', this.value);
            }

            location.href = u.toString();
        });

    document.getElementById('langSelect')
        .addEventListener('change', function() {
            const u = new URL(location.href);

            if (this.value === 'ja') {
                u.searchParams.delete('lang');
            } else {
                u.searchParams.set('lang', this.value);
            }

            location.href = u.toString();
        });

    async function syncTime() {
        let hostPref = null;

        const hn = location.hostname;

        if (hn.includes('hamuzon-jp.f5.si')) {
            hostPref = 'hamuzon-jp';
        } else if (hn.includes('hamusata.f5.si')) {
            hostPref = 'hamusata';
        }

        const encTz = encodeURIComponent(currentTz || 'UTC');

        function toMs(value) {
            if (typeof value !== 'number' || !isFinite(value)) return null;

            // 1e11 separates seconds (~1.7e9) from milliseconds (~1.7e12).
            return value > 1e11 ? value : value * 1000;
        }

        // "2026-11-18T06:54:25.938" style strings have no offset info, so they
        // must be interpreted as wall clock time in `tz`.
        function parseWallClock(str, tz) {
            const m = String(str).trim().match(
                /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/
            );

            if (!m) return null;

            return wallClockToUtcMs({
                year: parseInt(m[1], 10),
                month: parseInt(m[2], 10),
                day: parseInt(m[3], 10),
                hour: parseInt(m[4], 10),
                minute: parseInt(m[5], 10),
                second: m[6] ? parseInt(m[6], 10) : 0,
                millisecond: m[7]
                    ? parseInt((m[7] + '00').slice(0, 3), 10)
                    : 0
            }, tz || currentTz);
        }

        function parseData(d) {
            if (d === null || d === undefined) return null;

            if (typeof d === 'number') return toMs(d);

            if (typeof d === 'string') {
                const trimmed = d.trim();

                if (trimmed === '') return null;

                const num = Number(trimmed);

                if (isFinite(num)) return toMs(num);

                // A date-time without an offset must not be parsed with
                // Date.parse(), because that would use the browser timezone.
                const wall = parseWallClock(trimmed, currentTz);

                if (wall !== null) return wall;

                const parsed = Date.parse(trimmed);

                return isNaN(parsed) ? null : parsed;
            }

            if (typeof d !== 'object') return null;

            const direct = toMs(d.unix_ms) ?? toMs(d.unixMs) ?? toMs(d.unixtime);

            if (direct !== null) return direct;

            const timestamp = toMs(d.timestamp);

            if (timestamp !== null) return timestamp;

            if (typeof d.iso === 'string') {
                const parsed = Date.parse(d.iso);

                if (!isNaN(parsed)) return parsed;
            }

            if (typeof d.utc_datetime === 'string') {
                const parsed = Date.parse(d.utc_datetime);

                if (!isNaN(parsed)) return parsed;
            }

            const tz = typeof d.timeZone === 'string' ? d.timeZone : currentTz;

            if (typeof d.dateTime === 'string') {
                const wall = parseWallClock(d.dateTime, tz);

                if (wall !== null) return wall;
            }

            if (
                typeof d.year === 'number' &&
                typeof d.month === 'number' &&
                typeof d.day === 'number'
            ) {
                return wallClockToUtcMs({
                    year: d.year,
                    month: d.month,
                    day: d.day,
                    hour: typeof d.hour === 'number' ? d.hour : 0,
                    minute: typeof d.minute === 'number' ? d.minute : 0,
                    second: typeof d.seconds === 'number'
                        ? d.seconds
                        : (typeof d.second === 'number' ? d.second : 0),
                    millisecond: typeof d.milliSeconds === 'number'
                        ? d.milliSeconds
                        : (typeof d.milliseconds === 'number' ? d.milliseconds : 0)
                }, tz);
            }

            return null;
        }

        const hamuzonEndpoints = [
            'https://api-time.hamuzon-jp.f5.si/api/?timeZone=' + encTz,
            'https://api-time.hamuzon-jp.f5.si/api/time',
            'https://api-time.hamuzon-jp.f5.si/'
        ];

        const hamusataEndpoints = [
            'https://api-time.hamusata.f5.si/api/?timeZone=' + encTz,
            'https://api-time.hamusata.f5.si/api/time',
            'https://api-time.hamusata.f5.si/'
        ];

        const externalEndpoint =
            'https://timeapi.io/api/Time/current/zone?timeZone=' + encTz;

        let urls = [];

        if (hostPref === 'hamuzon-jp') {
            urls = [...hamuzonEndpoints, ...hamusataEndpoints, externalEndpoint];
        } else if (hostPref === 'hamusata') {
            urls = [...hamusataEndpoints, ...hamuzonEndpoints, externalEndpoint];
        } else {
            urls = [...hamuzonEndpoints, ...hamusataEndpoints, externalEndpoint];
        }

        for (const endpoint of urls) {
            try {
                const sendTime = Date.now();

                const res = await fetch(endpoint, {
                    cache: 'no-store'
                });

                if (!res.ok) continue;

                const receiveTime = Date.now();
                const data = await res.json();
                const serverMs = parseData(data);

                if (!serverMs || isNaN(serverMs)) continue;

                const rtt = receiveTime - sendTime;

                timeOffset = serverMs + rtt / 2 - receiveTime;

                return;

            } catch(e) {}
        }
    }

    function getNow() {
        return new Date(Date.now() + timeOffset);
    }

    const tzFormatterCache = new Map();

    function getTzFormatter(tz) {
        let formatter = tzFormatterCache.get(tz);

        if (!formatter) {
            formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23'
            });

            tzFormatterCache.set(tz, formatter);
        }

        return formatter;
    }

    function getPartsInZone(date, tz) {
        let parts;

        try {
            parts = getTzFormatter(tz).formatToParts(date);
        } catch(e) {
            if (tz === 'UTC') throw e;

            return getPartsInZone(date, 'UTC');
        }

        const g = type => {
            const item = parts.find(p => p.type === type);
            return parseInt(item ? item.value : '0', 10);
        };

        return {
            year: g('year'),
            month: g('month'),
            day: g('day'),
            hour: g('hour'),
            minute: g('minute'),
            second: g('second')
        };
    }

    function getTzParts(date) {
        return getPartsInZone(date, currentTz);
    }

    // Offset (ms) of `tz` at the given UTC timestamp.
    function getOffsetMsAt(utcMs, tz) {
        const wholeSeconds = Math.floor(utcMs / 1000) * 1000;
        const p = getPartsInZone(new Date(wholeSeconds), tz);

        return Date.UTC(
            p.year,
            p.month - 1,
            p.day,
            p.hour,
            p.minute,
            p.second
        ) - wholeSeconds;
    }

    // UTC timestamp of a wall clock time in `tz`. The offset is looked up
    // twice so that DST boundaries are handled correctly.
    function wallClockToUtcMs(p, tz) {
        const guess = Date.UTC(
            p.year,
            p.month - 1,
            p.day,
            p.hour,
            p.minute,
            p.second,
            p.millisecond || 0
        );

        const offset = getOffsetMsAt(guess, tz);
        let result = guess - offset;

        const resultOffset = getOffsetMsAt(result, tz);

        if (resultOffset !== offset) {
            result = guess - resultOffset;
        }

        return result;
    }

    let cachedNewYearYear = null;
    let cachedNewYearMs = 0;

    function getNewYearUtcMs(year) {
        if (cachedNewYearYear === year) return cachedNewYearMs;

        const ms = wallClockToUtcMs({
            year: year,
            month: 1,
            day: 1,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0
        }, currentTz);

        cachedNewYearYear = year;
        cachedNewYearMs = ms;

        return ms;
    }

    function updateCountdown() {
        const now = getNow();
        const p = getTzParts(now);

        const yr = p.year;
        const month = p.month - 1;
        const day = p.day;

        const isNewYear = month === 0 && day === 1;

        if (isNewYear && !newYearShown) {
            newYearShown = true;

            const dispYear = yr;

            const msg1 = isJa
                ? '🎉 新年（元旦）になりました！ 🎉'
                : '🎉 Happy New Year! 🎉';

            const msg2 = isJa
                ? 'あけましておめでとうございます！'
                : 'Wishing you a wonderful year!';

            const titleMsg = isJa
                ? dispYear + '年 あけましておめでとう！'
                : 'Happy New Year ' + dispYear + '!';

            document.querySelector('.countLabel').textContent = '';

            document.querySelector('.countdown').innerHTML =
                '<div class="newYearBlock">' +
                msg1 +
                '<br><span class="newYearYear">' +
                dispYear +
                (isJa ? '年' : '') +
                '</span><br>' +
                msg2 +
                '</div>';

            document.querySelector('.countText').textContent = '';

            document.getElementById('page_title').textContent = titleMsg;
            document.title = titleMsg;

            return;
        }

        if (isNewYear) return;

        const targetMs = getNewYearUtcMs(yr + 1);
        const remaining = targetMs - now.getTime();

        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining / 3600000) % 24);
        const minutes = Math.floor((remaining / 60000) % 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        const milliseconds = Math.floor((remaining / 10) % 100);

        document.querySelector('.days').textContent = days;

        document.querySelector('.hours').textContent =
            String(hours).padStart(2, '0');

        document.querySelector('.minutes').textContent =
            String(minutes).padStart(2, '0');

        document.querySelector('.seconds').textContent =
            String(seconds).padStart(2, '0');

        document.querySelector('.milliseconds').textContent =
            String(milliseconds).padStart(2, '0');

        const nextYearNum = yr + 1;

        if (lastYearNum !== nextYearNum) {
            lastYearNum = nextYearNum;

            const countTxt = translations.countText(nextYearNum);

            const titleTxt = isJa
                ? nextYearNum + '年カウントダウン！'
                : 'Countdown to ' + nextYearNum + '!';

            document.querySelector('.countText').textContent = countTxt;
            document.getElementById('page_title').textContent = titleTxt;
            document.title = titleTxt;
        }
    }

    function updateNowTime() {
        const now = getNow();
        const p = getTzParts(now);

        document.querySelector('.nowYear').textContent = p.year;
        document.querySelector('.nowMonth').textContent = p.month;
        document.querySelector('.nowDay').textContent = p.day;

        document.querySelector('.nowHour').textContent =
            String(p.hour).padStart(2, '0');

        document.querySelector('.nowMinute').textContent =
            String(p.minute).padStart(2, '0');

        document.querySelector('.nowSecond').textContent =
            String(p.second).padStart(2, '0');

        const curInfo = getTimeZoneInfo(currentTz, now);

        const headerNameEl = document.getElementById('tzHeaderName');

        if (headerNameEl) {
            headerNameEl.textContent =
                curInfo.city + ' [' + curInfo.utcOffset + ']';
        }

        const detailEl = document.getElementById('tzCurrentDetail');

        if (detailEl) {
            detailEl.replaceChildren();

            const title = document.createElement('b');
            title.textContent = isJa ? '選択中: ' : 'Selected: ';

            const city = document.createElement('span');
            city.textContent = curInfo.city;

            const name = document.createElement('div');
            name.textContent = curInfo.name + ' (' + curInfo.utcOffset + ')';

            const zone = document.createElement('div');
            zone.style.opacity = '.75';
            zone.textContent = currentTz;

            const time = document.createElement('div');
            time.textContent =
                (isJa ? '現地時間: ' : 'Local time: ') + curInfo.time;

            detailEl.append(title, city, name, zone, time);
        }
    }

    updateCountdown();
    updateNowTime();

    setInterval(updateCountdown, 10);
    setInterval(updateNowTime, 1000);

    syncTime();
    setInterval(syncTime, 30 * 60 * 1000);
