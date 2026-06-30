(function() {
  const scenarioData = {
    demo1: {
      inputs: {
        'file-status': 'single',
        'young-dep': 0,
        'other-dep': 0,
        'tax-year': '2026',
        'age': 30,
        'wages': '$50,000',
        'federal-withheld': '$5,000',
        'state-withheld': '$0',
        'local-withheld': '$0',
        'has-biz': 'no',
        'business-income': '$0',
        'estimated-tax-paid': '$0',
        'medicare-wages': '$0',
        'ss-income': '$0',
        'interest-income': '$0',
        'ordinary-dividends': '$0',
        'qualified-dividends': '$0',
        'passive-incomes': '$0',
        'short-term-gains': '$0',
        'long-term-gains': '$0',
        'other-income': '$0',
        'state-local-tax-rate': '0%',
        'tips-income': '$0',
        'overtime-income': '$0',
        'car-loan-int': '$0',
        'ira-contrib': '$0',
        'real-estate-tax': '$0',
        'mortgage-int': '$0',
        'charitable-donations': '$0',
        'student-loan-int': '$0',
        'child-care-expense': '$0',
        'college-student-1': '$0',
        'college-student-2': '$0',
        'college-student-3': '$0',
        'college-student-4': '$0',
        'other-deductibles': '$0'
      },
      text: '<strong>Basic Single Filer:</strong> This scenario represents a typical single individual with a straightforward W-2 wage. They don\'t claim any dependents or itemized deductions. The calculator automatically utilizes the standard deduction ($16,100 for 2026) to determine taxable income.'
    },
    demo2: {
      inputs: {
        'file-status': 'married-joint',
        'young-dep': 0,
        'other-dep': 0,
        'tax-year': '2026',
        'age': 40,
        'wages': '$120,000',
        'federal-withheld': '$10,000',
        'state-withheld': '$15,000',
        'local-withheld': '$0',
        'has-biz': 'no',
        'business-income': '$0',
        'estimated-tax-paid': '$0',
        'medicare-wages': '$0',
        'ss-income': '$0',
        'interest-income': '$0',
        'ordinary-dividends': '$0',
        'qualified-dividends': '$0',
        'passive-incomes': '$0',
        'short-term-gains': '$0',
        'long-term-gains': '$0',
        'other-income': '$0',
        'state-local-tax-rate': '0%',
        'tips-income': '$0',
        'overtime-income': '$0',
        'car-loan-int': '$0',
        'ira-contrib': '$0',
        'real-estate-tax': '$10,000',
        'mortgage-int': '$15,000',
        'charitable-donations': '$0',
        'student-loan-int': '$0',
        'child-care-expense': '$0',
        'college-student-1': '$0',
        'college-student-2': '$0',
        'college-student-3': '$0',
        'college-student-4': '$0',
        'other-deductibles': '$0'
      },
      text: '<strong>High Deductions (Itemized):</strong> Designed for homeowners with significant expenses. Because the combined total of state/local taxes and mortgage interest ($40,000) exceeds the married filing jointly standard deduction ($32,200 for 2026), the system automatically optimizes the tax liability by itemizing instead.'
    },
    demo3: {
      inputs: {
        'file-status': 'married-joint',
        'young-dep': 2,
        'other-dep': 0,
        'tax-year': '2025',
        'age': 68,
        'wages': '$60,000',
        'federal-withheld': '$4,000',
        'state-withheld': '$0',
        'local-withheld': '$0',
        'has-biz': 'no',
        'business-income': '$0',
        'estimated-tax-paid': '$0',
        'medicare-wages': '$0',
        'ss-income': '$0',
        'interest-income': '$0',
        'ordinary-dividends': '$0',
        'qualified-dividends': '$0',
        'passive-incomes': '$0',
        'short-term-gains': '$0',
        'long-term-gains': '$0',
        'other-income': '$0',
        'state-local-tax-rate': '0%',
        'tips-income': '$0',
        'overtime-income': '$0',
        'car-loan-int': '$0',
        'ira-contrib': '$0',
        'real-estate-tax': '$0',
        'mortgage-int': '$0',
        'charitable-donations': '$0',
        'student-loan-int': '$0',
        'child-care-expense': '$0',
        'college-student-1': '$0',
        'college-student-2': '$0',
        'college-student-3': '$0',
        'college-student-4': '$0',
        'other-deductibles': '$0'
      },
      text: '<strong>Joint Filers (Senior & Dependents):</strong> This demonstrates unique age-based rules and credits under 2025 laws. Since both filers are over 65, they unlock an additional $12,000 senior standard deduction bonus. Additionally, their two young dependents trigger a $4,400 Child Tax Credit, wiping out their tax liability.'
    },
    demo4: {
      inputs: {
        'file-status': 'single',
        'young-dep': 0,
        'other-dep': 0,
        'tax-year': '2026',
        'age': 45,
        'wages': '$200,000',
        'federal-withheld': '$0',
        'state-withheld': '$25,000',
        'local-withheld': '$10,000',
        'has-biz': 'no',
        'business-income': '$0',
        'estimated-tax-paid': '$0',
        'medicare-wages': '$0',
        'ss-income': '$0',
        'interest-income': '$0',
        'ordinary-dividends': '$0',
        'qualified-dividends': '$0',
        'passive-incomes': '$0',
        'short-term-gains': '$0',
        'long-term-gains': '$0',
        'other-income': '$0',
        'state-local-tax-rate': '0%',
        'tips-income': '$0',
        'overtime-income': '$0',
        'car-loan-int': '$0',
        'ira-contrib': '$0',
        'real-estate-tax': '$15,000',
        'mortgage-int': '$0',
        'charitable-donations': '$0',
        'student-loan-int': '$0',
        'child-care-expense': '$0',
        'college-student-1': '$0',
        'college-student-2': '$0',
        'college-student-3': '$0',
        'college-student-4': '$0',
        'other-deductibles': '$0'
      },
      text: '<strong>High Income (SALT Capped):</strong> This case targets individuals paying heavy state, local, or property taxes. Total state and local taxes equal $50,000, but the calculator strictly limits the maximum allowable SALT deduction to the legal cap ($40,400 for 2026) before evaluating the return.'
    },
    demo5: {
      inputs: {
        'file-status': 'single',
        'young-dep': 0,
        'other-dep': 0,
        'tax-year': '2025',
        'age': 25,
        'wages': '$110,000',
        'federal-withheld': '$0',
        'state-withheld': '$0',
        'local-withheld': '$0',
        'has-biz': 'no',
        'business-income': '$0',
        'estimated-tax-paid': '$0',
        'medicare-wages': '$0',
        'ss-income': '$0',
        'interest-income': '$0',
        'ordinary-dividends': '$0',
        'qualified-dividends': '$0',
        'passive-incomes': '$0',
        'short-term-gains': '$0',
        'long-term-gains': '$0',
        'other-income': '$0',
        'state-local-tax-rate': '0%',
        'tips-income': '$0',
        'overtime-income': '$0',
        'car-loan-int': '$0',
        'ira-contrib': '$0',
        'real-estate-tax': '$0',
        'mortgage-int': '$0',
        'charitable-donations': '$0',
        'student-loan-int': '$2,500',
        'child-care-expense': '$0',
        'college-student-1': '$0',
        'college-student-2': '$0',
        'college-student-3': '$0',
        'college-student-4': '$0',
        'other-deductibles': '$0'
      },
      text: '<strong>Single Filer (Student Loan Phase-out):</strong> Intended for moderate-to-high earning graduates. While student loan interest deductions can reduce tax obligations up to $2,500, this incentive phases out entirely once a single person\'s wages hit or cross the $100,000 ceiling under 2025 regulations.'
    },
    demo6: {
      inputs: {
        'file-status': 'head',
        'young-dep': 1,
        'other-dep': 0,
        'tax-year': '2026',
        'age': 32,
        'wages': '$45,000',
        'federal-withheld': '$2,500',
        'state-withheld': '$0',
        'local-withheld': '$0',
        'has-biz': 'no',
        'business-income': '$0',
        'estimated-tax-paid': '$0',
        'medicare-wages': '$0',
        'ss-income': '$0',
        'interest-income': '$0',
        'ordinary-dividends': '$0',
        'qualified-dividends': '$0',
        'passive-incomes': '$0',
        'short-term-gains': '$0',
        'long-term-gains': '$0',
        'other-income': '$0',
        'state-local-tax-rate': '0%',
        'tips-income': '$0',
        'overtime-income': '$0',
        'car-loan-int': '$0',
        'ira-contrib': '$0',
        'real-estate-tax': '$0',
        'mortgage-int': '$0',
        'charitable-donations': '$0',
        'student-loan-int': '$0',
        'child-care-expense': '$0',
        'college-student-1': '$0',
        'college-student-2': '$0',
        'college-student-3': '$0',
        'college-student-4': '$0',
        'other-deductibles': '$0'
      },
      text: '<strong>Head of Household (Working Parent):</strong> This scenario represents unmarried individuals who pay for more than half the cost of keeping up a home for a qualifying dependent. They receive an elevated standard deduction ($24,150 for 2026) alongside child-related credit reductions.'
    },
    demo7: {
      inputs: {
        'file-status': 'single',
        'young-dep': 0,
        'other-dep': 0,
        'tax-year': '2026',
        'age': 35,
        'wages': '$0',
        'federal-withheld': '$0',
        'state-withheld': '$0',
        'local-withheld': '$0',
        'has-biz': 'yes',
        'business-income': '$150,000',
        'estimated-tax-paid': '$25,000',
        'medicare-wages': '$0',
        'ss-income': '$0',
        'interest-income': '$0',
        'ordinary-dividends': '$0',
        'qualified-dividends': '$0',
        'passive-incomes': '$0',
        'short-term-gains': '$0',
        'long-term-gains': '$0',
        'other-income': '$0',
        'state-local-tax-rate': '0%',
        'tips-income': '$0',
        'overtime-income': '$0',
        'car-loan-int': '$0',
        'ira-contrib': '$0',
        'real-estate-tax': '$0',
        'mortgage-int': '$0',
        'charitable-donations': '$0',
        'student-loan-int': '$0',
        'child-care-expense': '$0',
        'college-student-1': '$0',
        'college-student-2': '$0',
        'college-student-3': '$0',
        'college-student-4': '$0',
        'other-deductibles': '$0'
      },
      text: '<strong>Self-Employed Freelancer:</strong> This scenario showcases the dynamic business fields and Schedule SE calculations. For $150,000 of net business income, the calculator computes the 15.3% SE tax on 92.35% of earnings and automatically applies the 50% above-the-line deduction, offsetting liability with $25,000 in estimated tax payments.'
    }
  };

  const form = document.getElementById('tax-form');
  const resultTitle = document.querySelector('.results-title');
  const resultValue = document.getElementById('final-result');
  const currencyInputs = document.querySelectorAll('.currency-input');
  const bizRadios = document.querySelectorAll('input[name="has-biz"]');
  const bizFields = document.getElementById('biz-fields');

  // Toggle Biz Fields
  bizRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'yes') {
        bizFields.style.display = 'block';
      } else {
        bizFields.style.display = 'none';
      }
    });
  });

  currencyInputs.forEach(input => {
    if (input.classList.contains('college-input')) {
      attachCurrencyListeners(input);
      return;
    }
    input.addEventListener('focus', function() {
      if (this.value === '$0' || this.value === '0') {
        this.value = '';
      }
    });

    input.addEventListener('input', function() {
      let val = this.value.replace(/[^0-9]/g, '');
      if (val) {
        this.value = '$' + parseInt(val, 10).toLocaleString('en-US');
      } else {
        this.value = '';
      }
    });

    input.addEventListener('blur', function() {
      if (!this.value || this.value === '$') {
        this.value = '$0';
      }
    });
  });

  const percentInputs = document.querySelectorAll('.percent-input');
  percentInputs.forEach(input => {
    input.addEventListener('focus', function() {
      if (this.value === '0%' || this.value === '0') {
        this.value = '';
      }
    });

    input.addEventListener('input', function() {
      let val = this.value.replace(/[^0-9.]/g, '');
      // Prevent multiple decimals
      const parts = val.split('.');
      if (parts.length > 2) {
        val = parts[0] + '.' + parts.slice(1).join('');
      }
      
      if (val !== '') {
        this.value = val + '%';
      } else {
        this.value = '';
      }
    });

    input.addEventListener('blur', function() {
      if (!this.value || this.value === '%') {
        this.value = '0%';
      } else if (!this.value.endsWith('%')) {
        this.value = this.value + '%';
      }
    });
  });


  function parseCurrency(str) {
    if (!str) return 0;
    const val = parseFloat(str.replace(/[^0-9.-]+/g, ""));
    return isNaN(val) ? 0 : val;
  }

  function calculateTax() {
    const fileStatus = document.getElementById('file-status').value;
    const taxYear = document.querySelector('input[name="tax-year"]:checked').value;
    const age = parseInt(document.getElementById('age').value) || 0;
    
    // Standard deductions
    let standardDeduction = 0;
    if (taxYear === '2025') {
      if (fileStatus === 'single' || fileStatus === 'married-separate') standardDeduction = 15750;
      else if (fileStatus === 'head') standardDeduction = 23650;
      else standardDeduction = 31500;
    } else {
      if (fileStatus === 'single' || fileStatus === 'married-separate') standardDeduction = 16100;
      else if (fileStatus === 'head') standardDeduction = 24150;
      else standardDeduction = 32200;
    }
    
    if (age >= 65) {
      if (fileStatus === 'married-joint' || fileStatus === 'widow') {
        standardDeduction += 12000;
      } else {
        standardDeduction += 6000;
      }
    }
    
    // Parse Incomes
    const wages = parseCurrency(document.getElementById('wages').value);
    const ssIncome = parseCurrency(document.getElementById('ss-income').value);
    const interestIncome = parseCurrency(document.getElementById('interest-income').value);
    const ordinaryDividends = parseCurrency(document.getElementById('ordinary-dividends').value);
    const qualifiedDividends = parseCurrency(document.getElementById('qualified-dividends').value);
    const passiveIncomes = parseCurrency(document.getElementById('passive-incomes').value);
    const shortTermGains = parseCurrency(document.getElementById('short-term-gains').value);
    const longTermGains = parseCurrency(document.getElementById('long-term-gains').value);
    const otherIncome = parseCurrency(document.getElementById('other-income').value);
    const hasBiz = document.querySelector('input[name="has-biz"]:checked').value;
    const bizIncome = hasBiz === 'yes' ? parseCurrency(document.getElementById('business-income').value) : 0;
    
    // Parse Withholdings & Estimated
    const federalWithheld = parseCurrency(document.getElementById('federal-withheld').value);
    const stateWithheld = parseCurrency(document.getElementById('state-withheld').value);
    const localWithheld = parseCurrency(document.getElementById('local-withheld').value);
    const estimatedTaxPaid = hasBiz === 'yes' ? parseCurrency(document.getElementById('estimated-tax-paid').value) : 0;
    const totalPayments = federalWithheld + estimatedTaxPaid;
    
    // Parse Deductions
    const ira = parseCurrency(document.getElementById('ira-contrib').value);
    const realEstateTax = parseCurrency(document.getElementById('real-estate-tax').value);
    const mortgageInt = parseCurrency(document.getElementById('mortgage-int').value);
    const studentLoanInt = parseCurrency(document.getElementById('student-loan-int').value);
    const carLoanInt = parseCurrency(document.getElementById('car-loan-int').value);
    const charitableDonations = parseCurrency(document.getElementById('charitable-donations').value);
    const otherDeductibles = parseCurrency(document.getElementById('other-deductibles').value);
    const tipsIncome = parseCurrency(document.getElementById('tips-income').value);
    const overtimeIncome = parseCurrency(document.getElementById('overtime-income').value);
    
    // Dependents & Credits
    const youngDep = parseInt(document.getElementById('young-dep').value) || 0;
    const otherDep = parseInt(document.getElementById('other-dep').value) || 0;
    const childCareExpense = parseCurrency(document.getElementById('child-care-expense').value);

    
    // Self-Employment Tax Logic
    let seTax = 0;
    let seDeduction = 0;
    if (bizIncome > 0) {
      const netEarnings = bizIncome * 0.9235;
      seTax = netEarnings * 0.153;
      seDeduction = seTax * 0.5;
    }
    
    // OBBBA Deductions
    const tipsDeduction = Math.min(tipsIncome, 25000);
    const overtimeLimit = (fileStatus === 'married-joint') ? 25000 : 12500;
    const overtimeDeduction = Math.min(overtimeIncome, overtimeLimit);
    const obbbaTotal = tipsDeduction + overtimeDeduction;
    
    // Itemized Deductions
    const totalSalt = stateWithheld + localWithheld + realEstateTax;
    const saltCap = (taxYear === '2025') ? 40000 : 40400;
    const allowedSalt = Math.min(totalSalt, saltCap);
    
    const allowedCarLoan = Math.min(carLoanInt, 10000);
    const totalItemized = allowedSalt + mortgageInt + charitableDonations + allowedCarLoan + otherDeductibles + obbbaTotal;
    const finalDeduction = Math.max(standardDeduction, totalItemized);
    
    // Student Loan Interest Phase-out
    let allowedStudentLoanInt = Math.min(studentLoanInt, 2500);
    const magi = wages + bizIncome + ordinaryDividends + shortTermGains + otherIncome; 
    const slLimit = (fileStatus === 'married-joint') ? 200000 : 100000;
    const slPhaseOutStart = (fileStatus === 'married-joint') ? 170000 : 85000;
    
    if (magi >= slLimit) {
      allowedStudentLoanInt = 0;
    } else if (magi > slPhaseOutStart) {
      const reduction = (magi - slPhaseOutStart) / (slLimit - slPhaseOutStart);
      allowedStudentLoanInt = allowedStudentLoanInt * (1 - reduction);
    }
    
    // Ordinary Income
    let ordinaryIncome = wages + ssIncome + interestIncome + ordinaryDividends + passiveIncomes + shortTermGains + otherIncome + bizIncome;
    let taxableOrdinary = ordinaryIncome - finalDeduction - ira - allowedStudentLoanInt - seDeduction;
    if (taxableOrdinary < 0) taxableOrdinary = 0;
    
    // Progressive Tax Brackets (2025/2026 approximated closely)
    let taxOwed = 0;
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
    if (fileStatus === 'married-joint' || fileStatus === 'widow') brackets = bracketsJoint;
    else if (fileStatus === 'head') brackets = bracketsHead;
    
    let remaining = taxableOrdinary;
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
    
    // Capital Gains & Qualified Dividends Tax
    const prefIncome = longTermGains + qualifiedDividends;
    if (prefIncome > 0) {
      const limit0 = (fileStatus === 'married-joint') ? 96700 : 48350;
      const limit15 = (fileStatus === 'married-joint') ? 600050 : 553850;
      
      let prefTax = 0;
      // Calculate how much falls into each bucket, stacked on top of ordinary income
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
        stack += amtIn15;
      }
      
      if (remainingPref > 0) {
        prefTax += remainingPref * 0.20;
      }
      taxOwed += prefTax;
    }
    
    // Add SE Tax
    taxOwed += seTax;
    
    // Tax credits
    let childCredit = youngDep * 2200;
    let otherCredit = otherDep * 500;
    
    // Child Care Credit (up to $3000/person max $6000)
    let allowedChildCare = Math.min(childCareExpense, (youngDep + otherDep) * 3000);
    allowedChildCare = Math.min(allowedChildCare, 6000);
    let childCareCredit = allowedChildCare * 0.20; // Approx 20% credit
    
    let collegeCredit = 0;
    const collegeInputs = document.querySelectorAll('.college-input');
    collegeInputs.forEach(input => {
      const val = parseCurrency(input.value);
      collegeCredit += Math.min(val, 2500);
    });
    
    let totalCredits = childCredit + otherCredit + childCareCredit + collegeCredit;
    taxOwed -= totalCredits;
    if (taxOwed < 0) taxOwed = 0; 
    
    // Final Result
    const refundOrOwe = totalPayments - taxOwed;
    
    if (refundOrOwe >= 0) {
      resultTitle.textContent = "Estimated Tax Refund";
      resultValue.style.color = "#4CAF50"; 
      resultValue.textContent = '$' + refundOrOwe.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    } else {
      resultTitle.textContent = "Estimated Tax Owed";
      resultValue.style.color = "#dd0000"; 
      resultValue.textContent = '$' + Math.abs(refundOrOwe).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
  }

  const allInputs = document.querySelectorAll('.calc-input, select');
  allInputs.forEach(input => {
    input.addEventListener('input', calculateTax);
    if (input.tagName === 'SELECT') {
      input.addEventListener('change', calculateTax);
    }
  });

  const radioInputs = document.querySelectorAll('input[type="radio"]');
  radioInputs.forEach(input => {
    input.addEventListener('change', calculateTax);
  });


  // Dynamic College Education Fields
  const collegeContainer = document.getElementById('college-expenses-container');
  
  function attachCurrencyListeners(input) {
    input.addEventListener('focus', function() {
      if (this.value === '$0' || this.value === '0') {
        this.value = '';
      }
    });
    input.addEventListener('input', function() {
      let val = this.value.replace(/[^0-9]/g, '');
      if (val) {
        this.value = '$' + parseInt(val, 10).toLocaleString('en-US');
      } else {
        this.value = '';
      }
      
      // Auto-add next row if this is the last one and value > 0
      if (this.classList.contains('college-input')) {
        const row = this.closest('.college-student-row');
        const isLast = !row.nextElementSibling;
        const numVal = parseCurrency(this.value);
        if (isLast && numVal > 0) {
          addCollegeRow();
        }
      }
    });
    input.addEventListener('blur', function() {
      if (!this.value || this.value === '$') {
        this.value = '$0';
      }
    });
    input.addEventListener('input', calculateTax);
  }

  function addCollegeRow() {
    const rows = collegeContainer.querySelectorAll('.college-student-row');
    const newIndex = rows.length + 1;
    
    // Update previous row's buttons
    const lastRow = rows[rows.length - 1];
    lastRow.querySelector('.add-student-btn').style.display = 'none';
    lastRow.querySelector('.remove-student-btn').style.display = 'inline-flex';

    const newRow = document.createElement('div');
    newRow.className = 'input-row college-student-row';
    newRow.dataset.index = newIndex;
    newRow.innerHTML = `
      <div class="input-label"></div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" id="college-student-${newIndex}" class="input-field calc-input currency-input college-input" value="$0">
        <button type="button" class="btn btn-outline-primary btn-icon btn-sm add-student-btn"><i class="fas fa-plus"></i></button>
        <button type="button" class="btn btn-outline-danger btn-icon btn-sm remove-student-btn"><i class="fas fa-minus"></i></button>
      </div>
      <div class="input-note student-label-note">Student ${newIndex}</div>
    `;
    
    collegeContainer.appendChild(newRow);
    
    // Attach listeners
    const newInput = newRow.querySelector('.college-input');
    attachCurrencyListeners(newInput);
    
    // Attach button listeners
    newRow.querySelector('.add-student-btn').addEventListener('click', addCollegeRow);
    newRow.querySelector('.remove-student-btn').addEventListener('click', function() {
      newRow.remove();
      updateCollegeRows();
      calculateTax();
    });
  }

  function updateCollegeRows() {
    const rows = collegeContainer.querySelectorAll('.college-student-row');
    rows.forEach((row, idx) => {
      const index = idx + 1;
      row.dataset.index = index;
      row.querySelector('.student-label-note').textContent = `Student ${index}`;
      row.querySelector('.college-input').id = `college-student-${index}`;
      
      const addBtn = row.querySelector('.add-student-btn');
      const remBtn = row.querySelector('.remove-student-btn');
      
      if (index === 1) {
        row.querySelector('.input-label').textContent = 'College Education Expense';
        remBtn.style.display = 'none';
      } else {
        row.querySelector('.input-label').textContent = '';
        remBtn.style.display = 'inline-flex';
      }
      
      if (index === rows.length) {
        addBtn.style.display = 'inline-flex';
      } else {
        addBtn.style.display = 'none';
      }
    });
  }

  // Initialize first row buttons
  const firstRowAdd = collegeContainer.querySelector('.add-student-btn');
  if(firstRowAdd) firstRowAdd.addEventListener('click', addCollegeRow);

  const demoDropdown = document.getElementById('demo-scenarios');
  const scenarioPanel = document.getElementById('scenario-panel');
  const scenarioText = document.getElementById('scenario-text');

  if (demoDropdown) {
    demoDropdown.addEventListener('change', function() {
      const selectedScenario = scenarioData[this.value];
      
      if (!selectedScenario) {
        scenarioPanel.style.display = 'none';
        return;
      }

      Object.keys(selectedScenario.inputs).forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
          if (inputEl.type === 'radio') {
            const targetRadio = document.querySelector(`input[name="${inputEl.name}"][value="${selectedScenario.inputs[id]}"]`);
            if (targetRadio) {
              targetRadio.checked = true;
              targetRadio.dispatchEvent(new Event('change'));
            }
          } else {
            inputEl.value = selectedScenario.inputs[id];
          }
        }
      });

      scenarioText.innerHTML = selectedScenario.text;
      scenarioPanel.style.display = 'block';
      calculateTax();
    });
  }

  form.addEventListener('reset', function() {
    if (scenarioPanel) scenarioPanel.style.display = 'none';
    if (demoDropdown) demoDropdown.value = '';
    setTimeout(() => {
      document.querySelector('input[name="has-biz"][value="no"]').checked = true;
      bizFields.style.display = 'none';
      calculateTax();
    }, 10);
  });

  calculateTax();
})();
