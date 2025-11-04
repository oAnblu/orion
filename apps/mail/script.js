var pfplib = {};

async function listMails() {
    const raw = await window.parent.roturExtension.getAllMail();
    const mails = JSON.parse(raw);
    const list = document.querySelector('#mailList');
    list.innerHTML = '';
    const now = Date.now();
    for (const m of mails) {
        const diff = now - m.timestamp;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        const rel = days > 0 ? days + 'd' : hours > 0 ? hours + 'h' : mins + 'm';

        const mailUserData = document.createElement("div");
        mailUserData.classList.add("mailuserdata");
        mailUserData.onclick = () => {
            viewprofile(m.from);
        };

        const mailUserAvatar = document.createElement("div");
        mailUserAvatar.classList.add("mailuseravatar");

        const userAvatarImg = document.createElement("img");
        userAvatarImg.classList.add("mailuseravatarsrc");
        userAvatarImg.src = "https://avatars.rotur.dev/" + m.from;
        pfplib[m.from] = userAvatarImg.src;

        mailUserAvatar.appendChild(userAvatarImg);

        const mailUserDynamics = document.createElement("div");
        mailUserDynamics.classList.add("mailuserdynamics");

        const mailUsername = document.createElement("div");
        mailUsername.classList.add("mailusername");
        mailUsername.textContent = m.from;

        const mailTimestamp = document.createElement("div");
        mailTimestamp.classList.add("mailtimestamp");
        mailTimestamp.textContent = rel;

        mailUserDynamics.appendChild(mailUsername);
        mailUserDynamics.appendChild(mailTimestamp);

        mailUserData.appendChild(mailUserAvatar);
        mailUserData.appendChild(mailUserDynamics);

        const div = document.createElement('div');
        div.classList.add("singMail");
        div.appendChild(mailUserData);
        div.innerHTML += `<div class="title">${m.title}</div>`;
        list.appendChild(div);

        const divider = document.createElement("div");
        divider.classList.add("divider");
        list.appendChild(divider);
    }

}
listMails();