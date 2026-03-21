/**
 * AFADBD Calculator — Armed Forces Active Duty Base Date
 *
 * Computes the AFADBD using day-for-day rules (including 31st days):
 *   1. Start from current tour begin date
 *   2. Subtract total prior active service (year/month/day arithmetic with borrowing)
 *   3. Add 1 inclusive day per non-continuous prior service period
 *   4. Add lost time days forward (advances the date)
 *
 * NOT to be confused with PEBD (Pay Entry Base Date) which uses 30-day months.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const addServiceBtn = document.getElementById('add-service-period');
    const servicePeriodsDiv = document.getElementById('service-periods');
    const addLostTimeBtn = document.getElementById('add-lost-time');
    const lostTimePeriodsDiv = document.getElementById('lost-time-periods');
    const calculateBtn = document.getElementById('calculate');
    const clearAllBtn = document.getElementById('clear-all');
    const resultSection = document.getElementById('result-section');
    const resultDiv = document.getElementById('result');
    const breakdownSection = document.getElementById('breakdown-section');
    const breakdownList = document.getElementById('breakdown-list');
    const retirementSection = document.getElementById('retirement-section');
    const retirementContent = document.getElementById('retirement-content');
    const noServiceHint = document.getElementById('no-prior-service-hint');
    const noLostTimeHint = document.getElementById('no-lost-time-hint');

    let serviceCount = 0;
    let lostTimeCount = 0;

    // --- Time Loss Types ---
    const TIME_LOSS_TYPES = {
        "AWOL (Absence Without Leave)": { deductible: true, category: "Unauthorized Absence" },
        "Desertion": { deductible: true, category: "Unauthorized Absence" },
        "Confinement (Court-Martial)": { deductible: true, category: "Disciplinary" },
        "Confinement (Civil)": { deductible: true, category: "Disciplinary" },
        "Suspension from Duty": { deductible: true, category: "Disciplinary" },
        "Administrative Leave (Pending Investigation)": { deductible: false, category: "Administrative" },
        "Emergency Leave": { deductible: false, category: "Administrative" },
        "Ordinary Leave": { deductible: false, category: "Administrative" },
        "Medical Leave": { deductible: false, category: "Administrative" },
        "Maternity/Paternity Leave": { deductible: false, category: "Administrative" },
        "TDY/TAD": { deductible: false, category: "Duty" },
        "Training": { deductible: false, category: "Duty" },
        "Hospitalization": { deductible: false, category: "Medical" },
        "Unauthorized Absence (Other)": { deductible: true, category: "Unauthorized Absence" },
        "Dropped from Rolls": { deductible: true, category: "Administrative" },
        "Excess Leave": { deductible: true, category: "Administrative" }
    };

    // --- Prior Active Service Codes ---
    const SERVICE_CODES = [
        { code: "11", desc: "USMC (OFF/ENL)", service: "USMC" },
        { code: "12", desc: "REGULAR OFF/ENL WHOSE PAY AND ALLOWANCES ARE REIMBURSED BY OTHER AGENCIES OF THE GOVMNT", service: "USMC" },
        { code: "13", desc: "USMC DRAFTEE", service: "USMC" },
        { code: "2C", desc: "CIVIL SERVICE EMPLOYEE", service: "CIV" },
        { code: "2D", desc: "CONTRACTOR", service: "CIV" },
        { code: "2E", desc: "OTHER CIVILIAN", service: "CIV" },
        { code: "2N", desc: "NAVY", service: "USN" },
        { code: "2O", desc: "PLC, NROTC OR RESERVE OFFICER CANDIDATE", service: "USMCR" },
        { code: "2R", desc: "MILITARY PERSONNEL OF OTHER COUNTRIES", service: "OTHER" },
        { code: "2T", desc: "ARMY", service: "USA" },
        { code: "2U", desc: "AIR FORCE", service: "USAF" },
        { code: "2V", desc: "COAST GUARD", service: "USCG" },
        { code: "3A", desc: "CLEMENCY, NO PAY STAT, NOT CHARGEABLE MC", service: "OTHER" },
        { code: "3B", desc: "CLEMENCY, PAY STAT", service: "OTHER" },
        { code: "4A", desc: "ARMY NATIONAL GUARD", service: "USANG" },
        { code: "4C", desc: "CIVILIAN", service: "CIV" },
        { code: "4G", desc: "AIR NATIONAL GUARD", service: "ARNG" },
        { code: "4N", desc: "NAVY RESERVIST", service: "USNR" },
        { code: "4R", desc: "FOREIGN COUNTRY RESERVIST", service: "OTHER" },
        { code: "4T", desc: "ARMY RESERVIST", service: "USAR" },
        { code: "4U", desc: "AIR FORCE RESERVIST", service: "USAFR" },
        { code: "4V", desc: "COAST GUARD RESERVIST", service: "USCGR" },
        { code: "A1", desc: "FMCR", service: "USMC-RET" },
        { code: "A2", desc: "USMC RET ON EXTENDED ACTIVE DUTY", service: "USMC-RET" },
        { code: "A3", desc: "USMC RET ON TEM ACTIVE DUTY", service: "USMC-RET" },
        { code: "A4", desc: "USMCR RET ON TEM ACTIVE DUTY LT 180 DAYS", service: "USMCR-RET" },
        { code: "A5", desc: "USMC RET, ON TEM ACDU FOR SELECTED SERVICE", service: "USMC-RET" },
        { code: "A6", desc: "FMCR RECALLED TEM ACTIVE DUTY LT 180 (OFF/ENL)", service: "USMCR" },
        { code: "A7", desc: "USMC RETIRED ON ACTIVE DUTY (OFF/ENL)", service: "USMC-RET" },
        { code: "A8", desc: "USMCR RETIRED, (NON PAY)", service: "USMC-RET" },
        { code: "A9", desc: "USMCR RETIRED, (PAY) ENLISTED", service: "USMC-RET" },
        { code: "AA", desc: "FMCR, RECALLED ACDU 180 DAYS OR MORE (OFF/ENL)", service: "USMCR" },
        { code: "AB", desc: "RES RETIRED, RECALLED ACDU FOR REG, 180 DAYS OR MORE (OFF/ENL)", service: "USMCR" },
        { code: "AC", desc: "RES RETIRED, RECALLED ACDU FOR RES, 180 DAYS OR MORE (OFF/ENL)", service: "USMCR" },
        { code: "AH", desc: "USMCR, RETIRED HONORARY", service: "USMCR-RET" },
        { code: "AR", desc: "USMC RET", service: "USMC-RET" },
        { code: "B1", desc: "RES OFF/ENL ORDERED TO ACTIVE DUTY TO PROVIDE FTS", service: "USMCR" },
        { code: "B2", desc: "FTS RES RECRUITING", service: "USMCR" },
        { code: "B3", desc: "FTS RES INSTR/TRNG", service: "USMCR" },
        { code: "B4", desc: "FTS RES ORGANIZATION", service: "USMCR" },
        { code: "B5", desc: "SMCR ENLISTED IDT,NONPRIOR ON IADT/AWAIT IADT (WITH PAY)", service: "USMCR" },
        { code: "C3", desc: "ACT OFFICER, SWAG", service: "USMCR" },
        { code: "C4", desc: "ACT RES ON TEM ACDU FOR REG MORE THAN 180 DAYS", service: "USMCR" },
        { code: "C5", desc: "ACTIVE DUTY OFFICER ON UAD BEYOND INIT ACDU OBLIGATION", service: "USMCR" },
        { code: "C6", desc: "ACTIVE DUTY OFFICER ON EDR BEYOND INIT ACDU OBLIGATION", service: "USMCR" },
        { code: "C7", desc: "ACTIVE RES ON TEM ACDU SPEC WORK", service: "USMCR" },
        { code: "C8", desc: "RES OFFICER AWTG ASSIGN AFTER OCS", service: "USMCR" },
        { code: "C9", desc: "ENLISTED PARTICIPANT IN OFFICER CANDIDATE COURSE", service: "USMCR" },
        { code: "CA", desc: "FORMER USMCR(J) ON EAD IN LIEU OF REENL USMC", service: "USMCR" },
        { code: "CB", desc: "RES MANDATORY PARTICIPANT FOR MORE THAN 45 DAYS", service: "USMCR" },
        { code: "CC", desc: "RES ON TEM ACDU LESS THAN 180 DAYS", service: "USMCR" },
        { code: "CD", desc: "RES ENLISTED EAD AS RECRUITER", service: "USMCR" },
        { code: "CE", desc: "RES ENLISTED RECRUITER AIDE ON TEM ACTIVE DUTY", service: "USMCR" },
        { code: "CF", desc: "RES, SHORT TOURS/TRAINING ASSISTANT", service: "USMCR" },
        { code: "CG", desc: "(RESERVED FOR FUTURE USE)", service: "USMCR" },
        { code: "CH", desc: "RES, PAY & ALLW REIMBURSED BY OTHER AGENCY", service: "USMCR" },
        { code: "CJ", desc: "PLC LAWYER", service: "USMCR" },
        { code: "D1", desc: "RESERVISTS 20 YRS SAT SERV MET BUT ELECTS DISCHARGE", service: "USMCR-RET" },
        { code: "K1", desc: "ENLISTED RES ON IADT AND/OR ELST", service: "USMCR" },
        { code: "K2", desc: "ENLISTED RES 2ND INCREMENT IADT", service: "USMCR" },
        { code: "K3", desc: "RES ON TEM ACDU FOR ETT OR RCT", service: "USMCR" },
        { code: "K4", desc: "ENLISTED RES NPS OBLIGOR 6 YR ACDU & IDT", service: "USMCR" },
        { code: "K5", desc: "ENL REGULAR USMC CONTRACTED AND AWAITING SHIPMENT IN THE DEP", service: "USMC" },
        { code: "K6", desc: "FTS, POLICY & REGULATIONS", service: "USMCR" },
        { code: "K7", desc: "IRR, MTU RU 88900-88906, IRR MBR IN OFFICER TRNG PGM", service: "USMCR" },
        { code: "K8", desc: "ENL RESERVE, NPS, OBLIGOR, 3YR ACDU & IDT", service: "USMCR" },
        { code: "K9", desc: "SMCR ENLISTED IDT,NONPRIOR ON IADT/AWAIT IADT (WITH PAY)", service: "USMCR" },
        { code: "KA", desc: "SMCR IDT", service: "USMCR" },
        { code: "KB", desc: "RESERVE ON ACDU IN EXCESS OF 30 DAYS & ON MEDICAL HOLD", service: "USMCR" },
        { code: "KC", desc: "ENLISTED NON-PRIOR SERVICE OBLIGOR (7 YRS ACDU & IDT)", service: "USMCR" },
        { code: "KD", desc: "STANDBY RESERVE AND KEY FEDERAL OFF, INACT LIST, ACT STAT", service: "USMCR" },
        { code: "KE", desc: "STANDBY RESERVE INACTIVE LIST", service: "USMCR" },
        { code: "KF", desc: "IMA IDT", service: "USMCR" },
        { code: "KG", desc: "IRR ASSIGNED AS A MOBILIZATION DESIGNEE", service: "USMCR" },
        { code: "KJ", desc: "RESERVE OFFICER PARTICIPATING IN OCC-R/TBS/MOS TRAINING", service: "USMCR" },
        { code: "KM", desc: "MOBILIZED READY RESERVE/STANDBY RESERVE", service: "USMCR" },
        { code: "KP", desc: "PLC;ENLISTED PARTICIPANT IN OFFICER COMMISSIONING PROGRAM", service: "USMCR" }
    ];

    /**
     * Build grouped <optgroup> options for service codes, grouped by service branch.
     */
    function buildServiceCodeOptions() {
        const groups = {};
        for (const entry of SERVICE_CODES) {
            if (!groups[entry.service]) groups[entry.service] = [];
            groups[entry.service].push(entry);
        }

        let html = '<option value="" disabled selected>Select service code...</option>';
        for (const [service, items] of Object.entries(groups)) {
            html += `<optgroup label="${service}">`;
            for (const item of items) {
                html += `<option value="${item.code}">${item.code} — ${item.desc}</option>`;
            }
            html += '</optgroup>';
        }
        return html;
    }

    /**
     * Build grouped <optgroup> options HTML from TIME_LOSS_TYPES.
     */
    function buildTimeLossOptions() {
        const groups = {};
        for (const [name, info] of Object.entries(TIME_LOSS_TYPES)) {
            if (!groups[info.category]) groups[info.category] = [];
            groups[info.category].push({ name, deductible: info.deductible });
        }

        let html = '<option value="" disabled selected>Select reason...</option>';
        for (const [category, items] of Object.entries(groups)) {
            html += `<optgroup label="${category}">`;
            for (const item of items) {
                const tag = item.deductible ? '' : ' (non-deductible)';
                html += `<option value="${item.name}">${item.name}${tag}</option>`;
            }
            html += '</optgroup>';
        }
        return html;
    }

    // --- Create a Service Period Card ---
    function createServicePeriodCard() {
        serviceCount++;
        const id = serviceCount;

        const card = document.createElement('div');
        card.classList.add('date-range');
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-service-id', id);
        card.innerHTML = `
            <div class="range-header">
                <span class="range-badge">Service Period ${id}</span>
                <button type="button" class="btn-remove" aria-label="Remove service period ${id}" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="field-group svc-code-group">
                <label for="svc-code-${id}">Service Code</label>
                <select id="svc-code-${id}" class="select-input">
                    ${buildServiceCodeOptions()}
                </select>
                <span class="svc-branch-tag hidden" id="svc-tag-${id}"></span>
            </div>
            <div class="range-fields">
                <div class="field-group">
                    <label for="svc-start-${id}">Start Date</label>
                    <div class="input-wrapper">
                        <input type="date" id="svc-start-${id}" class="date-input">
                    </div>
                </div>
                <div class="field-separator" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="field-group">
                    <label for="svc-end-${id}">End Date</label>
                    <div class="input-wrapper">
                        <input type="date" id="svc-end-${id}" class="date-input">
                    </div>
                </div>
            </div>
        `;

        // Show service branch tag when code changes
        const codeSelect = card.querySelector(`#svc-code-${id}`);
        const branchTag = card.querySelector(`#svc-tag-${id}`);
        codeSelect.addEventListener('change', () => {
            const entry = SERVICE_CODES.find(s => s.code === codeSelect.value);
            if (entry) {
                branchTag.classList.remove('hidden');
                branchTag.textContent = entry.service;
                branchTag.className = 'svc-branch-tag tag-service';
            }
        });

        card.querySelector('.btn-remove').addEventListener('click', () => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-8px)';
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            setTimeout(() => {
                card.remove();
                updateServiceLabels();
                toggleHint(servicePeriodsDiv, noServiceHint);
            }, 200);
        });

        servicePeriodsDiv.appendChild(card);
        toggleHint(servicePeriodsDiv, noServiceHint);

        codeSelect.focus();

        return card;
    }

    // --- Create a Lost Time Card (with reason select) ---
    function createLostTimeCard() {
        lostTimeCount++;
        const id = lostTimeCount;

        const card = document.createElement('div');
        card.classList.add('date-range');
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-losttime-id', id);
        card.innerHTML = `
            <div class="range-header">
                <span class="range-badge">Lost Time ${id}</span>
                <button type="button" class="btn-remove" aria-label="Remove lost time period ${id}" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="field-group lt-reason-group">
                <label for="lt-reason-${id}">Reason for Time Loss</label>
                <select id="lt-reason-${id}" class="select-input" aria-required="true">
                    ${buildTimeLossOptions()}
                </select>
                <span class="lt-deductible-tag hidden" id="lt-tag-${id}"></span>
            </div>
            <div class="range-fields">
                <div class="field-group">
                    <label for="lt-start-${id}">Start Date</label>
                    <div class="input-wrapper">
                        <input type="date" id="lt-start-${id}" class="date-input">
                    </div>
                </div>
                <div class="field-separator" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="field-group">
                    <label for="lt-end-${id}">End Date</label>
                    <div class="input-wrapper">
                        <input type="date" id="lt-end-${id}" class="date-input">
                    </div>
                </div>
            </div>
        `;

        // Show deductible/non-deductible tag when reason changes
        const reasonSelect = card.querySelector(`#lt-reason-${id}`);
        const tag = card.querySelector(`#lt-tag-${id}`);
        reasonSelect.addEventListener('change', () => {
            const typeInfo = TIME_LOSS_TYPES[reasonSelect.value];
            if (typeInfo) {
                tag.classList.remove('hidden');
                if (typeInfo.deductible) {
                    tag.textContent = 'Deductible — will adjust AFADBD';
                    tag.className = 'lt-deductible-tag tag-deductible';
                } else {
                    tag.textContent = 'Non-deductible — will not adjust AFADBD';
                    tag.className = 'lt-deductible-tag tag-non-deductible';
                }
            }
        });

        card.querySelector('.btn-remove').addEventListener('click', () => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-8px)';
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            setTimeout(() => {
                card.remove();
                updateLostTimeLabels();
                toggleHint(lostTimePeriodsDiv, noLostTimeHint);
            }, 200);
        });

        lostTimePeriodsDiv.appendChild(card);
        toggleHint(lostTimePeriodsDiv, noLostTimeHint);

        reasonSelect.focus();

        return card;
    }

    // --- Update labels after removal ---
    function updateServiceLabels() {
        servicePeriodsDiv.querySelectorAll('.date-range').forEach((card, i) => {
            const badge = card.querySelector('.range-badge');
            if (badge) badge.textContent = `Service Period ${i + 1}`;
        });
    }

    function updateLostTimeLabels() {
        lostTimePeriodsDiv.querySelectorAll('.date-range').forEach((card, i) => {
            const badge = card.querySelector('.range-badge');
            if (badge) badge.textContent = `Lost Time ${i + 1}`;
        });
    }

    function toggleHint(container, hint) {
        const hasCards = container.querySelectorAll('.date-range').length > 0;
        hint.classList.toggle('hidden', hasCards);
    }

    // --- Add Period Buttons ---
    addServiceBtn.addEventListener('click', () => {
        createServicePeriodCard();
        announceToScreenReader('Service period added');
    });

    addLostTimeBtn.addEventListener('click', () => {
        createLostTimeCard();
        announceToScreenReader('Lost time period added');
    });

    // ========================================
    // AFADBD COMPUTATION LOGIC
    // ========================================

    /**
     * Parse a date string (YYYY-MM-DD) as a local date (no timezone shift).
     */
    function parseLocalDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    /**
     * Count calendar days between two dates, inclusive of both endpoints.
     * Day-for-day including 31st days.
     */
    function daysBetweenInclusive(start, end) {
        const msPerDay = 1000 * 60 * 60 * 24;
        return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
    }

    /**
     * Calculate the calendar difference between two dates as { years, months, days }.
     * This accounts for actual month lengths (day-for-day, including 31st days).
     */
    function calendarDifference(start, end) {
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate() + 1; // +1 for inclusive

        if (days < 0) {
            months--;
            // Get days in the previous month relative to end
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
        }

        if (months < 0) {
            years--;
            months += 12;
        }

        // Normalize: if days >= days-in-month, carry to months
        if (days >= 30) {
            const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
            if (days >= daysInMonth) {
                months++;
                days -= daysInMonth;
                if (months >= 12) {
                    years++;
                    months -= 12;
                }
            }
        }

        return { years, months, days };
    }

    /**
     * Read start/end dates from a card and return duration info.
     * Returns null if empty, { error } if invalid, or { years, months, days, totalDays, description }.
     */
    function getDateRangeFromCard(card, prefix) {
        const startInput = card.querySelector(`input[id^="${prefix}-start-"]`);
        const endInput = card.querySelector(`input[id^="${prefix}-end-"]`);

        if (!startInput.value || !endInput.value) {
            if (!startInput.value) startInput.classList.add('input-error');
            if (!endInput.value) endInput.classList.add('input-error');
            return { error: 'Please fill in both start and end dates for all periods.' };
        }

        const start = parseLocalDate(startInput.value);
        const end = parseLocalDate(endInput.value);

        if (end < start) {
            startInput.classList.add('input-error');
            endInput.classList.add('input-error');
            return { error: 'End date cannot be before start date.' };
        }

        const totalDays = daysBetweenInclusive(start, end);
        const duration = calendarDifference(start, end);
        const startStr = formatDate(start);
        const endStr = formatDate(end);

        return {
            ...duration,
            totalDays,
            description: `${startStr} — ${endStr} = ${duration.years}y ${duration.months}m ${duration.days}d (${totalDays} days)`
        };
    }

    /**
     * Subtract a duration { years, months, days } from a date.
     * Uses calendar arithmetic with borrowing (as specified in policy).
     *
     * Example from policy:
     *   2015/01/03 - 3y 6m 2d:
     *   Borrow 12 months -> 2014/13/03 - 03/06/02 = 2011/07/01
     */
    function subtractDuration(date, duration) {
        let year = date.getFullYear();
        let month = date.getMonth() + 1; // 1-indexed for arithmetic
        let day = date.getDate();

        // Subtract days first
        day -= duration.days;
        if (day < 1) {
            month--;
            if (month < 1) {
                year--;
                month += 12;
            }
            const daysInPrevMonth = new Date(year, month, 0).getDate();
            day += daysInPrevMonth;
        }

        // Subtract months
        month -= duration.months;
        if (month < 1) {
            year--;
            month += 12;
        }

        // Subtract years
        year -= duration.years;

        // Clamp day to valid range for the resulting month
        const maxDay = new Date(year, month, 0).getDate();
        if (day > maxDay) {
            day = maxDay;
        }

        return new Date(year, month - 1, day);
    }

    /**
     * Add a number of calendar days to a date (day-for-day, including 31st).
     */
    function addDays(date, numDays) {
        const result = new Date(date);
        result.setDate(result.getDate() + numDays);
        return result;
    }

    /**
     * Sum multiple durations { years, months, days } into a single duration.
     */
    function sumDurations(durations) {
        let years = 0, months = 0, days = 0;
        for (const d of durations) {
            years += d.years;
            months += d.months;
            days += d.days;
        }
        // Normalize
        if (days >= 30) {
            months += Math.floor(days / 30);
            days = days % 30;
        }
        if (months >= 12) {
            years += Math.floor(months / 12);
            months = months % 12;
        }
        return { years, months, days };
    }

    // --- Main Calculation ---
    calculateBtn.addEventListener('click', () => {
        // Clear previous errors
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

        const steps = [];

        // 1. Get current tour date
        const tourInput = document.getElementById('current-tour-date');
        if (!tourInput.value) {
            tourInput.classList.add('input-error');
            showError('Please enter your current tour begin date.');
            announceToScreenReader('Error: Current tour date required.');
            return;
        }

        const currentTourDate = parseLocalDate(tourInput.value);
        steps.push({
            label: 'Current Tour Begin Date',
            value: formatDateLong(currentTourDate)
        });

        // 2. Gather prior service periods
        const serviceCards = servicePeriodsDiv.querySelectorAll('.date-range');
        const serviceDurations = [];

        for (let i = 0; i < serviceCards.length; i++) {
            const result = getDateRangeFromCard(serviceCards[i], 'svc');
            if (result.error) {
                showError(result.error);
                return;
            }
            serviceDurations.push(result);

            // Get selected service code info
            const codeSelect = serviceCards[i].querySelector('select[id^="svc-code-"]');
            const codeEntry = codeSelect ? SERVICE_CODES.find(s => s.code === codeSelect.value) : null;
            const codeLabel = codeEntry ? ` [${codeEntry.code} — ${codeEntry.service}]` : '';

            steps.push({
                label: `Service Period ${i + 1}${codeLabel}`,
                value: result.description
            });
        }

        // 3. Compute AFADBD
        let afabdDate;
        const numPeriods = serviceDurations.length;

        if (numPeriods === 0) {
            afabdDate = new Date(currentTourDate);
            steps.push({
                label: 'No prior service',
                value: 'AFADBD starts at current tour date'
            });
        } else {
            const totalService = sumDurations(serviceDurations);
            steps.push({
                label: 'Total Prior Service',
                value: `${totalService.years}y ${totalService.months}m ${totalService.days}d`
            });

            afabdDate = subtractDuration(currentTourDate, totalService);
            steps.push({
                label: 'After subtracting prior service',
                value: formatDateLong(afabdDate)
            });

            // Add 1 inclusive day per non-continuous period
            afabdDate = addDays(afabdDate, numPeriods);
            steps.push({
                label: `Inclusive days (+${numPeriods} for ${numPeriods} period${numPeriods > 1 ? 's' : ''})`,
                value: formatDateLong(afabdDate)
            });
        }

        // 4. Gather lost time periods
        const lostTimeCards = lostTimePeriodsDiv.querySelectorAll('.date-range');
        let totalDeductibleDays = 0;
        let totalNonDeductibleDays = 0;

        for (let i = 0; i < lostTimeCards.length; i++) {
            const card = lostTimeCards[i];
            const reasonSelect = card.querySelector('select[id^="lt-reason-"]');

            if (!reasonSelect.value) {
                reasonSelect.classList.add('input-error');
                showError('Please select a reason for each lost time period.');
                return;
            }

            const result = getDateRangeFromCard(card, 'lt');
            if (result.error) {
                showError(result.error);
                return;
            }

            const typeInfo = TIME_LOSS_TYPES[reasonSelect.value];
            const isDeductible = typeInfo && typeInfo.deductible;
            const startDate = parseLocalDate(card.querySelector('input[id^="lt-start-"]').value);
            const endDate = parseLocalDate(card.querySelector('input[id^="lt-end-"]').value);
            const deductLabel = isDeductible ? 'deductible' : 'non-deductible';

            if (isDeductible) {
                totalDeductibleDays += result.totalDays;
            } else {
                totalNonDeductibleDays += result.totalDays;
            }

            steps.push({
                label: `Lost Time ${i + 1}: ${reasonSelect.value}`,
                value: `${formatDate(startDate)} — ${formatDate(endDate)} (${result.totalDays} days, ${deductLabel})`
            });
        }

        // 5. Add deductible lost time (advances date forward)
        if (totalDeductibleDays > 0) {
            afabdDate = addDays(afabdDate, totalDeductibleDays);
            steps.push({
                label: `Deductible lost time (+${totalDeductibleDays} day${totalDeductibleDays > 1 ? 's' : ''})`,
                value: formatDateLong(afabdDate)
            });
        }

        if (totalNonDeductibleDays > 0) {
            steps.push({
                label: `Non-deductible time (${totalNonDeductibleDays} day${totalNonDeductibleDays > 1 ? 's' : ''})`,
                value: 'No AFADBD adjustment'
            });
        }

        // 6. Show result
        resultSection.classList.remove('hidden');
        resultDiv.className = 'result-card result-success';
        resultDiv.innerHTML = `
            <div class="result-label" id="result-heading">Your AFADBD</div>
            <div class="result-value">${formatDateLong(afabdDate)}</div>
            <div class="result-unit">Armed Forces Active Duty Base Date</div>
        `;

        resultDiv.style.animation = 'none';
        resultDiv.offsetHeight;
        resultDiv.style.animation = '';

        // 7. Show computation steps
        breakdownSection.classList.remove('hidden');
        breakdownList.innerHTML = steps.map((s, i) => `
            <div class="breakdown-item" role="listitem" style="animation-delay: ${i * 50}ms">
                <span class="breakdown-item-label">${s.label}</span>
                <span class="breakdown-item-value">${s.value}</span>
            </div>
        `).join('');

        // 8. Show retirement eligibility
        retirementSection.classList.remove('hidden');
        const retire20 = addYears(afabdDate, 20);
        const retire30 = addYears(afabdDate, 30);
        const lastDayOfMonth20 = new Date(retire20.getFullYear(), retire20.getMonth() + 1, 0);

        retirementContent.innerHTML = `
            <div class="retirement-item">
                <span class="retirement-item-label">20-Year Active Duty Eligibility</span>
                <span class="retirement-item-value">${formatDateLong(retire20)}</span>
            </div>
            <div class="retirement-item">
                <span class="retirement-item-label">Enlisted FMCR Transfer (last day of month)</span>
                <span class="retirement-item-value">${formatDateLong(lastDayOfMonth20)}</span>
            </div>
            <div class="retirement-item">
                <span class="retirement-item-label">30-Year Active Duty Eligibility</span>
                <span class="retirement-item-value">${formatDateLong(retire30)}</span>
            </div>
            <p class="retirement-note">Enlisted Marines may only transfer to the FMCR on the last day of the month in which they become eligible.</p>
        `;

        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        announceToScreenReader(`Your AFADBD is ${formatDateLong(afabdDate)}`);

        // 9. Show results modal
        showResultsModal(afabdDate, steps, retire20, retire30, lastDayOfMonth20);

        // 10. Save to history
        saveToHistory(afabdDate, steps, currentTourDate);
    });

    // --- Error Display ---
    function showError(message) {
        resultSection.classList.remove('hidden');
        breakdownSection.classList.add('hidden');
        retirementSection.classList.add('hidden');
        resultDiv.className = 'result-card result-error';
        resultDiv.innerHTML = `<div class="result-value">${message}</div>`;
        resultDiv.style.animation = 'none';
        resultDiv.offsetHeight;
        resultDiv.style.animation = '';
    }

    // --- Date Formatting ---
    function formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function formatDateLong(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Add exact years to a date (day-for-day, not 30-day months).
     */
    function addYears(date, years) {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
    }

    // --- Clear All ---
    clearAllBtn.addEventListener('click', () => {
        document.getElementById('current-tour-date').value = '';
        servicePeriodsDiv.innerHTML = '';
        lostTimePeriodsDiv.innerHTML = '';
        serviceCount = 0;
        lostTimeCount = 0;
        resultSection.classList.add('hidden');
        breakdownSection.classList.add('hidden');
        retirementSection.classList.add('hidden');
        noServiceHint.classList.remove('hidden');
        noLostTimeHint.classList.remove('hidden');
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        announceToScreenReader('All fields cleared');
    });

    // --- Keyboard: Enter to calculate ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.target.classList.contains('date-input') || e.target.classList.contains('select-input'))) {
            e.preventDefault();
            calculateBtn.click();
        }
    });

    // --- Screen Reader Announcements ---
    function announceToScreenReader(message) {
        const el = document.createElement('div');
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-atomic', 'true');
        el.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-message">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exiting');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========================================
    // MODAL HELPERS
    // ========================================

    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            const firstFocusable = modal.querySelector('button, input, select, [tabindex]');
            if (firstFocusable) firstFocusable.focus();
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // Close modals via data-close-modal buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
        }
    });

    // ========================================
    // RESULTS MODAL
    // ========================================

    const resultsModal = document.getElementById('results-modal');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalCloseBottom = document.getElementById('modal-close-bottom');
    const modalPrintBtn = document.getElementById('modal-print');

    modalCloseBtn.addEventListener('click', () => closeModal('results-modal'));
    modalCloseBottom.addEventListener('click', () => closeModal('results-modal'));

    function showResultsModal(afabdDate, steps, retire20, retire30, lastDayOfMonth20) {
        let html = `
            <div class="modal-result-highlight">
                <div class="modal-result-date">${formatDateLong(afabdDate)}</div>
                <div class="modal-result-subtitle">Armed Forces Active Duty Base Date</div>
            </div>
            <div class="modal-section">
                <div class="modal-section-title">Computation Steps</div>
                ${steps.map(s => `
                    <div class="modal-item">
                        <span class="modal-item-label">${s.label}</span>
                        <span class="modal-item-value">${s.value}</span>
                    </div>
                `).join('')}
            </div>
            <div class="modal-section">
                <div class="modal-section-title">Retirement Eligibility</div>
                <div class="modal-item">
                    <span class="modal-item-label">20-Year Eligibility</span>
                    <span class="modal-item-value">${formatDateLong(retire20)}</span>
                </div>
                <div class="modal-item">
                    <span class="modal-item-label">FMCR Transfer</span>
                    <span class="modal-item-value">${formatDateLong(lastDayOfMonth20)}</span>
                </div>
                <div class="modal-item">
                    <span class="modal-item-label">30-Year Eligibility</span>
                    <span class="modal-item-value">${formatDateLong(retire30)}</span>
                </div>
            </div>
        `;
        modalBody.innerHTML = html;
        openModal('results-modal');
    }

    // Print report
    modalPrintBtn.addEventListener('click', () => {
        window.print();
    });

    // ========================================
    // SAVE / LOAD / HISTORY (localStorage)
    // ========================================

    const STORAGE_KEY_SAVES = 'afadbd_saves';
    const STORAGE_KEY_HISTORY = 'afadbd_history';

    function getFormState() {
        const tourDate = document.getElementById('current-tour-date').value;
        const servicePeriods = [];
        servicePeriodsDiv.querySelectorAll('.date-range').forEach(card => {
            const code = card.querySelector('select[id^="svc-code-"]');
            const start = card.querySelector('input[id^="svc-start-"]');
            const end = card.querySelector('input[id^="svc-end-"]');
            if (start && end) {
                servicePeriods.push({ code: code ? code.value : '', start: start.value, end: end.value });
            }
        });
        const lostTimePeriods = [];
        lostTimePeriodsDiv.querySelectorAll('.date-range').forEach(card => {
            const reason = card.querySelector('select[id^="lt-reason-"]');
            const start = card.querySelector('input[id^="lt-start-"]');
            const end = card.querySelector('input[id^="lt-end-"]');
            if (reason && start && end) {
                lostTimePeriods.push({ reason: reason.value, start: start.value, end: end.value });
            }
        });
        return { tourDate, servicePeriods, lostTimePeriods };
    }

    function restoreFormState(state) {
        // Clear existing
        clearAllBtn.click();

        // Set tour date
        if (state.tourDate) {
            document.getElementById('current-tour-date').value = state.tourDate;
        }

        // Add service periods
        if (state.servicePeriods) {
            for (const sp of state.servicePeriods) {
                const card = createServicePeriodCard();
                const code = card.querySelector('select[id^="svc-code-"]');
                const start = card.querySelector('input[id^="svc-start-"]');
                const end = card.querySelector('input[id^="svc-end-"]');
                if (code && sp.code) {
                    code.value = sp.code;
                    code.dispatchEvent(new Event('change'));
                }
                if (start) start.value = sp.start;
                if (end) end.value = sp.end;
            }
        }

        // Add lost time periods
        if (state.lostTimePeriods) {
            for (const lt of state.lostTimePeriods) {
                const card = createLostTimeCard();
                const reason = card.querySelector('select[id^="lt-reason-"]');
                const start = card.querySelector('input[id^="lt-start-"]');
                const end = card.querySelector('input[id^="lt-end-"]');
                if (reason) {
                    reason.value = lt.reason;
                    reason.dispatchEvent(new Event('change'));
                }
                if (start) start.value = lt.start;
                if (end) end.value = lt.end;
            }
        }
    }

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => {
        openModal('save-modal');
        const nameInput = document.getElementById('save-name-input');
        nameInput.value = '';
        nameInput.focus();
    });

    document.getElementById('save-confirm-btn').addEventListener('click', () => {
        const name = document.getElementById('save-name-input').value.trim();
        if (!name) {
            showToast('Please enter a name for this save.', 'error');
            return;
        }

        const saves = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVES) || '[]');
        saves.unshift({
            id: Date.now(),
            name,
            date: new Date().toISOString(),
            state: getFormState()
        });
        // Keep max 20 saves
        if (saves.length > 20) saves.length = 20;
        localStorage.setItem(STORAGE_KEY_SAVES, JSON.stringify(saves));

        closeModal('save-modal');
        showToast('Calculation saved successfully.', 'success');
    });

    // Allow Enter to confirm save
    document.getElementById('save-name-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('save-confirm-btn').click();
        }
    });

    // Load button
    document.getElementById('load-btn').addEventListener('click', () => {
        const saves = JSON.parse(localStorage.getItem(STORAGE_KEY_SAVES) || '[]');
        const body = document.getElementById('load-modal-body');

        if (saves.length === 0) {
            body.innerHTML = '<div class="empty-state">No saved calculations found.</div>';
        } else {
            body.innerHTML = saves.map(s => `
                <div class="save-list-item" data-save-id="${s.id}">
                    <div class="save-list-info">
                        <div class="save-list-name">${escapeHtml(s.name)}</div>
                        <div class="save-list-date">${new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                    </div>
                    <div class="save-list-actions">
                        <button type="button" class="btn btn-primary btn-sm load-save-btn" data-save-id="${s.id}">Load</button>
                        <button type="button" class="btn btn-danger btn-sm delete-save-btn" data-save-id="${s.id}">Delete</button>
                    </div>
                </div>
            `).join('');

            body.querySelectorAll('.load-save-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const save = saves.find(s => s.id === Number(btn.dataset.saveId));
                    if (save) {
                        restoreFormState(save.state);
                        closeModal('load-modal');
                        showToast('Calculation loaded.', 'success');
                    }
                });
            });

            body.querySelectorAll('.delete-save-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.dataset.saveId);
                    const updated = saves.filter(s => s.id !== id);
                    localStorage.setItem(STORAGE_KEY_SAVES, JSON.stringify(updated));
                    btn.closest('.save-list-item').remove();
                    if (updated.length === 0) {
                        body.innerHTML = '<div class="empty-state">No saved calculations found.</div>';
                    }
                    showToast('Save deleted.', 'warning');
                });
            });
        }

        openModal('load-modal');
    });

    // History
    function saveToHistory(afabdDate, steps, currentTourDate) {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
        history.unshift({
            id: Date.now(),
            date: new Date().toISOString(),
            afadbd: formatDateLong(afabdDate),
            tourDate: formatDate(currentTourDate),
            stepsCount: steps.length,
            state: getFormState()
        });
        // Keep max 50
        if (history.length > 50) history.length = 50;
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }

    document.getElementById('history-btn').addEventListener('click', () => {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
        const body = document.getElementById('history-modal-body');

        if (history.length === 0) {
            body.innerHTML = '<div class="empty-state">No calculation history yet.</div>';
        } else {
            body.innerHTML = history.map(h => `
                <div class="save-list-item" data-history-id="${h.id}">
                    <div class="save-list-info">
                        <div class="save-list-name">${escapeHtml(h.afadbd)}</div>
                        <div class="save-list-date">${new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                        <div class="save-list-result">Tour: ${escapeHtml(h.tourDate)}</div>
                    </div>
                    <div class="save-list-actions">
                        <button type="button" class="btn btn-primary btn-sm restore-history-btn" data-history-id="${h.id}">Restore</button>
                    </div>
                </div>
            `).join('');

            body.querySelectorAll('.restore-history-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const entry = history.find(h => h.id === Number(btn.dataset.historyId));
                    if (entry && entry.state) {
                        restoreFormState(entry.state);
                        closeModal('history-modal');
                        showToast('Calculation restored from history.', 'success');
                    }
                });
            });
        }

        openModal('history-modal');
    });

    // HTML escape helper
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
