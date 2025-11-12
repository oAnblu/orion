async function renderProfile(name) {
    const res = await fetch(`https://api.rotur.dev/profile?name=${encodeURIComponent(name)}&include_posts=0`);
    const data = await res.json();
    document.querySelector('#prof_pfp').src = data.pfp;
    document.querySelector('#prof_name').textContent = data.username;
    document.querySelector('#prof_more').innerHTML = `<a>${data.private ? '<i class="material-symbols-rounded">lock</i> Private' : '<i class="material-symbols-rounded">public</i> Public'}</a> • <a>${data.system}</a> • <a>${data.pronouns}</a>`;
    document.querySelector('#prof_abtme').textContent = data.bio.replace(/\n/g, ' ');
    document.querySelector('#prof_crds').textContent = data.currency;
    document.querySelector('#prof_flwrs').textContent = data.followers;
    document.querySelector('#prof_marry').textContent = data.married_to || 'Nobody';
    const badgesContainer = document.querySelector('#prof_badges');
    badgesContainer.innerHTML = '';
    data.badges.forEach(b => {
        const badge = document.createElement('div');
        badge.className = 'sing_badge';

        const canvas = document.createElement('canvas');
        canvas.width = 25;
        canvas.height = 25;
        badge.appendChild(canvas);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 25 * dpr;
        canvas.height = 25 * dpr;
        canvas.style.width = '25px';
        canvas.style.height = '25px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        renderICN(b.icon, canvas);

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = b.name;
        badge.appendChild(tooltip);

        badgesContainer.appendChild(badge);
    });

    const theme = data.theme;
    document.querySelector('#prof_banner').style.background = theme.accent;
}
function renderICN(code, canvas) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.lineCap = 'round';
    let last = { x: 0, y: 0 };
    const cmds = code.trim().split(/\s+/);
    let color = '#000', weight = 1;
    for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        if (cmd === 'c') color = cmds[++i];
        else if (cmd === 'w') weight = parseFloat(cmds[++i]);
        else if (cmd === 'line') {
            const x1 = parseFloat(cmds[++i]), y1 = parseFloat(cmds[++i]),
                x2 = parseFloat(cmds[++i]), y2 = parseFloat(cmds[++i]);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = weight;
            ctx.moveTo(x1, -y1);
            ctx.lineTo(x2, -y2);
            ctx.stroke();
            last = { x: x2, y: y2 };
        } else if (cmd === 'cont') {
            const x = parseFloat(cmds[++i]), y = parseFloat(cmds[++i]);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = weight;
            ctx.moveTo(last.x, -last.y);
            ctx.lineTo(x, -y);
            ctx.stroke();
            last = { x, y };
        } else if (cmd === 'square') {
            const x = parseFloat(cmds[++i]), y = parseFloat(cmds[++i]),
                w = parseFloat(cmds[++i]), h = parseFloat(cmds[++i]);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = weight;
            ctx.strokeRect(x - w / 2, -y - h / 2, w, h);
        } else if (cmd === 'dot') {
            const x = parseFloat(cmds[++i]), y = parseFloat(cmds[++i]);
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x, -y, weight / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (cmd === 'cutcircle') {
            const x = parseFloat(cmds[++i]);
            const y = parseFloat(cmds[++i]);
            const radius = parseFloat(cmds[++i]);
            let angleICN = parseFloat(cmds[++i]);
            let filledICN = parseFloat(cmds[++i]);

            let circleAngle = (angleICN * 10) - filledICN;
            let oldX = x + Math.sin(circleAngle * Math.PI / 180) * radius;
            let oldY = -y - Math.cos(circleAngle * Math.PI / 180) * radius;

            const steps = Math.floor(filledICN / 3) + 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = weight;
            for (let j = 0; j < steps - 1; j++) {
                circleAngle += 6;
                const newX = x + Math.sin(circleAngle * Math.PI / 180) * radius;
                const newY = -y - Math.cos(circleAngle * Math.PI / 180) * radius;
                ctx.beginPath();
                ctx.moveTo(oldX, oldY);
                ctx.lineTo(newX, newY);
                ctx.stroke();
                oldX = newX;
                oldY = newY;
            }
        } else if (cmd === 'ellipse') {
            const x = parseFloat(cmds[++i]), y = parseFloat(cmds[++i]),
                width = parseFloat(cmds[++i]), hm = parseFloat(cmds[++i]),
                dir = parseFloat(cmds[++i]) * Math.PI / 180;
            ctx.save();
            ctx.translate(x, -y);
            ctx.rotate(dir);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = weight;
            ctx.scale(1, hm);
            ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();
}



renderICN("w 8 c #444 square 0 0 6 6 w 6 c #111 square 0 0 5 5 dot 0 0 c #ddd w 1.3 cutcircle 0 0 6.5 4.5 150 cutcircle 0 0 3.5 5 150 line -1 -2 -4.5 -5.5", document.getElementById("c"))