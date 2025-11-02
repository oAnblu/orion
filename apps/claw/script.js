var feed = document.getElementById("feed");
var msgLenLim = 100;
async function attachthings(obj) {
    attachments = "&attachment=" + await window.parent.ask('Enter a URL to your file:' || '')
    obj.innerHTML = `
                        <span>Re-attach</span>
                        <span class="material-symbols-rounded">
refresh
</span>`
}
function matchSizeAndPosition() {
    let loadingClaw = document.getElementById("loadingclaw");

    if (feed && loadingClaw) {
        let rect = feed.getBoundingClientRect();
        loadingClaw.style.position = "absolute";
        loadingClaw.style.top = rect.top + "px";
        loadingClaw.style.left = rect.left + "px";
        loadingClaw.style.width = rect.width + "px";
        loadingClaw.style.height = rect.height + "px";
    }
}

window.addEventListener("load", matchSizeAndPosition);
window.addEventListener("resize", matchSizeAndPosition);

const clawloader = {
    show() {
        const element = document.querySelector('#loadingclaw');
        element.style.display = 'flex';
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.transition = 'opacity 0.2s ease-out';
            element.style.opacity = '1';
        }, 0);
    },
    hide() {
        const element = document.querySelector('#loadingclaw');
        element.style.transition = 'opacity 0.2s ease-out';
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.display = 'none';
        }, 200);
    }
};


var selecteduser = "darkdot", postlimit = 10, lastrendereditem = null, currentOffset = 0, scrollPosition = 0, offsetParam, postReplies = {}, pfplib = {}, curTargetPost = null, curTargetPostliterally = null, attachments = '';

function arrayToString(arr) {
    if (arr.length === 0) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;

    return `${arr[0]}, ${arr[1]} and ${arr.length - 2} more..`;
}

async function loadFeed(type = 'claw', obj, useOffset = false, torefresh = false) {
    document.getElementById("otherfeed").style.display = "none";
    (torefresh) ? null : document.getElementById('moreOnPost').close();
    const activeElement = document.querySelector('.feedsnav .active');
    if (activeElement) {
        activeElement.classList.remove('active');
    }

    if (useOffset == false) {
        scrollToTop();
        clawloader.show();
    }
    const feedContainer = document.getElementById("feed");
    var response, posts;
    if (type == 'claw') {
        offsetParam = useOffset ? "&offset=" + currentOffset : "";
        document.getElementById("clawfeedbtn").classList.add('active');
        response = await fetch("https://claw.rotur.dev/feed?limit=" + postlimit + offsetParam);
        posts = await response.json();
        if (!useOffset) document.getElementById("feed").innerHTML = "";
    } else if (type == 'following') {
        if (!checkifaccs()) return;
        document.getElementById("followingfeedbtn").classList.add('active');
        response = await fetch("https://claw.rotur.dev/following_feed?auth=" + window.parent.roturExtension.userToken + "&limit=" + postlimit + offsetParam);
        posts = await response.json();
        if (!useOffset) feedContainer.innerHTML = "";
    } else if (type == 'top') {
        if (!checkifaccs()) return;
        document.getElementById("topfeedbtn").classList.add('active');
        response = await fetch("https://social.rotur.dev/top_posts?time_period=168");
        posts = await response.json();
        if (!useOffset) feedContainer.innerHTML = "";
    } else {
        response = await fetch("https://claw.rotur.dev/profile?name=" + selecteduser + offsetParam);
        posts = (await response.json()).posts;
        if (!useOffset) {
            feedContainer.innerHTML = `<div class="profileseperator">
                <div class="profilepic"><img src="" id="pfpuserdet"></div>
                <div class="userdata">
                    <div class="userdatatext"><h2 id="undispusdat">UserName</h2><p id="postsnoteaser">Created 2 months ago</p></div>
                    <div class="userdatabtns">
                        <div class="active primebtn buttonlike" id="followbtn"><button id="followbtntxt">Follow</button><span id="follownumbers">00</span></div>
                        <div class="primebtn" onclick="moreinfo()">More info</div>
                    </div>
                </div>
            </div>`;
            listprofilefeatures();
        }
    }

    let lastUser = null;

    if (posts.length < 1) {
        feedContainer.innerHTML = `You do not follow anyone. Follow someone to see the feed.`;
        clawloader.hide();
        return;
    }
    posts.forEach(post => {
        const postElement = document.createElement("div");
        postElement.classList.add("randompost");
        postElement.classList.add("realpost");
        postElement.id = "postitem" + post.id;

        lastrendereditem = "postitem" + post.id;

        const postNav = document.createElement("div");
        postNav.classList.add("postnav");

        const postUserData = document.createElement("div");
        postUserData.classList.add("postuserdata");
        postUserData.onclick = () => {
            viewprofile(post.user);
        };

        const postUserAvatar = document.createElement("div");
        postUserAvatar.classList.add("postuseravatar");

        const userAvatarImg = document.createElement("img");
        userAvatarImg.classList.add("postuseravatarsrc");
        userAvatarImg.src = "https://avatars.rotur.dev/" + post.user;
        pfplib[post.user] = userAvatarImg.src;

        postUserAvatar.appendChild(userAvatarImg);

        const postUserDynamics = document.createElement("div");
        postUserDynamics.classList.add("postuserdynamics");

        const postUsername = document.createElement("div");
        postUsername.classList.add("postusername");
        postUsername.textContent = post.user;

        const postTimestamp = document.createElement("div");
        postTimestamp.classList.add("posttimestamp");
        if (post.os) {
            if (post.os === "NovaOS") {
                postTimestamp.innerHTML = timeSince(post.timestamp) + " | Posted here";
            } else {
                postTimestamp.textContent = timeSince(post.timestamp) + " | Posted on " + post.os;
            }
        } else {
            postTimestamp.textContent = timeSince(post.timestamp);
        }

        postUserDynamics.appendChild(postUsername);
        postUserDynamics.appendChild(postTimestamp);

        postUserData.appendChild(postUserAvatar);
        postUserData.appendChild(postUserDynamics);

        postNav.appendChild(postUserData);
        postElement.appendChild(postNav);

        const postContent = document.createElement("div");
        postContent.classList.add("postcontent");
        postContent.id = "postCont" + post.id;
        postContent.textContent = post.content;
        postContent.onclick = () => {
            loadreplies(post, postElement);
        }

        if (post.attachment) {
            const url = post.attachment;
            if (url.startsWith("https://postimg.cc/3dPn6tGN/b62c7700/g.png/")) {
                const text = url.replace("https://postimg.cc/3dPn6tGN/b62c7700/g.png/", "");
                postContent.textContent = text;
            } else {
                const postImg = document.createElement("img");
                postImg.classList.add("postimg");
                postImg.src = url;
                postContent.appendChild(postImg);
            }
        }

        postElement.appendChild(postContent);

        try {
            const postFooter = document.createElement("div");
            postFooter.classList.add("postfooter");

            const likestatuses = document.createElement("div");
            likestatuses.classList.add("likestatuses");

            const likesDiv = document.createElement("div");
            likesDiv.classList.add("likes");
            likesDiv.onclick = function () {
                likepost(post.id);
            };


            const heartIcon = document.createElement("span");
            heartIcon.classList.add("material-symbols-rounded");
            heartIcon.innerText = "favorite";

            const likesNumber = document.createElement("span");
            likesNumber.classList.add("likesnumber");
            likesNumber.textContent = post.likes ? post.likes.length : 0;

            likesDiv.appendChild(heartIcon);
            likesDiv.appendChild(likesNumber);

            likestatuses.appendChild(likesDiv);


            if (post.replies && post.replies.length > 0) {
                post.replies.forEach(reply => {
                    if (!postReplies[post.id]) {
                        postReplies[post.id] = [];
                    }
                    postReplies[post.id].push(reply);
                });
                const repliesDiv = document.createElement("div");
                repliesDiv.classList.add("replies");
                repliesDiv.onclick = () => {
                    loadreplies(post, postElement);
                }
                const msgIcon = document.createElement("span");
                msgIcon.classList.add("material-symbols-rounded");
                msgIcon.innerText = "chat";

                const repliesNumber = document.createElement("span");
                repliesNumber.classList.add("repliesnumber");
                repliesNumber.textContent = post.replies ? post.replies.length : 0;

                repliesDiv.appendChild(msgIcon);
                repliesDiv.appendChild(repliesNumber);
                likestatuses.appendChild(repliesDiv);
            }


            const wholiked = document.createElement("div");

            wholiked.classList.add("wholikedhint");
            if (post.likes && post.likes.length !== 0) {
                wholiked.innerText = "Liked by " + arrayToString(post.likes);
            } else {
                wholiked.innerText = "Be first to like this post."
            }
            likestatuses.appendChild(wholiked);

            const moreDiv = document.createElement("div");
            moreDiv.classList.add("more");

            const copyButton = document.createElement("button");
            copyButton.textContent = "Copy ID";
            copyButton.onclick = function () {
                copyId(post.id);
            };


            moreDiv.appendChild(copyButton);

            postFooter.appendChild(likestatuses);
            postFooter.appendChild(moreDiv);
            postElement.appendChild(postFooter);

            feedContainer.appendChild(postElement);
        } catch (e) {
            console.error(e, post);
        }
    });


    afterloadingtheposts()

    function afterloadingtheposts() {

        clawloader.hide();
        if (type == 'claw' || type == 'following' || type == 'profile') {
            var moreButton = document.createElement("button");
            moreButton.classList.add("morebtn");
            moreButton.innerHTML = `
                <div class="loader"></div> Loading more...`;
            let ouritem = lastrendereditem;
            let timer;

            async function loadmoreposts() {
                currentOffset += postlimit;
                scrollPosition = window.scrollY;
                await loadFeed(type, null, true);
                window.scrollTo(0, scrollPosition);
                setTimeout(() => {
                    moreButton.remove();
                }, 200);
            }

            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    loadmoreposts();
                }
            }, { threshold: 1 });

            observer.observe(moreButton);
            document.getElementById("feed").appendChild(moreButton);
        }

    }
}

function timeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
    ];
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
    return "Just now";
}

async function likepost(id) {
    if (!checkifaccs()) { return }
    await fetch("https://claw.rotur.dev/rate?id=" + id + "&auth=" +
        window.parent.roturExtension.userToken + "&rating=1&os=NovaOS");
    loadFeed()
}

async function newpost() {
    if (!checkifaccs()) { return }
    let content = document.getElementById("postinput").value;

    if (msgLenLim == 450) {
        attachments = "&attachment=" + "https://postimg.cc/3dPn6tGN/b62c7700/g.png/" + encodeURIComponent(content);
        content = '*';
    }
    await fetch(`https://claw.rotur.dev/post?content=${content}&os=NovaOS&auth=${window.parent.roturExtension.userToken}${attachments}`);

    if (attachments) {
        document.getElementById("attachbtn").innerHTML = `
        <span>Attach</span>
        <ion-icon name="link-outline"></ion-icon>`;
    }

    attachments = '';
    loadFeed();
}


async function followuser() {
    if (!checkifaccs()) { return }
    let content = document.getElementById("postinput").value;
    await fetch("https://claw.rotur.dev/post?content=" + content + "&os=NovaOS&auth=" +
        window.parent.roturExtension.userToken);
}

function copyId(id) {
    navigator.clipboard.writeText(id);
}

function createReplyElement(reply) {
    const replyElement = document.createElement("div");
    replyElement.classList.add("randompost");
    replyElement.id = "replyitem" + reply.id;

    replyElement.onclick = () => {
        document.getElementById("moreOnPost").showModal();
        const replyPreview = document.createElement("div");
        replyPreview.classList.add("randompost");
        replyPreview.innerHTML = replyElement.innerHTML;
        document.getElementById("targetpost").innerHTML = replyPreview.innerHTML;
    };

    const replyNav = document.createElement("div");
    replyNav.classList.add("postnav");

    const replyUserData = document.createElement("div");
    replyUserData.classList.add("postuserdata");
    replyUserData.onclick = () => {
        viewprofile(reply.user);
    };

    const replyUserAvatar = document.createElement("div");
    replyUserAvatar.classList.add("postuseravatar");

    const replyUserAvatarImg = document.createElement("img");
    replyUserAvatarImg.classList.add("postuseravatarsrc");
    replyUserAvatarImg.src = reply.pfp || pfplib[reply.user];

    replyUserAvatar.appendChild(replyUserAvatarImg);

    const replyUserDynamics = document.createElement("div");
    replyUserDynamics.classList.add("postuserdynamics");

    const replyUsername = document.createElement("div");
    replyUsername.classList.add("postusername");
    replyUsername.textContent = reply.user;

    const replyTimestamp = document.createElement("div");
    replyTimestamp.classList.add("posttimestamp");
    replyTimestamp.textContent = timeSince(reply.timestamp);

    replyUserDynamics.appendChild(replyUsername);
    replyUserDynamics.appendChild(replyTimestamp);

    replyUserData.appendChild(replyUserAvatar);
    replyUserData.appendChild(replyUserDynamics);

    replyNav.appendChild(replyUserData);
    replyElement.appendChild(replyNav);

    const replyContent = document.createElement("div");
    replyContent.classList.add("postcontent");
    replyContent.textContent = reply.content;

    replyElement.appendChild(replyContent);

    const replyFooter = document.createElement("div");
    replyFooter.classList.add("postfooter");

    const likestatuses = document.createElement("div");
    likestatuses.classList.add("likestatuses");

    const likesDiv = document.createElement("div");
    likesDiv.classList.add("likes");
    likesDiv.onclick = function () {
        likepost(reply.id);
    };

    const heartIcon = document.createElement("span");
    heartIcon.classList.add("material-symbols-rounded");
    heartIcon.innerText = "favorite";

    const likesNumber = document.createElement("span");
    likesNumber.classList.add("likesnumber");
    likesNumber.textContent = reply.likes ? reply.likes.length : 0;

    likesDiv.appendChild(heartIcon);
    likesDiv.appendChild(likesNumber);

    likestatuses.appendChild(likesDiv);

    replyFooter.appendChild(likestatuses);
    replyElement.appendChild(replyFooter);

    return replyElement;
}

async function reloadCurrentFeed(post) {
    const activeElement = document.querySelector('.feedsnav .active');
    let type = 'claw'; // Default feed type is 'claw'

    if (activeElement) {
        if (activeElement.id === 'clawfeedbtn') {
            type = 'claw';
        } else if (activeElement.id === 'followingfeedbtn') {
            type = 'following';
        } else if (activeElement.id === 'topfeedbtn') {
            type = 'top';
        } else if (activeElement.id === 'profilefeedbtn') {
            type = 'profile';
        }
    }

    const useOffset = currentOffset !== 0;
    await loadFeed(type, null, useOffset);

    const allPosts = document.querySelectorAll(".randompost .realpost");

    allPosts.forEach(postElement => {
        const postId = postElement.id.replace("postitem", "");

        if (post.replies && post.replies.length > 0) {
            renderReplies(postElement, post.replies);
        }
    });

    setTimeout(document.getElementById("postCont" + post.id).click(), 2000)
}

function renderReplies(postElement, replies) {
    console.log(postElement, replies)
    const repliesContainer = postElement.querySelector("#postReplies");
    if (repliesContainer) {
        repliesContainer.innerHTML = '';
    }

    replies.forEach(reply => {
        const replyElement = createReplyElement(reply);
        repliesContainer.appendChild(replyElement);
    });
}

async function listprofilefeatures(name = selecteduser) {
    var profileitems = {
        img: document.getElementById("pfpuserdet"),
        name: document.getElementById("undispusdat"),
        desc: document.getElementById("postsnoteaser"),
        follows: document.getElementById("follownumbers"),
        followbtn: document.getElementById("followbtn"),
        followbtntxt: document.getElementById("followbtntxt"),
    }

    profileitems.name.innerHTML = name;

    clawloader.show();

    const response = await fetch("https://claw.rotur.dev/profile?name=" + name);
    const userclouddat = await response.json();

    profileitems.img.src = userclouddat?.pfp || "https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/no-profile-picture-icon.png";
    profileitems.desc.innerText = "Created " + timeSince(userclouddat.created);
    profileitems.follows.innerText = userclouddat.followers;

    const responsefol = await fetch("https://claw.rotur.dev/followers?username=" + name);
    const userclouddatfol = await responsefol.json();
    if (userclouddatfol.followers.includes(window.parent.roturExtension.user.username)) {
        followbtntxt.innerHTML = "Unfollow";
        followbtn.style.background = "#2f2f2f";
        followbtn.onclick = async () => {
            await fetch("https://claw.rotur.dev/unfollow?username=" + name + "&os=NovaOS&auth=" +
                window.parent.roturExtension.userToken);
        }
    } else {
        followbtntxt.innerHTML = "Follow";
        followbtn.style.background = "#4e5fa7";
        followbtn.onclick = async () => {
            await fetch("https://claw.rotur.dev/follow?username=" + name + "&os=NovaOS&auth=" +
                window.parent.roturExtension.userToken);
        }
    }

    clawloader.hide();
}

async function viewprofile(name) {
    document.getElementById('moreOnPost').close();
    if (!checkifaccs()) { return }
    selecteduser = name;
    await loadFeed('user');
}

function checkifaccs() {
    let signedinch = window.parent.roturExtension.loggedIn();
    if (!signedinch) {
        window.parent.say("You don't have a rotur account linked.");
    }
    return signedinch;
}

loadFeed();

function greenflag() {
    document.getElementById('crtaccountname').innerText = window.parent.roturExtension.user.username || 'Guest';
    document.getElementById('currentaccPfpdisp').src = "https://avatars.rotur.dev/" + window.parent.roturExtension.user.username || 'o';
    document.getElementById("crtaccdisbtn").onclick = () => {
        viewprofile(window.parent.roturExtension.user.username);
    }
}
greenflag();

async function addreply() {
    let content = document.getElementById("addAreplyInp").value;
    let postId = curTargetPost;
    if (content.trim() === "") return;

    await fetch(`https://claw.rotur.dev/reply?auth=${window.parent.roturExtension.userToken}&id=${postId}&content=${encodeURIComponent(content)}`);
    document.getElementById("addAreplyInp").value = "";
    reloadCurrentFeed(curTargetPostliterally);
}

function checkEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addreply();
    }
}

function loadreplies(post, postElement) {
    curTargetPost = post.id;
    curTargetPostliterally = post;
    document.getElementById("moreOnPost").showModal();
    document.getElementById("targetpost").innerHTML = postElement.innerHTML;

    const repliesContainer = document.getElementById("postReplies");
    repliesContainer.innerHTML = '';

    if (post.replies && post.replies.length > 0) {
        post.replies.forEach(reply => {
            const replyElement = document.createElement("div");
            replyElement.classList.add("randompost");
            replyElement.id = "replyitem" + reply.id;

            replyElement.onclick = () => {
                document.getElementById("moreOnPost").showModal();
                const replyPreview = document.createElement("div");
                replyPreview.classList.add("randompost");
                replyPreview.innerHTML = replyElement.innerHTML;
                document.getElementById("targetpost").innerHTML = replyPreview.innerHTML;
            };

            const replyNav = document.createElement("div");
            replyNav.classList.add("postnav");

            const replyUserData = document.createElement("div");
            replyUserData.classList.add("postuserdata");
            replyUserData.onclick = () => {
                viewprofile(reply.user);
            };

            const replyUserAvatar = document.createElement("div");
            replyUserAvatar.classList.add("postuseravatar");

            const replyUserAvatarImg = document.createElement("img");
            replyUserAvatarImg.classList.add("postuseravatarsrc");
            replyUserAvatarImg.src = reply.pfp || pfplib[reply.user];

            replyUserAvatar.appendChild(replyUserAvatarImg);

            const replyUserDynamics = document.createElement("div");
            replyUserDynamics.classList.add("postuserdynamics");

            const replyUsername = document.createElement("div");
            replyUsername.classList.add("postusername");
            replyUsername.textContent = reply.user;

            const replyTimestamp = document.createElement("div");
            replyTimestamp.classList.add("posttimestamp");
            replyTimestamp.textContent = timeSince(reply.timestamp);

            replyUserDynamics.appendChild(replyUsername);
            replyUserDynamics.appendChild(replyTimestamp);

            replyUserData.appendChild(replyUserAvatar);
            replyUserData.appendChild(replyUserDynamics);

            replyNav.appendChild(replyUserData);
            replyElement.appendChild(replyNav);

            const replyContent = document.createElement("div");
            replyContent.classList.add("postcontent");
            replyContent.textContent = reply.content;

            replyElement.appendChild(replyContent);

            const replyFooter = document.createElement("div");
            replyFooter.classList.add("postfooter");

            const likestatuses = document.createElement("div");
            likestatuses.classList.add("likestatuses");

            const likesDiv = document.createElement("div");
            likesDiv.classList.add("likes");
            likesDiv.onclick = function () {
                likepost(reply.id);
            };

            const heartIcon = document.createElement("ion-icon");
            heartIcon.setAttribute("name", "heart-outline");

            const likesNumber = document.createElement("span");
            likesNumber.classList.add("likesnumber");
            likesNumber.textContent = reply.likes ? reply.likes.length : 0;

            likesDiv.appendChild(heartIcon);
            likesDiv.appendChild(likesNumber);

            likestatuses.appendChild(likesDiv);

            replyFooter.appendChild(likestatuses);
            replyElement.appendChild(replyFooter);

            repliesContainer.appendChild(replyElement);
        });
    };
}

function scrollToTop() {
    feed.scrollTop = 0;
}

async function moreinfo() {
    let resp1 = await fetch("https://claw.rotur.dev/followers?username=" + selecteduser);
    let resp2 = await fetch("https://claw.rotur.dev/following?username=" + selecteduser);

    let followers = await resp1.json();
    let following = await resp2.json();

    window.parent.say(`<p>Following: ${following.following.join(", ")}</p><p>Followers: ${followers.followers.join(", ")}</p>`);
}

async function toggleOrionEnc() {

    if (msgLenLim == 450) {
        await window.parent.say("Turned off Orion Encoding", "success");
        msgLenLim = 100;
        updmsglentxt();
        return;
    }
    if (await window.parent.justConfirm("Turn on Orion Encoding?", "This increases the message limit to 450 charecters, BUT will appear as an error on other clients.")) {
        await window.parent.say("<h1>You now have Orion Encoding.</h1> Users on other clients will not be able to see your messages. But users on this client sees it with a max length of 450. We know Orion Encoding is unhealthy. But if we didn't, someone bad will create this.", "success");
        msgLenLim = 450;
        updmsglentxt();
    }
}

function updmsglentxt() {
    var msglendisp = document.getElementById("postlen");
    msglendisp.innerText = document.getElementById("postinput").value.length + "/" + msgLenLim;
}