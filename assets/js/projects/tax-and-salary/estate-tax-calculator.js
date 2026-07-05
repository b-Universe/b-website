(function () {
  // State Tax Configuration Object
  const stateTaxConfig = {
    'none': {
      exemption: Infinity,
      calculate: (grossEstate) => 0
    },
    'CT': {
      // Connecticut: Flat 12% on amounts over $15M (matching federal), capped at $15M tax
      exemption: 15000000,
      cap: 15000000,
      calculate: function (grossEstate) {
        if (grossEstate <= this.exemption) return 0;
        const excess = grossEstate - this.exemption;
        const baseTax = excess * 0.12;
        return Math.min(baseTax, this.cap);
      }
    },
    'MA': {
      // Massachusetts: progressive rates on amounts over $2M, shielded by a $99,600 credit
      exemption: 2000000,
      credit: 99600,
      brackets: [
        { upTo: 100000, rate: 0, baseTax: 0 },
        { upTo: 150000, rate: 0.008, baseTax: 0 },
        { upTo: 200000, rate: 0.016, baseTax: 400 },
        { upTo: 300000, rate: 0.024, baseTax: 1200 },
        { upTo: 500000, rate: 0.032, baseTax: 3600 },
        { upTo: 700000, rate: 0.040, baseTax: 10000 },
        { upTo: 900000, rate: 0.048, baseTax: 18000 },
        { upTo: 1100000, rate: 0.056, baseTax: 27600 },
        { upTo: 1600000, rate: 0.064, baseTax: 38800 },
        { upTo: 2100000, rate: 0.072, baseTax: 70800 },
        { upTo: 2600000, rate: 0.080, baseTax: 106800 },
        { upTo: 3100000, rate: 0.088, baseTax: 146800 },
        { upTo: 3600000, rate: 0.096, baseTax: 190800 },
        { upTo: 4100000, rate: 0.104, baseTax: 238800 },
        { upTo: 5100000, rate: 0.112, baseTax: 290800 },
        { upTo: 6100000, rate: 0.120, baseTax: 402800 },
        { upTo: 7100000, rate: 0.128, baseTax: 522800 },
        { upTo: 8100000, rate: 0.136, baseTax: 650800 },
        { upTo: 9100000, rate: 0.144, baseTax: 786800 },
        { upTo: 10100000, rate: 0.152, baseTax: 930800 },
        { upTo: Infinity, rate: 0.160, baseTax: 1082800 }
      ],
      calculate: function (grossEstate) {
        if (grossEstate <= this.exemption) return 0;
        let tax = 0;
        for (let i = 0; i < this.brackets.length; i++) {
          const bracket = this.brackets[i];
          const prevLimit = i === 0 ? 0 : this.brackets[i - 1].upTo;
          if (grossEstate > prevLimit) {
            if (grossEstate <= bracket.upTo) {
              const taxableInBracket = grossEstate - prevLimit;
              tax = bracket.baseTax + (taxableInBracket * bracket.rate);
              break;
            }
          }
        }
        return Math.max(0, tax - this.credit);
      }
    },
    'NY': {
      exemption: 7350000,
      cliffThreshold: 1.05,
      brackets: [
        { upTo: 500000, rate: 0.0306, baseTax: 0 },
        { upTo: 1000000, rate: 0.0504, baseTax: 15300 },
        { upTo: 1500000, rate: 0.0552, baseTax: 40500 },
        { upTo: 2100000, rate: 0.0648, baseTax: 68100 },
        { upTo: 2600000, rate: 0.0708, baseTax: 106980 },
        { upTo: 3100000, rate: 0.0768, baseTax: 142380 },
        { upTo: 3600000, rate: 0.0828, baseTax: 180780 },
        { upTo: 4100000, rate: 0.0888, baseTax: 222180 },
        { upTo: 5100000, rate: 0.0960, baseTax: 266580 },
        { upTo: 6100000, rate: 0.1040, baseTax: 362580 },
        { upTo: 7100000, rate: 0.1080, baseTax: 466580 },
        { upTo: 8100000, rate: 0.1160, baseTax: 620400 },
        { upTo: 9100000, rate: 0.1240, baseTax: 736400 },
        { upTo: 10100000, rate: 0.1320, baseTax: 860400 },
        { upTo: Infinity, rate: 0.1600, baseTax: 992400 }
      ],
      calculate: function (grossEstate) {
        if (grossEstate <= this.exemption) return 0;

        let taxableEstate = grossEstate;
        // The NY Cliff edge case: If gross estate is more than 5% over the exemption,
        // you lose the exemption entirely.
        if (grossEstate <= (this.exemption * this.cliffThreshold)) {
          // If within the 5% window, there's a phase-out.
          // For simplicity and showcasing the cliff logic, we'll apply a rapid phase-in.
          // The formula: (grossEstate - exemption) / (exemption * 0.05) * full_tax
          const phaseInFactor = (grossEstate - this.exemption) / (this.exemption * 0.05);

          let fullTax = 0;
          for (let i = 0; i < this.brackets.length; i++) {
            const bracket = this.brackets[i];
            const prevLimit = i === 0 ? 0 : this.brackets[i - 1].upTo;
            if (grossEstate > prevLimit && grossEstate <= bracket.upTo) {
              const taxableInBracket = grossEstate - prevLimit;
              fullTax = bracket.baseTax + (taxableInBracket * bracket.rate);
              break;
            }
          }
          return fullTax * phaseInFactor;
        }

        // Over 5% cliff: Apply tax to the ENTIRE estate value from dollar zero.
        let tax = 0;
        for (let i = 0; i < this.brackets.length; i++) {
          const bracket = this.brackets[i];
          const prevLimit = i === 0 ? 0 : this.brackets[i - 1].upTo;
          if (taxableEstate > prevLimit) {
            if (taxableEstate <= bracket.upTo) {
              const taxableInBracket = taxableEstate - prevLimit;
              tax = bracket.baseTax + (taxableInBracket * bracket.rate);
              break;
            }
          }
        }
        return tax;
      }
    }
  };

  const scenarioData = {
    demo1: {
      inputs: {
        'marital-status': 'married',
        'state-residence': 'none',
        'real-estate': '$4,000,000',
        'investments': '$20,000,000',
        'savings': '$1,000,000',
        'vehicles': '$500,000',
        'retirement': '$4,000,000',
        'life-insurance': '$2,000,000',
        'other-assets': '$500,000',
        'debts': '$1,000,000',
        'expenses': '$50,000',
        'charity': '$500,000',
        'spousal-transfer': '$15,000,000',
        'lifetime-gifts': '$1,000,000'
      },
      text: '<strong>High Net Worth (Married) - Shielded:</strong> This scenario demonstrates the power of the unlimited marital deduction and portability. Because the couple is married, they benefit from a combined $30M exemption. The $15M transferred to the surviving spouse is completely tax-free, and the remaining net estate easily falls under the massive federal threshold, resulting in $0 federal and state tax.'
    },
    demo2: {
      inputs: {
        'marital-status': 'single',
        'state-residence': 'NY',
        'real-estate': '$3,000,000',
        'investments': '$4,000,000',
        'savings': '$100,000',
        'vehicles': '$0',
        'retirement': '$0',
        'life-insurance': '$0',
        'other-assets': '$0',
        'debts': '$0',
        'expenses': '$0',
        'charity': '$0',
        'spousal-transfer': '$0',
        'lifetime-gifts': '$0'
      },
      text: '<strong>High Net Worth (Single NY) - Cliff Edge:</strong> With an estate of exactly $7.1M, this single individual in New York is just below the state exemption limit ($7.16M). They pay $0 in New York state estate tax and are well under the $15M federal exemption, resulting in no tax liability.'
    },
    demo3: {
      inputs: {
        'marital-status': 'single',
        'state-residence': 'NY',
        'real-estate': '$3,000,000',
        'investments': '$4,900,000',
        'savings': '$100,000',
        'vehicles': '$0',
        'retirement': '$0',
        'life-insurance': '$0',
        'other-assets': '$0',
        'debts': '$0',
        'expenses': '$0',
        'charity': '$0',
        'spousal-transfer': '$0',
        'lifetime-gifts': '$0'
      },
      text: '<strong>High Net Worth (Single NY) - Over Cliff ($8M):</strong> By adding $900k to investments, the estate hits $8M. This blows past the 5% threshold over the $7.16M NY exemption. Due to the infamous "NY Cliff," the exemption vanishes entirely, and NY applies its estate tax from dollar zero. Result? Over $530k in state taxes triggered by less than $1M of excess wealth.'
    },
    demo4: {
      inputs: {
        'marital-status': 'single',
        'state-residence': 'CT',
        'real-estate': '$200,000,000',
        'investments': '$0',
        'savings': '$0',
        'vehicles': '$0',
        'retirement': '$0',
        'life-insurance': '$0',
        'other-assets': '$0',
        'debts': '$0',
        'expenses': '$0',
        'charity': '$0',
        'spousal-transfer': '$0',
        'lifetime-gifts': '$0'
      },
      text: '<strong>The Connecticut Tax Cap:</strong> Connecticut has a flat 12% tax on the portion of the estate that exceeds the $15,000,000 exemption. However, Connecticut has a unique rule where the total state estate tax paid is capped and can never exceed $15,000,000. An estate of $200M will hit this cap, rather than paying the standard 12% rate.'
    },
    demo5: {
      inputs: {
        'marital-status': 'single',
        'state-residence': 'MA',
        'real-estate': '$0',
        'investments': '$0',
        'savings': '$4,000,000',
        'vehicles': '$0',
        'retirement': '$0',
        'life-insurance': '$0',
        'other-assets': '$0',
        'debts': '$0',
        'expenses': '$0',
        'charity': '$0',
        'spousal-transfer': '$0',
        'lifetime-gifts': '$0'
      },
      text: '<strong>Massachusetts Exemption Threshold:</strong> Massachusetts applies an estate tax to estates exceeding $2,000,000. It uses a progressive rate system offset by a $99,600 credit to effectively shelter the first $2,000,000 of assets. Changing this to $2,000,000 will result in $0 tax.'
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

  function getSum(ids) {
    return ids.reduce((total, id) => {
      const el = document.getElementById(id);
      return total + (el ? parseCurrency(el.value) : 0);
    }, 0);
  }

  function calculateAll() {
    const assetIds = ['real-estate', 'investments', 'savings', 'vehicles', 'retirement', 'life-insurance', 'other-assets'];
    const totalAssets = getSum(assetIds);

    const liabilityIds = ['debts', 'expenses', 'charity'];
    const liabilities = getSum(liabilityIds);

    const lifetimeGifts = parseCurrency(document.getElementById('lifetime-gifts').value);

    const baseExemption = 15000000;
    const isMarried = document.getElementById('marital-status').value === 'married';
    const totalExemption = isMarried ? baseExemption * 2 : baseExemption;

    const spousalTransferVal = parseCurrency(document.getElementById('spousal-transfer').value);
    const spousalTransfer = isMarried ? spousalTransferVal : 0;

    // Federal Logic
    const grossEstate = totalAssets + lifetimeGifts;
    const totalDeductions = liabilities + spousalTransfer;
    const netEstate = grossEstate - totalDeductions;

    const taxableAmount = Math.max(0, netEstate - totalExemption);
    const federalTax = taxableAmount * 0.40;

    // State Logic
    const state = document.getElementById('state-residence').value;
    const stateTaxObj = stateTaxConfig[state];

    // For state estate tax, some states include gifts, some do not. 
    // NY adds back gifts made within 3 years of death. We\'ll use grossEstate for simplicity in this demo.
    const stateTaxableEstate = grossEstate - totalDeductions; // States often allow standard liabilities and spousal deductions.
    const stateTax = stateTaxObj ? stateTaxObj.calculate(stateTaxableEstate) : 0;

    const totalTax = federalTax + stateTax;

    document.getElementById('res-federal').innerText = formatCurrency(federalTax);
    document.getElementById('res-state').innerText = formatCurrency(stateTax);
    document.getElementById('res-total').innerText = formatCurrency(totalTax);
  }

  function loadDemo(key) {
    const data = scenarioData[key];
    if (!data) return;

    for (let k in data.inputs) {
      const el = document.getElementById(k);
      if (el) {
        el.value = data.inputs[k];
      }
    }

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

  const otherInputs = document.querySelectorAll('select');
  otherInputs.forEach(input => {
    input.addEventListener('change', calculateAll);
  });

  const demoSelect = document.getElementById('demo-scenarios');
  if (demoSelect) {
    demoSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        loadDemo(e.target.value);
      } else {
        document.getElementById('estate-tax-form').reset();
        document.getElementById('scenario-panel').style.display = 'none';
        calculateAll();
      }
    });
  }

  const resetBtn = document.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent native reset if inside form, we handle it manually
      document.getElementById('estate-tax-form').reset();
      setTimeout(() => {
        if (demoSelect) demoSelect.value = '';
        document.getElementById('scenario-panel').style.display = 'none';
        calculateAll();
      }, 10);
    });
  }

  calculateAll();
})();
