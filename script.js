var iframe = document.getElementById("mainframe");
var appRunner = document.getElementById("appRunner");
var mainHead = document.getElementById("mainHead");
var sidebar = document.getElementById("sidebar");
var loader = document.getElementById("loader");
var persohome = document.getElementById("persohome");
var curtheme = localStorage.getItem("orion-theme") || "default";
var accent = "#39335b";

var theme = {
	"default": {
		"--col-bg1": "#101010",
		"--col-bg2": "#171717",
		"--col-bg3": "#262626",
		"--col-bgh": "#39335b",
		"--col-txt1": "#FFFFFF",
		"--col-txth": "#aa9bff"
	},
	"light": {
		"--col-bg1": "#fffbf2",
		"--col-bg2": "#ffebbe",
		"--col-bg3": "#e9a35b",
		"--col-bgh": "#ffc160",
		"--col-txt1": "#000000",
		"--col-txth": "#524527"
	},
	"communism": {
		"--col-bg1": "#150000",
		"--col-bg2": "#57000a",
		"--col-bg3": "#ff6464",
		"--col-bgh": "#ff0000",
		"--col-txt1": "#FFFFFF",
		"--col-txth": "#FFFFFF"
	},
	"night shift": {
		"--col-bg1": "#0e0d0a",
		"--col-bg2": "#17110a",
		"--col-bg3": "#231c10",
		"--col-bgh": "#ffdb49",
		"--col-txt1": "#feffd9",
		"--col-txth": "#000000"
	},
	"banks use this": {
		"--col-bg1": "#1a1d6a",
		"--col-bg2": "#3c428d",
		"--col-bg3": "#38485f",
		"--col-bgh": "#00155b",
		"--col-txt1": "#ffffff",
		"--col-txth": "#ff7272"
	},
	"heaven": {
		"--col-bg1": "#ffffff",
		"--col-bg2": "#c4f0ff",
		"--col-bg3": "#73a7ff",
		"--col-bgh": "#225069",
		"--col-txt1": "#313131",
		"--col-txth": "#FFFFFF"
	},
	"hacker": {
		"--col-bg1": "#000000",
		"--col-bg2": "#020802",
		"--col-bg3": "#0e1f13",
		"--col-bgh": "#194209",
		"--col-txt1": "#3cff32",
		"--col-txth": "#95ff7e"
	}
}

persohome.classList.toggle("disp");

var inView = false;

function openApp(name) {
	iframe.style.opacity = 0;
	setTimeout(() => {
		iframe.src = "apps/" + name;
	}, 300);
}

iframe.onload = () => {
	setTheme(curtheme, iframe.contentDocument.documentElement);
	setTimeout(() => {
		iframe.style.opacity = 1;
	}, 500);
}

function clearActive() {
	[...document.getElementsByClassName("onebtn")].forEach(element => { element.classList.remove("active"); })
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

function toast(text, duration = 5000) {
	notify(text, duration)
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

function makedialogclosable(ok) {
	const myDialog = gid(ok);

	if (!myDialog.__originalClose) {
		myDialog.__originalClose = myDialog.close;
		myDialog.close = function () {
			console.log(342, ok)
			this.classList.add("closeEffect");

			function handler() {
				myDialog.__originalClose();
				myDialog.classList.remove("closeEffect");
			};
			setTimeout(handler, 200);
		};
	}

	document.addEventListener('click', (event) => {
		if (event.target === myDialog) {
			myDialog.close();
		}
	});
}
function openModal(type, { title = '', message, options = null, status = null, preset = '' } = {}) {
	return new Promise((resolve) => {
		const modal = document.createElement('dialog');
		modal.classList.add('modal');

		const modalItemsCont = document.createElement('div');
		modalItemsCont.classList.add('modal-items');

		const icon = document.createElement('span');
		icon.classList.add('material-symbols-rounded');
		let ic = "warning";
		if (status === "success") ic = "check_circle";
		else if (status === "failed") ic = "dangerous";
		icon.textContent = ic;
		icon.classList.add('modal-icon');
		modalItemsCont.appendChild(icon);

		if (title && title.length > 0) {

			const h1 = document.createElement('h1');
			h1.textContent = title;
			modalItemsCont.appendChild(h1);
		}

		const p = document.createElement('p');
		if (type === 'say' || type === 'confirm') {
			p.innerHTML = `${message}`;
		} else {
			p.textContent = message;
		}
		modalItemsCont.appendChild(p);

		let dropdown = null;
		if (type === 'dropdown') {
			dropdown = document.createElement('select');
			let items = Array.isArray(options) ? options : Object.values(options);
			for (const option of items) {
				const opt = document.createElement('option');
				opt.value = option;
				opt.textContent = option;
				dropdown.appendChild(opt);
			}
			modalItemsCont.appendChild(dropdown);
		}

		let inputField = null;
		if (type === 'ask') {
			inputField = document.createElement('input');
			inputField.type = 'text';
			inputField.value = preset;
			modalItemsCont.appendChild(inputField);
		}

		const btnContainer = document.createElement('div');
		btnContainer.classList.add('button-container');
		modalItemsCont.appendChild(btnContainer);

		const yesButton = document.createElement('button');
		yesButton.textContent = type === 'confirm' ? 'Yes' : 'OK';
		btnContainer.appendChild(yesButton);

		if (type === 'confirm' || type === 'dropdown') {
			const noButton = document.createElement('button');
			noButton.textContent = type === 'confirm' ? 'No' : 'Cancel';
			btnContainer.appendChild(noButton);
			noButton.onclick = () => {
				modal.close();
				modal.remove();
				resolve(false);
			};
		}

		yesButton.onclick = () => {
			modal.close();
			modal.remove();
			if (type === 'dropdown') {
				resolve(dropdown.value);
			} else if (type === 'ask') {
				resolve(inputField.value);
			} else {
				resolve(true);
			}
		};
		document.body.appendChild(modal);
		modal.appendChild(modalItemsCont);
		modal.showModal();
	});
}

function justConfirm(title, message) {
	return openModal('confirm', { title, message });
}
function showDropdownModal(title, message, options) {
	return openModal('dropdown', { title, message, options });
}
function say(message, status = null) {
	return openModal('say', { message, status });
}
function ask(question, preset = '') {
	return openModal('ask', { message: question, preset });
}

openApp("home");

function setTheme(themeName, documentItem = document.documentElement) {
	themeName = themeName.toLowerCase();
	var themeDecs = theme[themeName];
	accent = themeDecs["--col-bgh"];
	Object.keys(themeDecs).forEach(i => {
		documentItem.style.setProperty(i, themeDecs[i]);
	});
}

document.getElementById("themesel").addEventListener("change", (ev) => {
	curtheme = ev.target.value;
	localStorage.setItem("orion-theme", curtheme)
	setTheme(curtheme);
	setTheme(curtheme, iframe.contentDocument.documentElement)
})

setTheme(curtheme);
document.getElementById("themesel").value = curtheme;

var sidebarCont = document.getElementById("sidebarapp");
var sidebarappframe = document.getElementById("sidebarappframe");
sidebarCont.style.display = 'none';
function launchSideBarApp(name, data) {
	sidebarCont.style.display = 'flex';
	sidebarappframe.src = "apps/" + name;
	try {
		sidebarappframe.contentWindow.greenflag({data: data})
	} catch {}
}

launchSideBarApp("contacts", { name: "mist" })

document.querySelectorAll(".checkbox").forEach(item => {
	var dataSetting = item.getAttribute("data-setting");
	if (localStorage.getItem("orion_" + dataSetting) != false) {
		item.classList.add("enabled")
	} else {
		item.classList.remove("enabled")
	}
	item.onclick = () => {
		if (dataSetting) {
			if (item.classList.contains("enabled")) {
				localStorage.setItem("orion_" + dataSetting, false)
				item.classList.remove("enabled")
			} else {
				localStorage.setItem("orion_" + dataSetting, true)
				item.classList.add("enabled")
			}
		}
	}
})

