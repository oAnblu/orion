var iframe = document.getElementById("mainframe");
var appRunner = document.getElementById("appRunner");
var mainHead = document.getElementById("mainHead");
var adHeader = document.getElementById("PromoHeader");
var sidebar = document.getElementById("sidebar");
var loader = document.getElementById("loader");
var persohome = document.getElementById("persohome");

persohome.classList.toggle("disp");

mainHead.classList = "disp";
var inView = false;

function openApp(name) {
    if (!inView) {
        adHeader.classList.toggle("disp");
        mainHead.classList.toggle("disp");
        sidebar.classList.toggle("side");

        inView = true;
    }

    iframe.src = "/apps/" + name;
}

function clearActive() {
    [...document.getElementsByClassName("onebtn")].forEach(element => {element.classList.remove("active");})
}

[...document.getElementsByClassName("onebtn")].forEach(element => {
    element.onclick = (ele) => {
        clearActive();
        element.classList.add("active");
        openApp(element.getAttribute("data-name"))
    };
});

let toastInProgress = false;
let totalDuration = 0;
const maxToastDuration = 5000;
let toastQueue = [];

function notify(text, duration = 5000) {
    let displayDuration = Math.min(duration, maxToastDuration);

	if (toastInProgress) {
		toastQueue.push({ text, duration: displayDuration });
	} else {
		totalDuration = displayDuration;
		toastInProgress = true;
		displayToast(text, displayDuration);
	}
}

function displayToast(text, duration) {
	var titleb = document.getElementById('toastdivtext');
	if (titleb) {
		titleb.innerText = text;
		document.getElementById("toastdiv").style.zIndex = 5;
		document.getElementById("toastdiv").classList.add('notifpullanim');
		document.getElementById("toastdiv").style.display = "block";

		setTimeout(function () {
			document.getElementById("toastdiv").classList.remove('closeEffect');
		}, 200);

		document.getElementById("toastdiv").onclick = function () {
			document.getElementById("toastdiv").classList.add('closeEffect');
			document.getElementById("toastdiv").style.display = "none";
			toastInProgress = false;
			if (toastQueue.length > 0) {
				const nextToast = toastQueue.shift();
				displayToast(nextToast.text, nextToast.duration);
			}
		};

		setTimeout(function () {
			document.getElementById("toastdiv").classList.add('closeEffect');
			setTimeout(function () {
				document.getElementById("toastdiv").style.display = "none";
				toastInProgress = false;
				if (toastQueue.length > 0) {
					const nextToast = toastQueue.shift();
					displayToast(nextToast.text, nextToast.duration);
				}
			}, 200);
		}, duration);
	} else {
		console.error("DOM elements not found.");
	}
}
