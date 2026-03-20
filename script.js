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

        const startInput = card.querySelector(`#svc-start-${id}`);
        if (startInput) startInput.focus();

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
            steps.push({
                label: `Service Period ${i + 1}`,
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
});
