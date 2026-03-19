/**
 * AFADBD Calculator — Active Federal Active Duty by Dates
 * Calculates total active duty days across multiple service periods.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const addRangeBtn = document.getElementById('add-range');
    const dateRangesDiv = document.getElementById('date-ranges');
    const calculateBtn = document.getElementById('calculate');
    const clearAllBtn = document.getElementById('clear-all');
    const resultSection = document.getElementById('result-section');
    const resultDiv = document.getElementById('result');
    const breakdownSection = document.getElementById('breakdown-section');
    const breakdownList = document.getElementById('breakdown-list');

    let rangeCount = 1;

    // --- Add New Date Range ---
    addRangeBtn.addEventListener('click', () => {
        rangeCount++;
        const newRange = document.createElement('div');
        newRange.classList.add('date-range');
        newRange.setAttribute('role', 'listitem');
        newRange.setAttribute('data-range', rangeCount);
        newRange.innerHTML = `
            <div class="range-header">
                <span class="range-badge">Period ${rangeCount}</span>
                <button type="button" class="btn-remove" aria-label="Remove period ${rangeCount}" title="Remove this period">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="range-fields">
                <div class="field-group">
                    <label for="start-date-${rangeCount}">Start Date</label>
                    <div class="input-wrapper">
                        <input type="date" id="start-date-${rangeCount}" class="date-input" required aria-required="true">
                    </div>
                </div>
                <div class="field-separator" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="field-group">
                    <label for="end-date-${rangeCount}">End Date</label>
                    <div class="input-wrapper">
                        <input type="date" id="end-date-${rangeCount}" class="date-input" required aria-required="true">
                    </div>
                </div>
            </div>
        `;
        dateRangesDiv.appendChild(newRange);

        // Attach remove handler
        const removeBtn = newRange.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => {
            newRange.style.opacity = '0';
            newRange.style.transform = 'translateY(-8px)';
            newRange.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            setTimeout(() => {
                newRange.remove();
                updatePeriodLabels();
            }, 200);
        });

        // Focus the new start date input
        const newStartInput = newRange.querySelector(`#start-date-${rangeCount}`);
        if (newStartInput) {
            newStartInput.focus();
        }

        // Announce to screen readers
        announceToScreenReader(`Period ${rangeCount} added`);
    });

    // --- Update Period Labels After Removal ---
    function updatePeriodLabels() {
        const ranges = dateRangesDiv.querySelectorAll('.date-range');
        ranges.forEach((range, index) => {
            const badge = range.querySelector('.range-badge');
            if (badge) {
                badge.textContent = `Period ${index + 1}`;
            }
        });
    }

    // --- Calculate Total Days ---
    calculateBtn.addEventListener('click', () => {
        let totalDays = 0;
        let hasError = false;
        let hasEmptyFields = false;
        const dateRanges = document.querySelectorAll('.date-range');
        const periodBreakdown = [];

        // Clear previous error states
        document.querySelectorAll('.date-input').forEach(input => {
            input.classList.remove('input-error');
        });

        dateRanges.forEach((range, index) => {
            const startDateInput = range.querySelector('input[id^="start-date-"]');
            const endDateInput = range.querySelector('input[id^="end-date-"]');

            if (!startDateInput.value || !endDateInput.value) {
                hasEmptyFields = true;
                if (!startDateInput.value) startDateInput.classList.add('input-error');
                if (!endDateInput.value) endDateInput.classList.add('input-error');
                return;
            }

            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                hasEmptyFields = true;
                return;
            }

            if (endDate < startDate) {
                hasError = true;
                startDateInput.classList.add('input-error');
                endDateInput.classList.add('input-error');
                return;
            }

            const timeDiff = endDate.getTime() - startDate.getTime();
            const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24)) + 1;
            totalDays += dayDiff;

            periodBreakdown.push({
                period: index + 1,
                days: dayDiff,
                start: formatDate(startDate),
                end: formatDate(endDate)
            });
        });

        // Display results
        resultSection.classList.remove('hidden');

        if (hasError) {
            showResult('error', 'End date cannot be earlier than the start date. Please check the highlighted fields.');
            breakdownSection.classList.add('hidden');
            announceToScreenReader('Error: End date cannot be earlier than start date.');
        } else if (hasEmptyFields) {
            showResult('warning', 'Please fill in all date fields before calculating.');
            breakdownSection.classList.add('hidden');
            announceToScreenReader('Warning: Please fill in all date fields.');
        } else {
            showResult('success', totalDays);

            // Show breakdown if multiple periods
            if (periodBreakdown.length > 1) {
                breakdownSection.classList.remove('hidden');
                breakdownList.innerHTML = periodBreakdown.map(p => `
                    <div class="breakdown-item" role="listitem">
                        <div>
                            <span class="breakdown-item-label">Period ${p.period}</span>
                            <span class="breakdown-item-dates">${p.start} — ${p.end}</span>
                        </div>
                        <span class="breakdown-item-value">${p.days} day${p.days !== 1 ? 's' : ''}</span>
                    </div>
                `).join('');
            } else {
                breakdownSection.classList.add('hidden');
            }

            announceToScreenReader(`Total active duty days: ${totalDays}`);
        }

        // Scroll result into view smoothly
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // --- Show Result ---
    function showResult(type, content) {
        resultDiv.className = 'result-card';
        resultDiv.classList.add(`result-${type}`);

        if (type === 'success') {
            resultDiv.innerHTML = `
                <div class="result-label">Total Active Duty</div>
                <div class="result-value">${content}</div>
                <div class="result-unit">day${content !== 1 ? 's' : ''}</div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="result-value">${content}</div>
            `;
        }

        // Re-trigger animation
        resultDiv.style.animation = 'none';
        resultDiv.offsetHeight; // Force reflow
        resultDiv.style.animation = '';
    }

    // --- Format Date ---
    function formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // --- Clear All ---
    clearAllBtn.addEventListener('click', () => {
        // Reset to single empty range
        rangeCount = 1;
        dateRangesDiv.innerHTML = `
            <div class="date-range" role="listitem" data-range="1">
                <div class="range-header">
                    <span class="range-badge">Period 1</span>
                </div>
                <div class="range-fields">
                    <div class="field-group">
                        <label for="start-date-1">Start Date</label>
                        <div class="input-wrapper">
                            <input type="date" id="start-date-1" class="date-input" required aria-required="true">
                        </div>
                    </div>
                    <div class="field-separator" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="field-group">
                        <label for="end-date-1">End Date</label>
                        <div class="input-wrapper">
                            <input type="date" id="end-date-1" class="date-input" required aria-required="true">
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Hide results
        resultSection.classList.add('hidden');
        breakdownSection.classList.add('hidden');

        announceToScreenReader('All fields cleared');
    });

    // --- Keyboard Support ---
    document.addEventListener('keydown', (e) => {
        // Enter key triggers calculate when not focused on a button
        if (e.key === 'Enter' && e.target.classList.contains('date-input')) {
            e.preventDefault();
            calculateBtn.click();
        }
    });

    // --- Screen Reader Announcements ---
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
});
