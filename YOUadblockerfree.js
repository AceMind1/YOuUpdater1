// ==UserScript==
// @name         YOUadblockerfree
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Removes Adblock Thing with Enhanced GUI
// @author       JoelMatic
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function() {
    const debugMessages = true;

    const adblockerCheckboxId = "youAdblockerfree-adblocker";
    const popupRemoverCheckboxId = "youAdblockerfree-popup-remover";
    const updateCheckCheckboxId = "youAdblockerfree-update-check";
    const guiId = "youAdblockerfree-gui";
    const guiName = "YOUadblockerfree";

    const guiStyle = `
        #${guiId} {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            background-color: #333;
            border: 2px solid #666;
            border-radius: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 20px;
            display: none;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        }
        #${guiId} label {
            display: block;
            margin-bottom: 15px;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
        }
        #${guiId} input {
            margin-right: 5px;
        }
        #${guiId}-close {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 20px;
            cursor: pointer;
        }
    `;

    const guiHTML = `
        <div id="${guiId}">
            <div id="${guiId}-close">&times;</div>
            <div style="font-size: 24px; font-weight: bold; color: #ff69b4; margin-bottom: 15px; opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;">${guiName}</div>
            <label style="opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;"><input type="checkbox" id="${adblockerCheckboxId}"> Enable Undetected Adblocker</label>
            <label style="opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;"><input type="checkbox" id="${popupRemoverCheckboxId}"> Enable Popup Remover</label>
            <label style="opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;"><input type="checkbox" id="${updateCheckCheckboxId}"> Enable Update Check</label>
        </div>
    `;

    const styleElement = document.createElement("style");
    styleElement.textContent = guiStyle;
    document.head.appendChild(styleElement);
    document.body.insertAdjacentHTML("beforeend", guiHTML);

    const gui = document.getElementById(guiId);
    const adblockerCheckbox = document.getElementById(adblockerCheckboxId);
    const popupRemoverCheckbox = document.getElementById(popupRemoverCheckboxId);
    const updateCheckCheckbox = document.getElementById(updateCheckCheckboxId);
    const guiCloseButton = document.getElementById(`${guiId}-close`);

    let unpausedAfterSkip = 0;
    let currentUrl = window.location.href;
    let isAdFound = false;
    let adLoop = 0;
    let hasIgnoredUpdate = false;

    if (debugMessages) console.log("YOUadblockerfree: Script started ");

    adblockerCheckbox.addEventListener("change", () => {
        if (adblockerCheckbox.checked) {
            removeAds();
        }
    });

    popupRemoverCheckbox.addEventListener("change", () => {
        if (popupRemoverCheckbox.checked) {
            popupRemover();
        }
    });

    updateCheckCheckbox.addEventListener("change", () => {
        if (updateCheckCheckbox.checked) {
            checkForUpdate();
        }
    });

    guiCloseButton.addEventListener("click", () => {
        gui.style.opacity = 0;
        setTimeout(() => {
            gui.style.display = "none";
        }, 500);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "F2") {
            if (gui.style.display === "none") {
                gui.style.display = "block";
                setTimeout(() => {
                    gui.style.opacity = 1;
                }, 50);
                animateGUIElements();
            } else {
                gui.style.opacity = 0;
                setTimeout(() => {
                    gui.style.display = "none";
                }, 500);
            }
        }
    });

    gui.addEventListener("mousedown", (e) => {
        if (e.target !== guiCloseButton) {
            dragElement(gui);
        }
    });

    function animateGUIElements() {
        const labels = gui.querySelectorAll("label");
        labels.forEach((label, index) => {
            setTimeout(() => {
                label.style.opacity = 1;
                label.style.transform = "translateY(0)";
            }, 100 * index);
        });

        const guiTitle = gui.querySelector("div[style*='font-size: 24px']");
        setTimeout(() => {
            guiTitle.style.opacity = 1;
            guiTitle.style.transform = "translateY(0)";
        }, 100 * labels.length);
    }

    function dragElement(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "-close")) {
            document.getElementById(elmnt.id + "-close").onmousedown = dragMouseDown;
        } else {
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function popupRemover() {
        setInterval(() => {
            const fullScreenButton = document.querySelector(".ytp-fullscreen-button");
            const modalOverlay = document.querySelector("tp-yt-iron-overlay-backdrop");
            const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
            const popupButton = document.getElementById("dismiss-button");

            const video1 = document.querySelector("#movie_player > video.html5-main-video");
            const video2 = document.querySelector("#movie_player > .html5-video-container > video");

            const bodyStyle = document.body.style;

            bodyStyle.setProperty('overflow-y', 'auto', 'important');

            if (modalOverlay) {
                modalOverlay.removeAttribute("opened");
                modalOverlay.remove();
            }

            if (popup) {
                if (debugMessages) console.log("YOUadblockerfree: Popup detected, removing...");

                if(popupButton) popupButton.click();

                popup.remove();
                unpausedAfterSkip = 2;

                fullScreenButton.dispatchEvent(mouseEvent);

                setTimeout(() => {
                  fullScreenButton.dispatchEvent(mouseEvent);
                }, 500);

                if (debugMessages) console.log("YOUadblockerfree: Popup removed");
            }

            if (!unpausedAfterSkip > 0) return;

            unPauseVideo(video1);
            unPauseVideo(video2);

        }, 1000);
    }

    function removeAds() {
        setInterval(() => {
            var videoPlayback;
            var video = document.querySelector('video');
            if(videoPlayback) videoPlayback = video.playbackRate;
            const ad = [...document.querySelectorAll('.ad-showing')][0];

            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                removePageAds();
            }

            if (ad) {
                isAdFound = true;
                adLoop = adLoop + 1;

                if(adLoop < 10){
                    const openAdCenterButton = document.querySelector('.ytp-ad-button-icon');
                    openAdCenterButton?.click();

                    var popupContainer = document.querySelector('body > ytd-app > ytd-popup-container > tp-yt-paper-dialog');

                    if (popupContainer) popupContainer.style.display = 'none';

                    const blockAdButton = document.querySelector('[label="Block ad"]');
                    blockAdButton?.click();

                    const blockAdButtonConfirm = document.querySelector('.Eddif [label="CONTINUE"] button');
                    blockAdButtonConfirm?.click();

                    const closeAdCenterButton = document.querySelector('.zBmRhe-Bz112c');
                    closeAdCenterButton?.click();

                    const hidebackdrop = document.querySelectorAll("tp-yt-iron-overlay-backdrop");
                    if (hidebackdrop) hidebackdrop.style.display = 'none';
                }
                else{
                    if (video) video.play();
                }

                const skipButtons = ['ytp-ad-skip-button-container', 'ytp-ad-skip-button-modern', '.videoAdUiSkipButton', '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', '.ytp-ad-skip-button' ];

                if (video){
                    video.playbackRate = 10;
                    video.volume = 0;

                    skipButtons.forEach(selector => {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0 && elements) {
                          elements.forEach(element => {
                            element?.click();
                          });
                        }
                    });
                    video.play();

                    let randomNumber = Math.random() * (0.5 - 0.1) + 0.1;
                    video.currentTime = video.duration + randomNumber || 0;
                }

                if (debugMessages) console.log("YOUadblockerfree: Found Ad");

            } else {
                if(video?.playbackRate == 10 && video){
                    video.playbackRate = videoPlayback;
                }

                if (isAdFound){
                    isAdFound = false;

                    if (videoPlayback == 10){
                        videoPlayback = 1;

                        var _opupContainer = document.querySelector('body > ytd-app > ytd-popup-container > tp-yt-paper-dialog');
                        const _idebackdrop = document.querySelector("body > tp-yt-iron-overlay-backdrop");

                        if (_opupContainer) _opupContainer.style.display = "block";
                        if (_idebackdrop) _idebackdrop.style.display = "block";
                    }

                    if(video) video.playbackRate = videoPlayback;

                    adLoop = 0;
                }
                else{
                    if(video) videoPlayback = video.playbackRate;
                }
            }

        }, 50);

        removePageAds();
    }

    function removePageAds() {
        const sponsor = document.querySelectorAll("div#player-ads.style-scope.ytd-watch-flexy, div#panels.style-scope.ytd-watch-flexy");
        const style = document.createElement('style');

        style.textContent = `
            ytd-action-companion-ad-renderer,
            ytd-display-ad-renderer,
            ytd-video-masthead-ad-advertiser-info-renderer,
            ytd-video-masthead-ad-primary-video-renderer,
            ytd-in-feed-ad-layout-renderer,
            ytd-ad-slot-renderer,
            yt-about-this-ad-renderer,
            yt-mealbar-promo-renderer,
            ytd-statement-banner-renderer,
            ytd-ad-slot-renderer,
            ytd-in-feed-ad-layout-renderer,
            ytd-banner-promo-renderer-background
            statement-banner-style-type-compact,
            .ytd-video-masthead-ad-v3-renderer,
            div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
            div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
            div#main-container.style-scope.ytd-promoted-video-renderer,
            div#player-ads.style-scope.ytd-watch-flexy,
            ad-slot-renderer,
            masthead-ad,
            #masthead-ad {
                display: none !important;
            }
        `;

        document.head.appendChild(style);

        sponsor?.forEach((element) => {
             if (element.getAttribute("id") === "rendering-content") {
                element.childNodes?.forEach((childElement) => {
                  if (childElement?.data.targetId && childElement?.data.targetId !=="engagement-panel-macro-markers-description-chapters"){
                      element.style.display = 'none';
                    }
                   });
            }
         });

         if (debugMessages) console.log("YOUadblockerfree: Removed page ads (✔️)");
    }

    function unPauseVideo(video) {
        if (!video) return;
        if (video.paused) {
            document.dispatchEvent(keyEvent);
            unpausedAfterSkip = 0;
            if (debugMessages) console.log("YOUadblockerfree: Unpaused video using 'k' key");
        } else if (unpausedAfterSkip > 0) unpausedAfterSkip--;
    }

    function checkForUpdate() {
        if (!(window.location.href.includes("youtube.com"))) {
            return;
        }

        if (hasIgnoredUpdate) {
            return;
        }

        const scriptUrl = 'https://raw.githubusercontent.com/AceMind1/YOuUpdater1/main/YOUadblockerfree.js';

        fetch(scriptUrl)
            .then(response => response.text())
            .then(data => {
                const match = data.match(/@version\s+(\d+\.\d+)/);
                if (match) {
                    const githubVersion = parseFloat(match[1]);
                    const currentVersion = parseFloat(GM_info.script.version);

                    if (githubVersion > currentVersion) {
                        console.log('YOUadblockerfree: A new version is available. Please update your script.');

                        var result = window.confirm("YOUadblockerfree: A new version is available. Please update your script.");

                        if (result) {
                            window.location.replace(scriptUrl);
                        }

                    } else {
                        console.log('YOUadblockerfree: You have the latest version of the script.');
                    }
                } else {
                    console.error('YOUadblockerfree: Unable to extract version from the GitHub script.');
                }
            })
            .catch(error => {
                hasIgnoredUpdate = true;
                console.error('YOUadblockerfree: Error checking for updates:', error);
            });
        hasIgnoredUpdate = true;
    }

    const keyEvent = new KeyboardEvent("keydown", {
        key: "k",
        code: "KeyK",
        keyCode: 75,
        which: 75,
        bubbles: true,
        cancelable: true,
        view: window
    });

    const mouseEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
    });
})();
