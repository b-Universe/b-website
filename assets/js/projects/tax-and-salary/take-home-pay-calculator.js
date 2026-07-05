(function () {
  const form = document.getElementById('thp-form');

  const inputs = {
    jobIncome: document.getElementById('job-income'),
    payFreq: document.getElementById('pay-frequency'),
    fileStatus: document.getElementById('file-status'),
    children: document.getElementById('children'),
    otherDependents: document.getElementById('other-dependents'),
    age65: document.getElementsByName('age-65'),
    otherIncome: document.getElementById('other-income'),
    selfEmployed: document.getElementsByName('self-employed'),
    pretaxFicaExempt: document.getElementById('pretax-fica-exempt'),
    pretaxFicaSubject: document.getElementById('pretax-fica-subject'),
    deductionsNotWithheld: document.getElementById('deductions-not-withheld'),
    itemizedDeductions: document.getElementById('itemized-deductions'),
    qualifiedTips: document.getElementById('qualified-tips'),
    qualifiedOvertime: document.getElementById('qualified-overtime'),
    vehicleInterest: document.getElementById('vehicle-interest'),
    charityCash: document.getElementById('charity-cash'),
    stateTaxRate: document.getElementById('state-tax-rate'),
    cityTaxRate: document.getElementById('city-tax-rate')
  };

  const results = {
    grossPeriod: document.getElementById('res-gross-period'),
    grossAnnual: document.getElementById('res-gross-annual'),
    fedPeriod: document.getElementById('res-fed-period'),
    fedAnnual: document.getElementById('res-fed-annual'),
    ficaPeriod: document.getElementById('res-fica-period'),
    ficaAnnual: document.getElementById('res-fica-annual'),
    statePeriod: document.getElementById('res-state-period'),
    stateAnnual: document.getElementById('res-state-annual'),
    pretaxPeriod: document.getElementById('res-pretax-period'),
    pretaxAnnual: document.getElementById('res-pretax-annual'),
    takehomePeriod: document.getElementById('res-takehome-period'),
    takehomeAnnual: document.getElementById('res-takehome-annual')
  };

  function parseCurrency(str) {
    if (!str) return 0;
    const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? 0 : num;
  }

  function parsePercent(str) {
    if (!str) return 0;
    const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? 0 : (num / 100);
  }

  function formatDisplay(val) {
    return '$' + Math.max(0, val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function getRadioValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : 'no';
  }

  function calculate() {
    // 1. Inputs
    const jobIncome = parseCurrency(inputs.jobIncome.value);
    const freq = parseFloat(inputs.payFreq.value) || 26;
    const status = inputs.fileStatus.value;
    const children = parseFloat(inputs.children.value) || 0;
    const otherDep = parseFloat(inputs.otherDependents.value) || 0;
    const is65 = getRadioValue('age-65') === 'yes';
    const otherIncome = parseCurrency(inputs.otherIncome.value);
    const isSelfEmployed = getRadioValue('self-employed') === 'yes';

    const ficaExempt = parseCurrency(inputs.pretaxFicaExempt.value);
    const ficaSubject = parseCurrency(inputs.pretaxFicaSubject.value);
    const notWithheld = parseCurrency(inputs.deductionsNotWithheld.value);
    const itemized = parseCurrency(inputs.itemizedDeductions.value);

    const tips = Math.min(25000, parseCurrency(inputs.qualifiedTips.value));
    const maxOvertime = status === 'single' || status === 'head' ? 12500 : 25000;
    const overtime = Math.min(maxOvertime, parseCurrency(inputs.qualifiedOvertime.value));
    const vehicle = Math.min(10000, parseCurrency(inputs.vehicleInterest.value));
    const charity = parseCurrency(inputs.charityCash.value);

    const stateRate = parsePercent(inputs.stateTaxRate.value);
    const cityRate = parsePercent(inputs.cityTaxRate.value);

    // 2. FICA / SECA Tax
    let ficaTax = 0;
    let secaDeduction = 0;

    // For FICA, we only tax job income minus FICA-exempt deductions
    let ficaWageBase = Math.max(0, jobIncome - ficaExempt);

    if (isSelfEmployed) {
      // SECA logic: 15.3% on 92.35% of net business income
      let netEarnings = ficaWageBase * 0.9235;

      // Social Security portion (12.4%) capped at $184,500
      let ssTaxable = Math.min(184500, netEarnings);
      let ssTax = ssTaxable * 0.124;

      // Medicare portion (2.9%) unlimited
      let medTax = netEarnings * 0.029;

      ficaTax = ssTax + medTax;

      // 50% above-the-line deduction for SECA
      secaDeduction = ficaTax * 0.5;
    } else {
      // Standard W-2 FICA
      let ssTaxable = Math.min(184500, ficaWageBase);
      let ssTax = ssTaxable * 0.062;
      let medTax = ficaWageBase * 0.0145;
      ficaTax = ssTax + medTax;
    }

    // Additional Medicare Tax (0.9% over $200k/$250k)
    let addlMedThreshold = status === 'married-joint' ? 250000 : 200000;
    if (ficaWageBase > addlMedThreshold) {
      ficaTax += (ficaWageBase - addlMedThreshold) * 0.009;
    }

    // 3. Federal Income Tax - AGI
    let agi = (jobIncome + otherIncome) - ficaExempt - ficaSubject - notWithheld - tips - overtime - vehicle - secaDeduction;
    if (agi < 0) agi = 0;

    // 4. Standard vs Itemized Deduction
    let standardDed = 16100;
    if (status === 'married-joint') standardDed = 32200;
    else if (status === 'head') standardDed = 24150;

    if (is65) {
      standardDed += 6000;
    }

    let finalDeduction = standardDed;
    let takingStandard = true;

    if (itemized > standardDed) {
      finalDeduction = itemized;
      takingStandard = false;
    } else {
      // Charitable gifts allowed if standard (up to 1k single, 2k joint)
      let maxCharity = (status === 'married-joint') ? 2000 : 1000;
      finalDeduction += Math.min(maxCharity, charity);
    }

    let taxableIncome = Math.max(0, agi - finalDeduction);

    // 5. Federal Progressive Brackets
    const bracketsSingle = [
      { rate: 0.10, upTo: 11925 },
      { rate: 0.12, upTo: 48475 },
      { rate: 0.22, upTo: 103350 },
      { rate: 0.24, upTo: 197300 },
      { rate: 0.32, upTo: 250525 },
      { rate: 0.35, upTo: 626350 },
      { rate: 0.37, upTo: Infinity }
    ];
    const bracketsJoint = [
      { rate: 0.10, upTo: 23850 },
      { rate: 0.12, upTo: 96950 },
      { rate: 0.22, upTo: 206700 },
      { rate: 0.24, upTo: 394600 },
      { rate: 0.32, upTo: 501050 },
      { rate: 0.35, upTo: 751600 },
      { rate: 0.37, upTo: Infinity }
    ];
    const bracketsHead = [
      { rate: 0.10, upTo: 17000 },
      { rate: 0.12, upTo: 64850 },
      { rate: 0.22, upTo: 103350 },
      { rate: 0.24, upTo: 197300 },
      { rate: 0.32, upTo: 250525 },
      { rate: 0.35, upTo: 626350 },
      { rate: 0.37, upTo: Infinity }
    ];

    let brackets = bracketsSingle;
    if (status === 'married-joint') brackets = bracketsJoint;
    else if (status === 'head') brackets = bracketsHead;

    let fedTax = 0;
    let remaining = taxableIncome;
    let prevLimit = 0;

    for (let b of brackets) {
      let band = b.upTo - prevLimit;
      if (remaining > band) {
        fedTax += band * b.rate;
        remaining -= band;
      } else {
        fedTax += remaining * b.rate;
        break;
      }
      prevLimit = b.upTo;
    }

    // Credits
    fedTax -= (children * 2200);
    fedTax -= (otherDep * 500);
    if (fedTax < 0) fedTax = 0;

    // 6. State & Local Taxes (Calculated on AGI)
    let stateLocalTax = agi * (stateRate + cityRate);

    // 7. Annual Totals
    let grossAnnual = jobIncome + otherIncome;
    let pretaxTotal = ficaExempt + ficaSubject;
    let takeHomeAnnual = grossAnnual - pretaxTotal - ficaTax - fedTax - stateLocalTax;

    // Update UI
    results.grossAnnual.textContent = formatDisplay(grossAnnual);
    results.grossPeriod.textContent = formatDisplay(grossAnnual / freq);

    results.fedAnnual.textContent = formatDisplay(fedTax);
    results.fedPeriod.textContent = formatDisplay(fedTax / freq);

    results.ficaAnnual.textContent = formatDisplay(ficaTax);
    results.ficaPeriod.textContent = formatDisplay(ficaTax / freq);

    results.stateAnnual.textContent = formatDisplay(stateLocalTax);
    results.statePeriod.textContent = formatDisplay(stateLocalTax / freq);

    results.pretaxAnnual.textContent = formatDisplay(pretaxTotal);
    results.pretaxPeriod.textContent = formatDisplay(pretaxTotal / freq);

    results.takehomeAnnual.textContent = formatDisplay(takeHomeAnnual);
    results.takehomePeriod.textContent = formatDisplay(takeHomeAnnual / freq);
  }


  const takeHomeScenarios = {
    demo1: {
      inputs: {
        'job-income': '$80,000',
        'pay-frequency': '26',
        'file-status': 'single',
        'children': 0,
        'other-dependents': 0,
        'age-65': 'no',
        'pretax-fica-exempt': '$2,000',
        'pretax-fica-subject': '$4,000',
        'self-employed': 'no',
        'other-income': '$0',
        'deductions-not-withheld': '$0',
        'itemized-deductions': '$0',
        'qualified-tips': '$0',
        'qualified-overtime': '$0',
        'vehicle-interest': '$0',
        'charity-cash': '$0',
        'state-tax-rate': '0%',
        'city-tax-rate': '0%'
      },
      text: '<strong>Standard W-2 Employee:</strong> A baseline scenario demonstrating the difference in pretax deductions. The $2,000 for health insurance (FICA-exempt) bypasses both FICA and Federal Income taxes, while the $4,000 401(k) contribution (FICA-subject) only reduces the Federal Income tax burden.'
    },
    demo2: {
      inputs: {
        'job-income': '$260,000',
        'pay-frequency': '12',
        'file-status': 'single',
        'children': 0,
        'other-dependents': 0,
        'age-65': 'no',
        'pretax-fica-exempt': '$0',
        'pretax-fica-subject': '$0',
        'self-employed': 'no',
        'other-income': '$0',
        'deductions-not-withheld': '$0',
        'itemized-deductions': '$0',
        'qualified-tips': '$0',
        'qualified-overtime': '$0',
        'vehicle-interest': '$0',
        'charity-cash': '$0',
        'state-tax-rate': '0%',
        'city-tax-rate': '0%'
      },
      text: '<strong>High-Earner (FICA Caps & Surtaxes):</strong> This tests the upper limits of the payroll system. The 6.2% Social Security tax strictly halts once wages hit the $184,500 wage base limit for 2026. Simultaneously, crossing the $200,000 single threshold triggers the 0.9% Additional Medicare Tax on the remaining $60,000.'
    },
    demo3: {
      inputs: {
        'job-income': '$120,000',
        'pay-frequency': '12',
        'file-status': 'single',
        'children': 0,
        'other-dependents': 0,
        'age-65': 'no',
        'pretax-fica-exempt': '$0',
        'pretax-fica-subject': '$0',
        'self-employed': 'yes',
        'other-income': '$0',
        'deductions-not-withheld': '$0',
        'itemized-deductions': '$0',
        'qualified-tips': '$0',
        'qualified-overtime': '$0',
        'vehicle-interest': '$0',
        'charity-cash': '$0',
        'state-tax-rate': '0%',
        'city-tax-rate': '0%'
      },
      text: '<strong>Self-Employed Freelancer:</strong> Showcases the SECA tax logic. Instead of standard FICA withholdings, the engine calculates the full 15.3% tax rate against 92.35% of the net business income. It then automatically applies the 50% above-the-line deduction to lower the AGI before calculating federal income tax.'
    },
    demo4: {
      inputs: {
        'job-income': '$110,000',
        'pay-frequency': '26',
        'file-status': 'married-joint',
        'children': 2,
        'other-dependents': 0,
        'age-65': 'no',
        'pretax-fica-exempt': '$0',
        'pretax-fica-subject': '$0',
        'qualified-overtime': '$10,000',
        'self-employed': 'no',
        'other-income': '$0',
        'deductions-not-withheld': '$0',
        'itemized-deductions': '$0',
        'qualified-tips': '$0',
        'vehicle-interest': '$0',
        'charity-cash': '$0',
        'state-tax-rate': '0%',
        'city-tax-rate': '0%'
      },
      text: '<strong>Working Family (OBBBA Provisions):</strong> A perfect demonstration of the new family-focused tax laws. The $10,000 in qualified overtime is completely deducted from the AGI. The system applies the $32,200 joint standard deduction and utilizes two $2,200 Child Tax Credits to drastically reduce the final federal tax liability.'
    }
  };

  const demoDropdown = document.getElementById('demo-scenarios');
  const scenarioPanel = document.getElementById('scenario-panel');
  const scenarioText = document.getElementById('scenario-text');

  if (demoDropdown) {
    demoDropdown.addEventListener('change', function () {
      const selectedScenario = takeHomeScenarios[this.value];
      if (!selectedScenario) {
        scenarioPanel.style.display = 'none';
        document.getElementById('results-scenario-grid').classList.remove('has-scenario');
        return;
      }

      Object.keys(selectedScenario.inputs).forEach(id => {
        const inputEl = document.getElementById(id) || document.querySelector(`input[name="${id}"]`);
        if (inputEl) {
          if (inputEl.type === 'radio' || inputEl.tagName.toLowerCase() === 'input' && document.querySelectorAll(`input[name="${id}"]`).length > 1) {
            const targetRadio = document.querySelector(`input[name="${id}"][value="${selectedScenario.inputs[id]}"]`);
            if (targetRadio) {
              targetRadio.checked = true;
            }
          } else {
            inputEl.value = selectedScenario.inputs[id];
          }
        }
      });

      scenarioText.innerHTML = selectedScenario.text;
      scenarioPanel.style.display = 'block';
      document.getElementById('results-scenario-grid').classList.add('has-scenario');
      calculate();
    });
  }

  // Event Listeners
  document.querySelectorAll('.calc-input').forEach(input => {
    input.addEventListener('input', calculate);
    input.addEventListener('change', calculate);
  });

  document.querySelectorAll('.currency-input').forEach(input => {
    input.addEventListener('blur', function () {
      let val = this.value.replace(/[^0-9.]/g, '');
      if (val === '') {
        this.value = '$0';
        return;
      }
      val = parseFloat(val);
      if (isNaN(val)) {
        this.value = '$0';
        return;
      }
      this.value = '$' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      calculate();
    });

    input.addEventListener('focus', function () {
      if (this.value === '$0' || this.value === '$0.00' || this.value === '0') {
        this.value = '';
      }
    });
  });

  document.querySelectorAll('.percent-input').forEach(input => {
    input.addEventListener('blur', function () {
      let val = this.value.replace(/[^0-9.]/g, '');
      if (val === '') {
        this.value = '0%';
        return;
      }
      val = parseFloat(val);
      if (isNaN(val)) {
        this.value = '0%';
        return;
      }
      this.value = val + '%';
      calculate();
    });

    input.addEventListener('focus', function () {
      if (this.value === '0%' || this.value === '0') {
        this.value = '';
      }
    });
  });

  // Standard numeric inputs
  [inputs.children, inputs.otherDependents].forEach(input => {
    input.addEventListener('focus', function () {
      if (this.value === '0') this.value = '';
    });
    input.addEventListener('blur', function () {
      if (this.value.trim() === '') this.value = '0';
      calculate();
    });
  });

  form.addEventListener('reset', function (e) {
    e.preventDefault();

    document.querySelectorAll('.currency-input').forEach(i => i.value = '$0');
    document.querySelectorAll('.percent-input').forEach(i => i.value = '0%');
    inputs.children.value = '0';
    inputs.otherDependents.value = '0';


    if (scenarioPanel) scenarioPanel.style.display = 'none';
    document.getElementById('results-scenario-grid').classList.remove('has-scenario');
    if (demoDropdown) demoDropdown.value = '';
    inputs.jobIncome.value = '$80,000';
    inputs.payFreq.value = '26';
    inputs.fileStatus.value = 'single';

    document.querySelector('input[name="age-65"][value="no"]').checked = true;
    document.querySelector('input[name="self-employed"][value="no"]').checked = true;

    calculate();
  });

  calculate();
})();
