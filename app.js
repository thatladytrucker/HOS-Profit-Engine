const $ = (id) => document.getElementById(id);
const digitalGoodsService = typeof window.getDigitalGoodsService === "function"
  ? window.getDigitalGoodsService
  : null;

const USER_TIER = localStorage.getItem('hosProfitUserTier') || 'FREE';

function isPro(){
  return USER_TIER === 'PRO';
}

document.querySelectorAll('.pro-only').forEach(el => {
  el.classList.toggle('hidden', !isPro());
});

function openTripPlanner() {
  const planner = document.getElementById("tripPlanner");
  if (!planner) return;

  planner.classList.remove("hidden");
  planner.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleUpgradeToPro() {
  const panel = $("proUpgradePanel");
  if (!panel) return;

  panel.classList.remove("hidden");
}

const upgradeProBtn = $("upgradeProBtn");

if (upgradeProBtn) {
  upgradeProBtn.classList.toggle("hidden", isPro());
  upgradeProBtn.addEventListener("click", handleUpgradeToPro);
}
$("closeProUpgradeBtn")?.addEventListener("click", function() {
  $("proUpgradePanel")?.classList.add("hidden");
});

$("purchaseProBtn")?.addEventListener("click", async function() {
  console.log("PRO purchase button clicked");
});

function updateFreeLoadCheck() {
  const loaded = parseFloat($("freeLoadedMiles")?.value) || 0;
  const deadhead = parseFloat($("freeDeadheadMiles")?.value) || 0;
  const brokerPay = parseFloat($("freeBrokerPay")?.value) || 0;

  const decision = $("freeDecision");
  const decisionText = $("freeDecisionText");
  const decisionSubtext = $("freeDecisionSubtext");

  if (!decision || !decisionText || !decisionSubtext) return;

  if (loaded <= 0 || deadhead < 0 || brokerPay <= 0) {
    decisionText.textContent = "ENTER LOAD DATA";
    decisionSubtext.textContent =
      "Enter loaded miles, deadhead miles, and broker pay.";
    return;
  }

  const totalMiles = loaded + deadhead;
  const ratePerMile = brokerPay / totalMiles;

  if (ratePerMile >= 2.00) {
    decisionText.textContent = "TAKE THIS LOAD";
    decisionSubtext.textContent = "This load meets the FREE load threshold.";
  } else if (ratePerMile >= 1.50) {
    decisionText.textContent = "NEGOTIATE BEFORE ACCEPTING";
    decisionSubtext.textContent = "This load may need a better rate.";
  } else {
    decisionText.textContent = "DON'T TAKE THIS LOAD";
    decisionSubtext.textContent = "This load is below the FREE load threshold.";
  }
}

    const defaults = {
      insurance: 1400,
      lease: 2500,
      otherFixed: 300,
      fuelPrice: 4.50,
      mpg: 6.5,
      targetProfit: 250,
      tarpFee: 150,
      iftaNormal: 0.06,
      iftaHigh: 0.12,
      maintenanceRate: 0.15,
      safeHavenMiles: 50,
      workDaysPerWeek: 5
    };

    let state = {
  ...defaults,
  tarp: false,
  dispatch: false,
  highTax: false,
  safeHaven: true,
  currentProfit: 0,
  breakEven: 0,
  profitGoalAsk: 0,
  weeklyProgress: parseFloat(localStorage.getItem('hosProfitWeeklyProgress') || '0'),
  weeklyRepairEscrow: parseFloat(localStorage.getItem('hosProfitWeeklyRepairEscrow') || '0'),
  weeklyTaxReserve: parseFloat(localStorage.getItem('hosProfitWeeklyTaxReserve') || '0')
};

    function money(n){ return '$' + (Number(n) || 0).toFixed(2); }
    function num(id){ return parseFloat($(id).value) || 0; }

    function weeklyNut(){
      return (state.insurance + state.lease + state.otherFixed) / 4.3;
    }

    function dailyNut(){
      return weeklyNut() / state.workDaysPerWeek;
    }

    function loadVault(){
      ['insurance','lease','otherFixed','fuelPrice','mpg','targetProfit'].forEach(key => {
        const saved = localStorage.getItem('hosProfit_' + key);
        state[key] = saved === null ? defaults[key] : parseFloat(saved);
        $(key).value = state[key];
      });
      updateVaultReadouts();
    }

function saveVaultFromInputsNoLoop(){
      ['insurance','lease','otherFixed','fuelPrice','mpg','targetProfit'].forEach(key => {
        state[key] = num(key);
        localStorage.setItem('hosProfit_' + key, state[key]);
      });
      updateVaultReadouts();
    }
    function updateReserveReadouts(){
  const repairBox = document.getElementById('weeklyRepairEscrowRead');
  const taxBox = document.getElementById('weeklyTaxReserveRead');

  if(repairBox){
    repairBox.innerText = money(state.weeklyRepairEscrow || 0);
  }

  if(taxBox){
    taxBox.innerText = money(state.weeklyTaxReserve || 0);
  }
}
    function updateVaultReadouts(){
  if ($('weeklyNutTop')) {
    $('weeklyNutTop').innerText = money(weeklyNut());
  }
}

function tripPlannerDwell(code) {
  return {
    DROP30: 30,
    DROP60: 60,
    LIVE60: 60,
    LIVE120: 120,
    BACKHAUL90: 90
  }[code] ?? 0;
}

function tripPlannerDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function calculateTripPlanner() {
  const tripStart = tripPlannerDate($('tripPlannerStart')?.value);

  const deadhead = parseFloat($('tripPlannerDeadhead')?.value) || 0;
  const loaded = parseFloat($('tripPlannerLoaded')?.value) || 0;
  const totalMiles = deadhead + loaded;

  if ($('tripPlannerTotal')) {
    $('tripPlannerTotal').value = totalMiles.toFixed(0);
  }

  const mph = Math.max(
    50,
    Math.min(75, parseFloat($('tripPlannerMph')?.value) || 60)
  );

  const shipAppt = tripPlannerDate($('tripPlannerShipperAppt')?.value);
  const finalAppt = tripPlannerDate($('tripPlannerFinalAppt')?.value);

  const shipStop = $('tripPlannerShipperStop')?.value || 'LIVE60';
  const finalStop = $('tripPlannerFinalStop')?.value || 'LIVE60';

  const results = $('tripPlannerResults');

  if (!tripStart || totalMiles <= 0) {
    if (results) results.classList.add('hidden');
    return;
  }

  function driveWithSafety(startTime, miles) {
    let current = new Date(startTime.getTime());
    let remainingMiles = Math.max(0, miles);
    let drivingToday = 0;
    let breakTaken = false;
    let breakTime = null;
    let resetCount = 0;

    while (remainingMiles > 0) {
      const remainingDrivingCapacity = 9 - drivingToday;

      if (!breakTaken && drivingToday >= 4) {
        current = new Date(
          current.getTime() + 30 * 60 * 1000
        );

        breakTaken = true;
        breakTime = new Date(current.getTime());
        continue;
      }

      const milesUntilFourHours =
        Math.max(0, (4 - drivingToday) * mph);

      if (
        !breakTaken &&
        milesUntilFourHours > 0 &&
        remainingMiles > milesUntilFourHours
      ) {
        const driveHours = milesUntilFourHours / mph;

        current = new Date(
          current.getTime() +
          driveHours * 60 * 60 * 1000
        );

        drivingToday += driveHours;
        remainingMiles -= milesUntilFourHours;
        continue;
      }

      const milesUntilNineHours =
        remainingDrivingCapacity * mph;

      if (remainingMiles <= milesUntilNineHours) {
        const driveHours = remainingMiles / mph;

        current = new Date(
          current.getTime() +
          driveHours * 60 * 60 * 1000
        );

        drivingToday += driveHours;
        remainingMiles = 0;
        break;
      }

      current = new Date(
        current.getTime() +
        remainingDrivingCapacity * 60 * 60 * 1000
      );

      remainingMiles -= milesUntilNineHours;
      drivingToday = 9;

      current = new Date(
        current.getTime() + 12 * 60 * 60 * 1000
      );

      resetCount++;

      drivingToday = 0;
      breakTaken = false;
      breakTime = null;
    }

    return {
      time: current,
      resetCount,
      breakTime
    };
  }

  const shipResult = driveWithSafety(tripStart, deadhead);
  const etaShipper = shipResult.time;

  const ptaShipper = new Date(
    etaShipper.getTime() +
    tripPlannerDwell(shipStop) * 60 * 1000
  );

  const finalResult = driveWithSafety(ptaShipper, loaded);
  const etaFinal = finalResult.time;

  const ptaFinal = new Date(
    etaFinal.getTime() +
    tripPlannerDwell(finalStop) * 60 * 1000
  );

  const formatDate = date =>
    date.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

  if ($('tripPlannerEtaShipper')) {
    $('tripPlannerEtaShipper').textContent =
      formatDate(etaShipper);
  }

  if ($('tripPlannerPtaShipper')) {
    $('tripPlannerPtaShipper').textContent =
      formatDate(ptaShipper);
  }

  if ($('tripPlannerEtaFinal')) {
    $('tripPlannerEtaFinal').textContent =
      formatDate(etaFinal);
  }

  if ($('tripPlannerPtaFinal')) {
    $('tripPlannerPtaFinal').textContent =
      formatDate(ptaFinal);
  }

  if ($('tripPlannerEtaShipperExplain')) {
  const status = $('tripPlannerEtaShipperExplain');

  status.classList.remove(
  'text-emerald-300',
  'text-yellow-300',
  'text-red-300',
  'bg-emerald-500/20',
  'bg-yellow-500/20',
  'bg-red-500/20',
  'border-emerald-400/40',
  'border-yellow-400/40',
  'border-red-400/40'
);

status.classList.add(
  'inline-block',
  'rounded-full',
  'px-3',
  'py-1',
  'font-black',
  'text-xs',
  'uppercase',
  'tracking-wider',
  'border'
);

  if (shipAppt) {
    const shipDiff = Math.round(
      (shipAppt - etaShipper) / 60000
    );

    if (shipDiff < 0) {
      status.textContent = 'LATE';
      status.classList.add(
  'text-red-300',
  'bg-red-500/20',
  'border-red-400/40'
);
    } else if (shipDiff > 60) {
      status.textContent = 'TOO EARLY';
      status.classList.add(
  'text-yellow-300',
  'bg-yellow-500/20',
  'border-yellow-400/40'
);
    } else {
      status.textContent = 'ON TIME';
      status.classList.add(
  'text-emerald-300',
  'bg-emerald-500/20',
  'border-emerald-400/40'
);
    }
  } else {
    status.textContent = '';
  }
}

  if ($('tripPlannerEtaFinalExplain')) {
  const status = $('tripPlannerEtaFinalExplain');

  status.classList.remove(
  'text-emerald-300',
  'text-yellow-300',
  'text-red-300',
  'bg-emerald-500/20',
  'bg-yellow-500/20',
  'bg-red-500/20',
  'border-emerald-400/40',
  'border-yellow-400/40',
  'border-red-400/40'
);

status.classList.add(
  'inline-block',
  'rounded-full',
  'px-3',
  'py-1',
  'font-black',
  'text-xs',
  'uppercase',
  'tracking-wider',
  'border'
);

  if (finalAppt) {
    const finalDiff = Math.round(
      (finalAppt - etaFinal) / 60000
    );

    if (finalDiff < 0) {
      status.textContent = 'LATE';
      status.classList.add(
  'text-red-300',
  'bg-red-500/20',
  'border-red-400/40'
);
    } else if (finalDiff > 60) {
      status.textContent = 'TOO EARLY';
      status.classList.add(
  'text-yellow-300',
  'bg-yellow-500/20',
  'border-yellow-400/40'
);
    } else {
      status.textContent = 'ON TIME';
      status.classList.add(
  'text-emerald-300',
  'bg-emerald-500/20',
  'border-emerald-400/40'
);
    }
  } else {
    status.textContent = '';
  }
}

  if (results) {
    results.classList.remove('hidden');
  }
}
    function calculate(){
      saveVaultFromInputsNoLoop();

      const loaded = num('loadedMiles');
      const deadhead = num('deadheadMiles');
      const gross = num('grossPay');
      const enteredMiles = loaded + deadhead;
      const safeMiles = enteredMiles + (state.safeHaven && enteredMiles > 0 ? state.safeHavenMiles : 0);
      const rpm = enteredMiles > 0 ? gross / enteredMiles : 0;

      const fuelCost = state.mpg > 0 ? (safeMiles / state.mpg) * state.fuelPrice : 0;
      const iftaRate = state.highTax ? state.iftaHigh : state.iftaNormal;
      const iftaReserve = safeMiles * iftaRate;
      const maintenance = safeMiles * state.maintenanceRate;
      const dispatchFee = state.dispatch ? gross * 0.10 : 0;
      const tarpCost = state.tarp ? state.tarpFee : 0;
      const fixedDay = enteredMiles > 0 ? dailyNut() : 0;

      const totalCosts = fuelCost + iftaReserve + maintenance + dispatchFee + tarpCost + fixedDay;
      const driverCpm = enteredMiles > 0 ? totalCosts / enteredMiles : 0;

      state.currentProfit = gross - totalCosts;
      state.breakEven = totalCosts;
      state.profitGoalAsk = totalCosts + state.targetProfit;

      $('totalMilesRead').innerText = enteredMiles.toFixed(0);
      $('safeMilesRead').innerText = safeMiles.toFixed(0);
      $('rpmRead').innerText = money(rpm);
      $('netRead').innerText = money(state.currentProfit);
      $('breakEvenRead').innerText = money(state.breakEven);
      $('profitGoalRead').innerText = money(state.profitGoalAsk);
      $('fuelCostRead').innerText = money(fuelCost);
      $('iftaRead').innerText = money(iftaReserve);
      $('maintRead').innerText = money(maintenance);
      $('driverCpmRead').innerText = money(driverCpm);
      $('extraCostRead').innerText = money(dispatchFee + tarpCost + fixedDay);

      updateDecision(gross, enteredMiles);
      updateMomentum();
    }

    function saveVaultFromInputsNoLoop(){
      ['insurance','lease','otherFixed','fuelPrice','mpg','targetProfit'].forEach(key => {
        const value = num(key);
        state[key] = value;
        localStorage.setItem('hosProfit_' + key, value);
      });
      updateVaultReadouts();
    }

    function updateDecision(gross, enteredMiles){
      const light = $('trafficLight');
      const decision = $('decisionText');
      const sub = $('decisionSubtext');
      const neg = $('negAssistant');
      const status = $('loadStatusRead');
      const settlementBtn = $('settlementReviewBtn');
      if(gross <= 0 || enteredMiles <= 0){
        light.className = 'mx-auto w-28 h-28 rounded-full bg-slate-700 border-4 border-slate-500 shadow-xl transition-all duration-300';
        decision.innerText = 'Enter Load Data';
        decision.className = 'text-4xl font-black italic tracking-tight text-white';
        sub.innerText = 'Enter miles and broker pay to check the load.';
        neg.classList.add('hidden');
        settlementBtn.classList.add('hidden');
        status.innerText = 'Waiting';
        return;
      }

      if(state.currentProfit >= state.targetProfit){
        light.className = 'mx-auto w-28 h-28 rounded-full bg-emerald-500 border-4 border-emerald-300 shadow-[0_0_35px_rgba(16,185,129,.65)] transition-all duration-300';
        decision.innerText = '+' + money(state.currentProfit) + ' PROFIT';
        decision.className = 'text-4xl font-black italic tracking-tight text-emerald-300';
        sub.innerText = 'Green light: this load clears costs and reaches your target profit.';
        neg.classList.add('hidden');
        settlementBtn.classList.remove('hidden');
        status.innerText = 'GREEN';
      } else if(state.currentProfit >= 0){
        light.className = 'mx-auto w-28 h-28 rounded-full bg-yellow-400 border-4 border-yellow-200 shadow-[0_0_35px_rgba(234,179,8,.55)] transition-all duration-300';
        decision.innerText = '+' + money(state.currentProfit) + ' THIN PROFIT';
        decision.className = 'text-4xl font-black italic tracking-tight text-yellow-300';
        sub.innerText = 'Yellow light: it covers costs, but does not hit the profit goal.';
        $('counterOffer').innerText = 'To hit your profit goal, ask for at least ' + money(state.profitGoalAsk) + '.';
        neg.classList.remove('hidden');
        settlementBtn.classList.remove('hidden');
        status.innerText = 'YELLOW';
      } else {
        light.className = 'mx-auto w-28 h-28 rounded-full bg-red-600 border-4 border-red-400 shadow-[0_0_35px_rgba(239,68,68,.65)] transition-all duration-300';
        decision.innerText = '-' + money(Math.abs(state.currentProfit)) + ' LOSS';
        decision.className = 'text-4xl font-black italic tracking-tight text-red-400';
        sub.innerText = 'Red light: this rate does not cover the calculated cost stack.';
        $('counterOffer').innerText = 'To break even, ask for at least ' + money(state.breakEven) + '. To hit the profit goal, ask for ' + money(state.profitGoalAsk) + '.';
        neg.classList.remove('hidden');
        settlementBtn.classList.add('hidden');
        status.innerText = 'RED';
      }
    }

    function updateMomentum(){
      const nut = weeklyNut();
      const pct = nut > 0 ? (state.weeklyProgress / nut) * 100 : 0;
      $('momentumBar').style.width = Math.min(Math.max(pct,0),100) + '%';

      if(pct >= 100){
        $('momentumBar').className = 'h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_20px_#10b981]';
        $('momentumText').innerText = 'PROFIT ZONE: weekly fixed costs are covered.';
      } else {
        $('momentumBar').className = 'h-full bg-orange-500 transition-all duration-500';
        $('momentumText').innerText = money(nut - state.weeklyProgress) + ' to cover The Nut';
      }
    }

    function toggleOption(type){
      state[type] = !state[type];
      const map = {
        tarp:'tarpToggle',
        dispatch:'dispatchToggle',
        highTax:'highTaxToggle',
        safeHaven:'safeHavenToggle'
      };
      $(map[type]).classList.toggle('active', state[type]);
      calculate();
    }

    function toggleVault(){
      const drawer = $('vaultDrawer');
      drawer.classList.toggle('open');
      $('vaultBtn').innerText = drawer.classList.contains('open') ? 'Close' : 'Edit';
    }

    function toggleStrategy(){
      const drawer = $('strategyDrawer');
      drawer.classList.toggle('open');
      $('strategyArrow').innerText = drawer.classList.contains('open') ? '–' : '+';
    }
function openSettlementReview(){
  const get = (id) => document.getElementById(id);

  const readNumber = (...ids) => {
    for (const id of ids) {
      const el = get(id);
      if (!el) continue;

      const raw = el.value !== undefined ? el.value : el.innerText;
      const cleaned = String(raw || '').replace(/[^0-9.-]/g, '');
      const value = parseFloat(cleaned);

      if (isFinite(value)) return value;
    }
    return 0;
  };

  const writeMoney = (id, value, isDeduction = false) => {
    const el = get(id);
    if (!el) return;

    el.innerText = isDeduction ? '-' + money(Math.abs(value)) : money(value);
  };

  const gross = readNumber('grossPay', 'loadPay', 'brokerPay', 'ratePay', 'pay');
  const loaded = readNumber('loadedMiles', 'loaded');
  const deadhead = readNumber('deadheadMiles', 'deadhead');
  const totalMiles = readNumber('totalMiles', 'total') || loaded + deadhead;

  const fuelCost = readNumber('fuelCostRead', 'fuelRead', 'estimatedFuelCostRead');
  const leaseMonthly =
  (typeof state !== 'undefined' && state.lease !== undefined)
    ? Number(state.lease)
    : readNumber('vaultLeaseRead', 'truckMonthly', 'truckCost', 'leaseCost', 'truck');

const insuranceMonthly =
  (typeof state !== 'undefined' && state.insurance !== undefined)
    ? Number(state.insurance)
    : readNumber('vaultInsuranceRead', 'insuranceMonthly', 'insuranceCost', 'insurance');

const otherMonthly =
  (typeof state !== 'undefined' && state.otherFixed !== undefined)
    ? Number(state.otherFixed)
    : readNumber('vaultOtherRead', 'otherMonthly', 'otherCost', 'other');

const leaseCost = leaseMonthly / 4;
const insuranceCost = (insuranceMonthly + otherMonthly) / 4;

  const repairEscrow = totalMiles * 0.15;

  const taxableBeforeTax = gross - fuelCost - leaseCost - insuranceCost - repairEscrow;
  const taxReserve = Math.max(0, taxableBeforeTax * 0.25);

  const netPay = gross - fuelCost - leaseCost - insuranceCost - repairEscrow - taxReserve;

  writeMoney('settleGrossPay', gross);
  writeMoney('settleFuelCost', fuelCost, true);
  writeMoney('settleLeaseCost', leaseCost, true);
  writeMoney('settleInsuranceCost', insuranceCost, true);
  writeMoney('settleRepairEscrow', repairEscrow, true);
  writeMoney('settleTaxReserve', taxReserve, true);
  writeMoney('settleNetPay', netPay);

  get('settlementOverlay').classList.remove('hidden');
}

function closeSettlementReview(){
  $('settlementOverlay').classList.add('hidden');
}
    function saveLoad(){
  try {
    const get = (id) => document.getElementById(id);

    const readNumber = (id) => {
      const el = get(id);
      if(!el) return 0;

      const raw = el.value !== undefined ? el.value : el.innerText;
      const cleaned = String(raw || '').replace(/[^0-9.-]/g, '');
      const value = parseFloat(cleaned);

      return isFinite(value) ? value : 0;
    };

    const gross = readNumber('grossPay');
    const loaded = readNumber('loadedMiles');
    const deadhead = readNumber('deadheadMiles');
    const miles = loaded + deadhead;

    if(gross <= 0 || miles <= 0){
      alert('Enter loaded/deadhead miles and broker pay before saving.');
      return;
    }

    if(state.currentProfit <= 0){
      alert('This load is not profitable yet. Use the negotiation number before saving.');
      return;
    }

    const fuelCost = readNumber('fuelCostRead');
    const repairEscrow = miles * 0.15;

    const leaseCost = Number(state.lease || 0) / 4;
    const insuranceCost = (Number(state.insurance || 0) + Number(state.otherFixed || 0)) / 4;

    const taxableBeforeTax = gross - fuelCost - leaseCost - insuranceCost - repairEscrow;
    const taxReserve = Math.max(0, taxableBeforeTax * 0.25);

    state.weeklyProgress = Number(state.weeklyProgress || 0);
    state.weeklyRepairEscrow = Number(state.weeklyRepairEscrow || 0);
    state.weeklyTaxReserve = Number(state.weeklyTaxReserve || 0);

    state.weeklyProgress += state.currentProfit;
    state.weeklyRepairEscrow += repairEscrow;
    state.weeklyTaxReserve += taxReserve;

    localStorage.setItem('hosProfitWeeklyProgress', state.weeklyProgress);
    localStorage.setItem('hosProfitWeeklyRepairEscrow', state.weeklyRepairEscrow);
    localStorage.setItem('hosProfitWeeklyTaxReserve', state.weeklyTaxReserve);

    updateMomentum();
    updateReserveReadouts();

    alert(
      'Saved Win.\n\n' +
      'Repair Escrow Added: ' + money(repairEscrow) + '\n' +
      'Tax Reserve Added: ' + money(taxReserve)
    );

  } catch (error) {
    alert('Save Win error: ' + error.message);
  }
}



    function resetLoadOnly(){
      ['loadedMiles','deadheadMiles','grossPay'].forEach(id => $(id).value = '');
      state.currentProfit = 0;
      calculate();
      window.scrollTo({top:0, behavior:'smooth'});
    }

    function resetWeek(){
  if(confirm('Reset weekly totals to $0? Your Business Profile numbers will stay saved.')){
    state.weeklyProgress = 0;
    state.weeklyRepairEscrow = 0;
    state.weeklyTaxReserve = 0;

    localStorage.setItem('hosProfitWeeklyProgress', '0');
    localStorage.setItem('hosProfitWeeklyRepairEscrow', '0');
    localStorage.setItem('hosProfitWeeklyTaxReserve', '0');

    updateMomentum();
    updateReserveReadouts();

    alert('Weekly totals reset. Your Business Profile numbers were kept.');
  }
}

    function copyScript(){
      const ask = state.currentProfit < 0 ? state.profitGoalAsk : state.profitGoalAsk;
      const text = 'I need to be at ' + money(ask) + ' on this lane to cover current overhead, fuel, IFTA reserve, maintenance, and safe-haven miles. Can we make that work?';
      navigator.clipboard.writeText(text).then(() => alert('Negotiation script copied.'));
    }

    function openHosClock(){
      alert('HOS Clock button is reserved for your next screen/link. We can connect it to your HOS calculator later.');
    }

    document.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', calculate);
  input.addEventListener('change', calculate);
});

$("freeLoadedMiles")?.addEventListener("input", updateFreeLoadCheck);
$("freeDeadheadMiles")?.addEventListener("input", updateFreeLoadCheck);
$("freeBrokerPay")?.addEventListener("input", updateFreeLoadCheck);

// TRIP PLANNER CONTROLS
$("tripPlannerDeadhead")?.addEventListener("input", calculateTripPlanner);
$("tripPlannerLoaded")?.addEventListener("input", calculateTripPlanner);

$("tripPlannerMph")?.addEventListener("input", function() {
  const value = $("tripPlannerMph")?.value || 60;
  if ($("tripPlannerMphVal")) {
    $("tripPlannerMphVal").textContent = value;
  }
});

$("tripPlannerCalc")?.addEventListener("click", calculateTripPlanner);

$("tripPlannerReset")?.addEventListener("click", function() {
  $("tripPlannerDeadhead").value = "";
  $("tripPlannerLoaded").value = "";
  $("tripPlannerTotal").value = "";
  $("tripPlannerResults")?.classList.add("hidden");

  if ($("tripPlannerMph")) {
    $("tripPlannerMph").value = 60;
  }

  if ($("tripPlannerMphVal")) {
    $("tripPlannerMphVal").textContent = "60";
  }
});

loadVault();
calculate();
