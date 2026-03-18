document.addEventListener('DOMContentLoaded', () => {
    const addRangeBtn = document.getElementById('add-range');
    const dateRangesDiv = document.getElementById('date-ranges');
    const calculateBtn = document.getElementById('calculate');
    const resultDiv = document.getElementById('result');
    let rangeCount = 1;

    addRangeBtn.addEventListener('click', () => {
        rangeCount++;
        const newRange = document.createElement('div');
        newRange.classList.add('date-range');
        newRange.innerHTML = `
            <label for="start-date-${rangeCount}">Start Date:</label>
            <input type="date" id="start-date-${rangeCount}">
            <label for="end-date-${rangeCount}">End Date:</label>
            <input type="date" id="end-date-${rangeCount}">
        `;
        dateRangesDiv.appendChild(newRange);
    });

    calculateBtn.addEventListener('click', () => {
        let totalDays = 0;
        const dateRanges = document.querySelectorAll('.date-range');

        dateRanges.forEach((range, index) => {
            const startDateInput = range.querySelector(`input[id^="start-date-"]`);
            const endDateInput = range.querySelector(`input[id^="end-date-"]`);

            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
                if (endDate < startDate) {
                    resultDiv.textContent = 'End date cannot be earlier than the start date.';
                    totalDays = -1; // Flag for error
                    return;
                }
                // Calculate the difference in time
                const timeDiff = endDate.getTime() - startDate.getTime();
                // Calculate the difference in days
                const dayDiff = timeDiff / (1000 * 3600 * 24) + 1; // Add 1 to include the start date
                totalDays += dayDiff;
            }
        });

        if (totalDays !== -1) {
            resultDiv.textContent = `Total active duty days: ${Math.round(totalDays)}`;
        }
    });
});
