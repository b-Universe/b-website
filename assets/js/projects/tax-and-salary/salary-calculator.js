(function () {
  const form = document.getElementById('salary-form');
  const amountInput = document.getElementById('salary-amount');
  const freqSelect = document.getElementById('salary-frequency');
  const hoursInput = document.getElementById('hours-per-week');
  const daysInput = document.getElementById('days-per-week');
  const holidaysInput = document.getElementById('holidays-per-year');
  const vacationInput = document.getElementById('vacation-days');
  const demoDropdown = document.getElementById('demo-scenarios');
  const scenarioPanel = document.getElementById('scenario-panel');
  const scenarioText = document.getElementById('scenario-text');

  const formatterCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const formatterCurrencyCents = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function parseCurrency(str) {
    if (!str) return 0;
    const val = parseFloat(str.toString().replace(/[^0-9.-]+/g, ""));
    return isNaN(val) ? 0 : val;
  }

  function formatDisplay(val, isHourlyOrDaily) {
    if (isHourlyOrDaily) {
      return formatterCurrencyCents.format(val);
    }
    return formatterCurrency.format(Math.round(val));
  }

  function calculate() {
    const amount = parseCurrency(amountInput.value);
    const freq = freqSelect.value;
    const hoursPerWeek = parseFloat(hoursInput.value) || 40;
    const daysPerWeek = parseFloat(daysInput.value) || 5;
    const holidays = parseFloat(holidaysInput.value) || 0;
    const vacation = parseFloat(vacationInput.value) || 0;

    const workingWeeks = 52;
    const totalWeekdays = workingWeeks * daysPerWeek;
    const adjustedWorkingDays = totalWeekdays - holidays - vacation;
    const hoursPerDay = hoursPerWeek / daysPerWeek;

    let unadjYr = 0;
    let adjYr = 0;

    if (freq === 'hour' || freq === 'day') {
      // Input is unadjusted
      let unadjDay = 0;
      if (freq === 'hour') {
        unadjDay = amount * hoursPerDay;
      } else {
        unadjDay = amount;
      }
      unadjYr = unadjDay * totalWeekdays;
      adjYr = unadjDay * adjustedWorkingDays;
    } else {
      // Input is adjusted
      let periods = 1;
      if (freq === 'week') periods = 52;
      else if (freq === 'bi-week') periods = 26;
      else if (freq === 'semi-month') periods = 24;
      else if (freq === 'month') periods = 12;
      else if (freq === 'quarter') periods = 4;

      adjYr = amount * periods;
      const unadjDay = adjYr / adjustedWorkingDays;
      unadjYr = unadjDay * totalWeekdays;
    }

    // Now populate all fields
    const updateRow = (id, period, isHourlyOrDaily) => {
      let unadjVal, adjVal;
      if (id === 'hr') {
        unadjVal = unadjYr / (totalWeekdays * hoursPerDay);
        adjVal = adjYr / (totalWeekdays * hoursPerDay);
      } else if (id === 'day') {
        unadjVal = unadjYr / totalWeekdays;
        adjVal = adjYr / totalWeekdays;
      } else {
        unadjVal = unadjYr / period;
        adjVal = adjYr / period;
      }

      document.getElementById(`res-${id}-unadj`).textContent = formatDisplay(unadjVal, isHourlyOrDaily);
      document.getElementById(`res-${id}-adj`).textContent = formatDisplay(adjVal, isHourlyOrDaily);
    };

    updateRow('hr', 0, true);
    updateRow('day', 0, true);
    updateRow('wk', 52, false);
    updateRow('biwk', 26, false);
    updateRow('semi', 24, false);
    updateRow('mo', 12, false);
    updateRow('qtr', 4, false);
    updateRow('yr', 1, false);
  }

  // Bind active formatters
  document.querySelectorAll('.currency-input').forEach(input => {
    input.addEventListener('focus', function () {
      if (this.value === '$0' || this.value === '0') {
        this.value = '';
      }
    });
    input.addEventListener('input', function () {
      let val = this.value.replace(/[^0-9.]/g, '');
      const parts = val.split('.');
      if (parts.length > 2) {
        val = parts[0] + '.' + parts.slice(1).join('');
      }
      if (val) {
        if (val.includes('.')) {
          this.value = '$' + val; // Allow typing decimals manually without breaking
        } else {
          this.value = '$' + parseInt(val, 10).toLocaleString('en-US');
        }
      } else {
        this.value = '';
      }
      calculate();
    });
    input.addEventListener('blur', function () {
      if (!this.value || this.value === '$') {
        this.value = '$0';
      } else {
        let val = parseCurrency(this.value);
        this.value = formatterCurrencyCents.format(val).replace('.00', '');
      }
    });
  });

  document.querySelectorAll('.numeric-input').forEach(input => {
    input.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9.]/g, '');
      calculate();
    });
  });

  freqSelect.addEventListener('change', calculate);

  form.addEventListener('reset', function (e) {
    e.preventDefault(); // Stop native HTML reset that restores default values
    amountInput.value = '$0';
    freqSelect.value = 'hour';
    hoursInput.value = '40';
    daysInput.value = '5';
    holidaysInput.value = '0';
    vacationInput.value = '0';

    if (scenarioPanel) scenarioPanel.style.display = 'none';
    if (demoDropdown) demoDropdown.value = '';
    calculate();
  });



  const salaryScenarios = {
    demo1: {
      inputs: { 'salary-amount': '30.00', 'salary-frequency': 'hour', 'hours-per-week': 40, 'days-per-week': 5, 'holidays-per-year': 10, 'vacation-days': 15 },
      text: '<strong>Standard Full-Time Hourly:</strong> Treats the hourly input as an unadjusted base rate ($62,400 unadjusted annual). It subtracts the 25 non-working days to calculate the adjusted figures.'
    },
    demo2: {
      inputs: { 'salary-amount': '85000.00', 'salary-frequency': 'year', 'hours-per-week': 40, 'days-per-week': 5, 'holidays-per-year': 11, 'vacation-days': 20 },
      text: '<strong>Mid-Level Corporate Salary:</strong> Locks the fixed salary as the adjusted baseline ($85,000). The engine then reverse-engineers a higher unadjusted rate ($96,507) to show true working-hour value.'
    },
    demo3: {
      inputs: { 'salary-amount': '18.50', 'salary-frequency': 'hour', 'hours-per-week': 24, 'days-per-week': 3, 'holidays-per-year': 0, 'vacation-days': 5 },
      text: '<strong>Part-Time Retail Worker:</strong> Relies on custom 24-hour weekly and 3-day weekly metrics to scale the unadjusted hourly rate down into matching localized daily and annual cycles.'
    },
    demo4: {
      inputs: { 'salary-amount': '4500.00', 'salary-frequency': 'week', 'hours-per-week': 45, 'days-per-week': 5, 'holidays-per-year': 12, 'vacation-days': 25 },
      text: '<strong>High-End Contractor / Consultant:</strong> Treats the weekly structure as stable cyclical pay (adjusted). It determines a $234,000 adjusted annual baseline and backs out the raw unadjusted metrics.'
    }
  };


  if (demoDropdown) {
    demoDropdown.addEventListener('change', function () {
      const selectedScenario = salaryScenarios[this.value];

      if (!selectedScenario) {
        scenarioPanel.style.display = 'none';
        return;
      }

      Object.keys(selectedScenario.inputs).forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
          inputEl.value = selectedScenario.inputs[id];
          if (inputEl.classList.contains('currency-input')) {
            inputEl.dispatchEvent(new Event('blur'));
          }
        }
      });

      scenarioText.innerHTML = selectedScenario.text;
      scenarioPanel.style.display = 'block';
      calculate();
    });
  }

  // Initial calculation
  calculate();
})();
