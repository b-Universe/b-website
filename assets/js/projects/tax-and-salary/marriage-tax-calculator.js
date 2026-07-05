// assets/js/projects/tax-and-salary/marriage-tax-calculator.js
(function () {
  const scenarioData = {
    demo1: {
      inputs: {
        's1-wages': '$150,000',
        's2-wages': '$50,000',
        's1-interest': '$0',
        's2-interest': '$0',
        's1-passive': '$0',
        's2-passive': '$0',
        's1-st-gains': '$0',
        's2-st-gains': '$0',
        's1-lt-gains': '$0',
        's2-lt-gains': '$0',
        's1-qual-div': '$0',
        's2-qual-div': '$0',
        's1-retirement': '$0',
        's2-retirement': '$0',
        's1-status': 'Single',
        's2-status': 'Single',
        's1-dependents': 0,
        's2-dependents': 0,
        's1-use-standard': 'yes',
        's2-use-standard': 'yes',
        's1-mortgage': '$0',
        's2-mortgage': '$0',
        's1-charity': '$0',
        's2-charity': '$0',
        's1-student-loan': '$0',
        's2-student-loan': '$0',
        's1-child-care': '$0',
        's2-child-care': '$0',
        's1-salt-rate': '5',
        's2-salt-rate': '5',
        's1-self-employed': 'no',
        's2-self-employed': 'no'
      },
      text: '<strong>The Single-Income Bonus:</strong> This scenario highlights the marriage bonus, where couples experience a significant tax reduction by filing jointly. Filing jointly shifts the primary earner\'s income into lower, wider tax brackets and doubles the standard deduction.'
    },
    demo2: {
      inputs: {
        's1-wages': '$60,000',
        's2-wages': '$60,000',
        's1-interest': '$0',
        's2-interest': '$0',
        's1-passive': '$0',
        's2-passive': '$0',
        's1-st-gains': '$0',
        's2-st-gains': '$0',
        's1-lt-gains': '$0',
        's2-lt-gains': '$0',
        's1-qual-div': '$0',
        's2-qual-div': '$0',
        's1-retirement': '$0',
        's2-retirement': '$0',
        's1-status': 'Single',
        's2-status': 'Single',
        's1-dependents': 0,
        's2-dependents': 0,
        's1-use-standard': 'yes',
        's2-use-standard': 'yes',
        's1-mortgage': '$0',
        's2-mortgage': '$0',
        's1-charity': '$0',
        's2-charity': '$0',
        's1-student-loan': '$0',
        's2-student-loan': '$0',
        's1-child-care': '$0',
        's2-child-care': '$0',
        's1-salt-rate': '5',
        's2-salt-rate': '5',
        's1-self-employed': 'no',
        's2-self-employed': 'no'
      },
      text: '<strong>The Average Earner Parity:</strong> This scenario demonstrates tax neutrality, which is the most common outcome for median earners. Because the lower federal tax brackets for joint filers are exactly double the single brackets, the joint tax liability remains virtually identical.'
    },
    demo3: {
      inputs: {
        's1-wages': '$450,000',
        's2-wages': '$450,000',
        's1-interest': '$0',
        's2-interest': '$0',
        's1-passive': '$0',
        's2-passive': '$0',
        's1-st-gains': '$0',
        's2-st-gains': '$0',
        's1-lt-gains': '$0',
        's2-lt-gains': '$0',
        's1-qual-div': '$0',
        's2-qual-div': '$0',
        's1-retirement': '$0',
        's2-retirement': '$0',
        's1-status': 'Single',
        's2-status': 'Single',
        's1-dependents': 0,
        's2-dependents': 0,
        's1-use-standard': 'yes',
        's2-use-standard': 'yes',
        's1-mortgage': '$0',
        's2-mortgage': '$0',
        's1-charity': '$0',
        's2-charity': '$0',
        's1-student-loan': '$0',
        's2-student-loan': '$0',
        's1-child-care': '$0',
        's2-child-care': '$0',
        's1-salt-rate': '5',
        's2-salt-rate': '5',
        's1-self-employed': 'no',
        's2-self-employed': 'no'
      },
      text: '<strong>The High-Income Penalty:</strong> This scenario illustrates the marriage penalty, which occurs primarily at very high income levels. The highest federal tax brackets do not double for married couples, resulting in a higher total tax burden.'
    }
  };

  function parseCurrency(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/[^0-9-]/g, ""), 10) || 0;
  }

  function formatCurrency(num) {
    let formatted = Math.round(num).toLocaleString('en-US');
    if (num < 0) {
      return '-$' + formatted.substring(1);
    }
    return '$' + formatted;
  }

  function handleCurrencyInput(e) {
    let cursor = e.target.selectionStart;
    let val = e.target.value;
    let oldLength = val.length;

    let cleanVal = val.replace(/[^0-9-]/g, "");
    if (cleanVal.indexOf('-') > 0) {
      cleanVal = cleanVal.charAt(0) + cleanVal.slice(1).replace(/-/g, '');
    }

    if (cleanVal === "" || cleanVal === "-") {
      e.target.value = cleanVal;
    } else {
      let num = parseInt(cleanVal, 10);
      e.target.value = formatCurrency(num);
    }

    let newLength = e.target.value.length;
    let newCursor = cursor + (newLength - oldLength);
    if (newCursor < 0) newCursor = 0;

    if (document.activeElement === e.target) {
      e.target.setSelectionRange(newCursor, newCursor);
    }
    calculateAll();
  }

  // Bracket Data (2026 approx)
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

  const calcTaxForBrackets = (taxableIncome, brackets) => {
    let taxOwed = 0;
    let remaining = taxableIncome;
    let previousLimit = 0;
    for (let b of brackets) {
      let bracketAmount = b.upTo - previousLimit;
      if (remaining > bracketAmount) {
        taxOwed += bracketAmount * b.rate;
        remaining -= bracketAmount;
        previousLimit = b.upTo;
      } else {
        taxOwed += remaining * b.rate;
        break;
      }
    }
    return taxOwed;
  };

  const getSALT = (stateTaxPercent, income, status, magi) => {
    let saltAmount = income * (stateTaxPercent / 100);
    let saltCap = status === 'MFS' ? 20200 : 40400;

    if (magi > 505000) {
      const excess = magi - 505000;
      saltCap = Math.max(10000, saltCap - (excess * 0.30));
    }

    return Math.min(saltAmount, saltCap);
  };

  const getChildCareCredit = (expenses, dependents, agi, status) => {
    if (dependents === 0) return 0;
    const maxExpenses = dependents === 1 ? 3000 : 6000;
    const eligibleExpenses = Math.min(expenses, maxExpenses);

    let percentage = 0.20;

    if (status === 'MFJ') {
      if (agi <= 15000) percentage = 0.50;
      else if (agi <= 45000) percentage = 0.50 - ((agi - 15000) / 2000 * 0.01);
      else if (agi <= 150000) percentage = 0.35;
      else if (agi <= 210000) percentage = 0.35 - ((agi - 150000) / 4000 * 0.01);
    } else {
      if (agi <= 15000) percentage = 0.50;
      else if (agi <= 43000) percentage = 0.50 - ((agi - 15000) / 2000 * 0.01);
      else if (agi <= 75000) percentage = 0.35;
      else if (agi <= 105000) percentage = 0.35 - ((agi - 75000) / 2000 * 0.01);
    }

    return eligibleExpenses * Math.max(0.20, percentage);
  };

  const calculateCapitalGains = (prefIncome, taxableOrdinary, fileStatus) => {
    if (prefIncome <= 0) return 0;
    const limit0 = (fileStatus === 'MFJ' || fileStatus === 'widow') ? 96700 : 48350;
    const limit15 = (fileStatus === 'MFJ' || fileStatus === 'widow') ? 600050 : 553850;

    let prefTax = 0;
    let stack = taxableOrdinary;
    let remainingPref = prefIncome;

    if (stack < limit0) {
      let roomIn0 = limit0 - stack;
      let amtIn0 = Math.min(roomIn0, remainingPref);
      remainingPref -= amtIn0;
      stack += amtIn0;
    }

    if (remainingPref > 0 && stack < limit15) {
      let roomIn15 = limit15 - stack;
      let amtIn15 = Math.min(roomIn15, remainingPref);
      prefTax += amtIn15 * 0.15;
      remainingPref -= amtIn15;
    }

    if (remainingPref > 0) {
      prefTax += remainingPref * 0.20;
    }

    return prefTax;
  };

  const calculateAMT = (taxableIncome, status, addedBackDeductions) => {
    const amti = taxableIncome + addedBackDeductions;

    let exemption = status === 'MFJ' ? 140200 : 90100;
    const phaseoutThreshold = status === 'MFJ' ? 1000000 : 500000;

    if (amti > phaseoutThreshold) {
      const excess = amti - phaseoutThreshold;
      exemption = Math.max(0, exemption - (excess * 0.50));
    }

    const amtBase = Math.max(0, amti - exemption);
    let amtTax = 0;

    if (amtBase <= 244500) {
      amtTax = amtBase * 0.26;
    } else {
      amtTax = (244500 * 0.26) + ((amtBase - 244500) * 0.28);
    }

    return amtTax;
  };

  function calculatePerson(prefix, isJoint, jointData = null) {
    const wages = parseCurrency(document.getElementById(prefix + 'wages').value);
    const interest = parseCurrency(document.getElementById(prefix + 'interest').value);
    const passive = parseCurrency(document.getElementById(prefix + 'passive').value);
    const stGains = parseCurrency(document.getElementById(prefix + 'st-gains').value);
    const ltGains = parseCurrency(document.getElementById(prefix + 'lt-gains').value);
    const qualDiv = parseCurrency(document.getElementById(prefix + 'qual-div').value);
    const retirement = Math.min(7500, parseCurrency(document.getElementById(prefix + 'retirement').value));

    const status = isJoint ? 'MFJ' : document.getElementById(prefix + 'status').value; // Single, Head, etc.
    const dependents = parseInt(document.getElementById(prefix + 'dependents').value) || 0;
    const useStandard = document.querySelector(`input[name="${prefix}use-standard"]:checked`).value === 'yes';

    const mortgage = parseCurrency(document.getElementById(prefix + 'mortgage').value);
    const charity = parseCurrency(document.getElementById(prefix + 'charity').value);
    const studentLoan = Math.min(2500, parseCurrency(document.getElementById(prefix + 'student-loan').value));
    const childCare = parseCurrency(document.getElementById(prefix + 'child-care').value);
    const saltRate = parseFloat(document.getElementById(prefix + 'salt-rate').value) || 0;
    const selfEmployed = document.querySelector(`input[name="${prefix}self-employed"]:checked`).value === 'yes';

    let ordinaryIncome = wages + interest + passive + stGains;
    let prefIncome = ltGains + qualDiv;

    if (isJoint && jointData) {
      // If joint, combine values first, then calculate. The caller handles this.
      return null;
    }

    // Above the line deductions
    let agi = ordinaryIncome + prefIncome - retirement - studentLoan;
    if (agi < 0) agi = 0;

    let magi = agi; // Simplified for this calc

    // Self-Employment Tax (simplified: 15.3% on 92.35% of wages if self employed)
    let seTax = 0;
    if (selfEmployed) {
      seTax = (wages * 0.9235) * 0.153;
    }

    // Itemized vs Standard
    let stdDeduction = 16100; // Single/MFS 2026
    if (status === 'Head') stdDeduction = 24150;

    let saltDed = getSALT(saltRate, ordinaryIncome + prefIncome, status, magi);
    let itemizedDeduction = useStandard ? 0 : (mortgage + charity + saltDed);

    let deduction = useStandard ? stdDeduction : Math.max(stdDeduction, itemizedDeduction);

    let taxableOrdinary = agi - prefIncome - deduction;
    if (taxableOrdinary < 0) {
      prefIncome = Math.max(0, prefIncome + taxableOrdinary); // Reduce pref income if deductions exceed ordinary
      taxableOrdinary = 0;
    }

    // Tax Brackets
    let brackets = bracketsSingle;
    if (status === 'Head') brackets = bracketsHead;

    let ordinaryTax = calcTaxForBrackets(taxableOrdinary, brackets);
    let prefTax = calculateCapitalGains(prefIncome, taxableOrdinary, status);

    let regularIncomeTax = ordinaryTax + prefTax;

    // AMT Logic
    let actualDeductionTaken = useStandard ? stdDeduction : Math.max(stdDeduction, itemizedDeduction);
    let addedBackDeductions = (actualDeductionTaken === stdDeduction) ? stdDeduction : saltDed;
    let amtTax = calculateAMT(taxableOrdinary + prefIncome, status, addedBackDeductions);

    let finalIncomeTax = Math.max(regularIncomeTax, amtTax);

    let totalTax = finalIncomeTax + seTax;

    // Credits
    let childCredit = getChildCareCredit(childCare, dependents, agi, status);

    totalTax = Math.max(0, totalTax - childCredit);

    return {
      wages, interest, passive, stGains, ltGains, qualDiv, retirement,
      dependents, mortgage, charity, studentLoan, childCare, saltRate,
      seTax, totalTax, agi
    };
  }

  function calculateJoint(p1, p2) {
    const wages = p1.wages + p2.wages;
    const interest = p1.interest + p2.interest;
    const passive = p1.passive + p2.passive;
    const stGains = p1.stGains + p2.stGains;
    const ltGains = p1.ltGains + p2.ltGains;
    const qualDiv = p1.qualDiv + p2.qualDiv;
    const retirement = p1.retirement + p2.retirement; // already capped individually

    const dependents = p1.dependents + p2.dependents;
    const mortgage = p1.mortgage + p2.mortgage;
    const charity = p1.charity + p2.charity;
    const studentLoan = p1.studentLoan + p2.studentLoan; // already capped individually
    const childCare = p1.childCare + p2.childCare;

    // Average SALT rate weighted by income? Or just combine the resulting SALT deductions.
    // It's better to recalculate based on total income and combined rate or just total state tax paid.
    // Let's use the average rate weighted by income for simplicity if they entered rates
    const totalIncome = wages + interest + passive + stGains + ltGains + qualDiv;
    const s1Inc = p1.wages + p1.interest + p1.passive + p1.stGains + p1.ltGains + p1.qualDiv;
    const s2Inc = p2.wages + p2.interest + p2.passive + p2.stGains + p2.ltGains + p2.qualDiv;

    let avgSaltRate = 0;
    if (totalIncome > 0) {
      avgSaltRate = ((s1Inc * p1.saltRate) + (s2Inc * p2.saltRate)) / totalIncome;
    }

    let ordinaryIncome = wages + interest + passive + stGains;
    let prefIncome = ltGains + qualDiv;

    let agi = ordinaryIncome + prefIncome - retirement - studentLoan;
    if (agi < 0) agi = 0;

    let saltDed = getSALT(avgSaltRate, ordinaryIncome + prefIncome, 'MFJ', agi);
    let itemizedDeduction = mortgage + charity + saltDed;

    // Check if either wants standard. If so, apply joint standard deduction.
    const s1Std = document.querySelector(`input[name="s1-use-standard"]:checked`).value === 'yes';
    const s2Std = document.querySelector(`input[name="s2-use-standard"]:checked`).value === 'yes';

    // For Joint, they must choose one. If they itemize, they both itemize.
    const useStandard = s1Std || s2Std; // If either wants standard, default to checking standard vs itemized
    let stdDeduction = 32200; // MFJ 2026

    let deduction = useStandard ? stdDeduction : Math.max(stdDeduction, itemizedDeduction);

    let taxableOrdinary = agi - prefIncome - deduction;
    if (taxableOrdinary < 0) {
      prefIncome = Math.max(0, prefIncome + taxableOrdinary);
      taxableOrdinary = 0;
    }

    let ordinaryTax = calcTaxForBrackets(taxableOrdinary, bracketsJoint);
    let prefTax = calculateCapitalGains(prefIncome, taxableOrdinary, 'MFJ');

    let regularIncomeTax = ordinaryTax + prefTax;

    // AMT Logic
    let actualDeductionTaken = useStandard ? stdDeduction : Math.max(stdDeduction, itemizedDeduction);
    let addedBackDeductions = (actualDeductionTaken === stdDeduction) ? stdDeduction : saltDed;
    let amtTax = calculateAMT(taxableOrdinary + prefIncome, 'MFJ', addedBackDeductions);

    let finalIncomeTax = Math.max(regularIncomeTax, amtTax);

    let seTax = p1.seTax + p2.seTax; // Combined

    let totalTax = finalIncomeTax + seTax;

    let childCredit = getChildCareCredit(childCare, dependents, agi, 'MFJ');

    totalTax = Math.max(0, totalTax - childCredit);

    return totalTax;
  }

  function toggleStandardDeduction(prefix) {
    const isStandard = document.querySelector(`input[name="${prefix}use-standard"]:checked`).value === 'yes';
    const fields = ['mortgage', 'charity', 'salt-rate'];
    fields.forEach(field => {
      const el = document.getElementById(prefix + field);
      if (el) {
        el.disabled = isStandard;
        if (isStandard) {
          el.parentElement.style.opacity = '0.5';
        } else {
          el.parentElement.style.opacity = '1';
        }
      }
    });
  }

  function calculateAll() {
    const p1 = calculatePerson('s1-');
    const p2 = calculatePerson('s2-');

    const jointTax = calculateJoint(p1, p2);
    const separateTax = p1.totalTax + p2.totalTax;

    const diff = separateTax - jointTax;

    const resultEl = document.getElementById('calc-results');
    let title = "";
    let color = "";

    if (diff > 50) {
      title = "Marriage Bonus!";
      color = "#55ff55"; // Green
    } else if (diff < -50) {
      title = "Marriage Penalty!";
      color = "#ff5555"; // Red
    } else {
      title = "Tax Neutral";
      color = "var(--text-light)";
    }

    let html = `
      <h3 style="color: ${color}; margin-top:0;">${title}</h3>
      <p style="margin-bottom: 15px; font-size: 1.1rem;">
        Combined Tax if Single: <strong>${formatCurrency(separateTax)}</strong><br>
        Tax if Married Filing Jointly: <strong>${formatCurrency(jointTax)}</strong>
      </p>
    `;

    if (diff > 50) {
      html += `<p style="color: ${color}; font-weight: bold;">You save ${formatCurrency(diff)} by filing jointly.</p>`;
    } else if (diff < -50) {
      html += `<p style="color: ${color}; font-weight: bold;">You pay ${formatCurrency(Math.abs(diff))} more by filing jointly.</p>`;
    } else {
      html += `<p style="color: ${color}; font-weight: bold;">Your tax liability is approximately the same.</p>`;
    }

    resultEl.innerHTML = html;
  }

  function loadDemo(demoId) {
    const data = scenarioData[demoId];
    if (!data) return;

    for (let key in data.inputs) {
      const el = document.getElementById(key);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.value = data.inputs[key];
        } else {
          el.value = data.inputs[key];
        }
      } else {
        // Radios
        const radios = document.querySelectorAll(`input[name="${key}"]`);
        if (radios.length > 0) {
          radios.forEach(r => {
            r.checked = (r.value === data.inputs[key]);
          });
        }
      }
    }

    toggleStandardDeduction('s1-');
    toggleStandardDeduction('s2-');

    const desc = document.getElementById('scenario-text');
    desc.innerHTML = data.text;
    document.getElementById('scenario-panel').style.display = 'block';

    calculateAll();
  }

  const currencyInputs = document.querySelectorAll('.currency-input');
  currencyInputs.forEach(input => {
    input.addEventListener('focus', (e) => {
      if (e.target.value === '$0' || e.target.value === '0' || e.target.value === '') {
        e.target.value = '';
      }
    });
    input.addEventListener('input', handleCurrencyInput);
    input.addEventListener('blur', (e) => {
      if (e.target.value === '' || e.target.value === '$' || e.target.value === '-') {
        e.target.value = '$0';
      }
    });
  });

  const otherInputs = document.querySelectorAll('input:not(.currency-input), select');
  otherInputs.forEach(input => {
    input.addEventListener('change', calculateAll);
    input.addEventListener('input', calculateAll);
  });

  document.querySelectorAll('input[name="s1-use-standard"]').forEach(r => {
    r.addEventListener('change', () => toggleStandardDeduction('s1-'));
  });

  document.querySelectorAll('input[name="s2-use-standard"]').forEach(r => {
    r.addEventListener('change', () => toggleStandardDeduction('s2-'));
  });

  const demoSelect = document.getElementById('demo-scenarios');
  if (demoSelect) {
    demoSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        loadDemo(e.target.value);
      } else {
        document.getElementById('marriage-tax-form').reset();
        toggleStandardDeduction('s1-');
        toggleStandardDeduction('s2-');
        document.getElementById('scenario-panel').style.display = 'none';
        calculateAll();
      }
    });
  }

  const resetBtn = document.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent native reset if inside form, we handle it manually
      document.getElementById('marriage-tax-form').reset();
      setTimeout(() => {
        if (demoSelect) demoSelect.value = '';
        toggleStandardDeduction('s1-');
        toggleStandardDeduction('s2-');
        document.getElementById('scenario-panel').style.display = 'none';
        calculateAll();
      }, 10);
    });
  }

  // Initial setup
  toggleStandardDeduction('s1-');
  toggleStandardDeduction('s2-');
  calculateAll();
})();
