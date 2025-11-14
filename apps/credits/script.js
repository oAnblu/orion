const rtrElements = document.querySelectorAll('.rtr');
const rtrsvg = document.querySelector('#rtrsvg');

rtrElements.forEach(element => {
    const clone = rtrsvg.cloneNode(true);
    element.appendChild(clone);
});

var payment_screen = document.getElementById("paymentscreen");
var payment_screen_un = document.getElementById("sendmoneyusrchip");
var target_un_inp = document.getElementById("usersearchbar");
var payment_screen_amt = document.getElementById("sendmoneyvalue");
var payment_screen_note = document.getElementById("sendmoneynote");

function recalculatepaycheck() {
    let element = document.getElementById("totalpaymentfr");
    element.innerText = parseFloat(payment_screen_amt.value) + 1;
}
(async () => {
  const rawData = await window.parent.roturExtension.getTransactions();
const currentBalance = await window.parent.roturExtension.getBalance();

document.getElementById("accbaldisp").innerText = currentBalance;

const transactions = JSON.parse(rawData);
let totalGain = 0;
let totalLoss = 0;

// Sort oldest first to calculate balances
transactions.sort((a, b) => {
    const ta = a.time ? new Date(a.time) : 0;
    const tb = b.time ? new Date(b.time) : 0;
    return ta - tb;
});

const dataPoints = [];
let runningBalance = currentBalance;

// Compute balances backward from currentBalance
for (let i = transactions.length - 1; i >= 0; i--) {
    const t = transactions[i];
    let time = '';
    let user = '';
    let amount = 0;
    let note = '';

    if (typeof t === 'string') {
        const m = t.match(/([-+]?\d*\.?\d+)/);
        if (m) {
            amount = parseFloat(m[0]);
            note = t.replace(m[0], '').trim();
            if (amount > 0) totalGain += amount;
            else totalLoss += Math.abs(amount);
            runningBalance -= amount;
            dataPoints.unshift({ time: '', user: 'unknown', amount, note, balance: runningBalance });
        }
    } else if (typeof t === 'object' && t) {
        amount = t.amount || 0;
        const type = t.type;
        const signed = type === 'out' ? -amount : amount;
        time = t.time ? new Date(t.time).toLocaleString() : '';
        user = t.user || 'unknown';
        note = t.note || '';
        if (type === 'in') totalGain += amount;
        else if (type === 'out') totalLoss += amount;
        runningBalance -= signed;
        dataPoints.unshift({ time, user, amount: signed, note, balance: runningBalance });
    }
}

// Table: newest first
const table = document.createElement('table');
const header = document.createElement('tr');
['Time', 'User', 'Amount', 'Reason', 'Balance'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    header.appendChild(th);
});
table.appendChild(header);

[...dataPoints].sort((a, b) => {
    const ta = a.time ? new Date(a.time) : 0;
    const tb = b.time ? new Date(b.time) : 0;
    return tb - ta;
}).forEach(r => {
    const tr = document.createElement('tr');
    [r.time, r.user, r.amount, r.note, r.balance].forEach(v => {
        const td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
    });
    table.appendChild(tr);
});

const container = document.querySelector('#transactionList');
container.innerHTML = '';
container.appendChild(table);

// Graph: oldest → newest left → right
const ctx = document.getElementById('transactionChart').getContext('2d');
const graphLabels = dataPoints.map(d => `${d.user}: ${d.amount}`);
const graphData = dataPoints.map(d => d.balance);

new Chart(ctx, {
    type: 'line',
    data: {
        labels: graphLabels,
        datasets: [{
            label: 'Balance Over Time',
            data: graphData,
            borderColor: "white",
            backgroundColor: window.parent.accent,
            tension: 0.2,
            fill: true
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Transaction' }, ticks: { maxRotation: 90, minRotation: 45 } },
            y: { title: { display: true, text: 'Balance' } }
        }
    }
});

    const gainLossDisplay = document.getElementById('accgainlossdisp');
    const gainLossIcon = document.getElementById('gainorloss');

    gainLossDisplay.textContent = `${totalGain} / ${totalLoss}`;

    if (totalGain >= totalLoss) {
        gainLossIcon.textContent = 'arrow_upward';
        gainLossIcon.style.backgroundColor = 'rgb(81, 165, 81)';
    } else {
        gainLossIcon.textContent = 'arrow_downward';
        gainLossIcon.style.backgroundColor = 'rgb(165, 81, 81)';
    }


    document.getElementById("pfponnav").src = "https://avatars.rotur.dev/" + window.parent.roturExtension.user.username;
})();
async function makepayment() {
    loader.start();
    let doesexists = await fetch(`https://social.rotur.dev/profile?name=${target_un_inp.value}&limit=1`);
    doesexists = await doesexists.text();
    loader.stop();
    if (JSON.parse(doesexists)?.error) {
        window.parent.toast("There's no such user");
        return;
    }
    payment_screen.style.display = "flex";
    payment_screen_un.innerText = target_un_inp.value;
    payment_screen_amt.value = '';
    payment_screen_amt.focus();
    target_un_inp.value = '';
}

function cancelpayment() {
    payment_screen.style.display = "none";
}

var loader_element = document.getElementById("loaderElement")

var loader = {
    start: () => {
        loader_element.style.height = "6px";
        loader_element.style.opacity = "1";
    },
    stop: () => {
        loader_element.style.height = "0px";
        loader_element.style.opacity = "0";
    }
}

function sendmoneyfr() {
    window.parent.roturExtension.transferCurrency({ AMOUNT: payment_screen_amt.value, USER: target_un_inp.value, NOTE: payment_screen_note.value }).then((result) => {
        if (result == "Success") {
            window.parent.toast("Paid :3")
        }
    })
}
