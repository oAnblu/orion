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

    const rootStyles = getComputedStyle(document.documentElement);

    const borderColor = rootStyles.getPropertyValue('--col-bgh').trim();
    const backgroundColor = rootStyles.getPropertyValue('--col-bg3').trim();


    document.getElementById("accbaldisp").innerText = currentBalance;
    const transactions = JSON.parse(rawData);
    let balance = currentBalance;
    let totalGain = 0;
    let totalLoss = 0;
    const dataPoints = [{ balance, transaction: 'Current Balance' }];

    transactions.forEach(transaction => {
        console.log(JSON.stringify(transaction));
        if (typeof transaction === 'string') {
            const match = transaction.match(/([-+]?\d*\.?\d+)/);
            if (match) {
                const amount = parseFloat(match[0]);
                balance -= amount;

                if (amount > 0) {
                    totalGain += amount;
                } else if (amount < 0) {
                    totalLoss += Math.abs(amount);
                }

                dataPoints.unshift({ balance, transaction });
            }
        } else if (typeof transaction === 'object' && transaction !== null) {
            const amount = transaction.amount || 0;
            const type = transaction.type;
            const signedAmount = type === 'out' ? -amount : amount;
            balance -= signedAmount;

            if (type === 'in') {
                totalGain += amount;
            } else if (type === 'out') {
                totalLoss += amount;
            }

            const user = transaction.user || 'unknown';
            const note = transaction.note ? ` (${transaction.note})` : '';
            const direction = type === 'out' ? 'to' : 'from';
            const readable = `${type === 'out' ? '-' : '+'}${amount} ${direction} ${user}${note}`;

            dataPoints.unshift({ balance, transaction: readable });
        }
    });

    while (dataPoints.length < 6) {
        const earliest = dataPoints[0];
        dataPoints.unshift({ balance: earliest ? earliest.balance : 0, transaction: 'No Data' });
    }

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


    const ctx = document.getElementById('transactionChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataPoints.map((_, i) => i),
            datasets: [{
                label: 'Balance',
                data: dataPoints.map(dp => dp.balance),
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { display: false },
                y: { display: true, title: { display: true, text: 'Balance' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (tooltipItem) {
                            const dp = dataPoints[tooltipItem.dataIndex];
                            return `Balance: ${dp.balance}   Transaction: ${dp.transaction}`;
                        }
                    }
                }
            }
        }
    });

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
