
const checkStreamInterval = 1500;
let liveInputUid = '';
let currentVideoUid = '';
let playerObj = null;

function hideAskUserForLiveInputUid() {
    let element = document.getElementById('live-input-uid-container');
    if (!element.classList.contains('hide')) {
        element.classList.add('hide');
    }
}

function removeStatus() {
    let statusLineElement = document.getElementById('status-line');
    if (!statusLineElement.classList.contains('hide')) {
        statusLineElement.classList.add('hide');
    }

    for (let child of statusLineElement.children) {
        if (!child.classList.contains('hide')) {
            child.classList.add('hide');
        }
    }
}

function removePlayer() {
    let rootElement = document.getElementById('player-embed');

    // Clear all child nodes
    while (rootElement.firstChild) {
        rootElement.removeChild(rootElement.lastChild);
    }

    currentVideoUid = null;
    playerObj = null;
}

function showStatus(statusId) {
    removeStatus();
    let statusLineElement = document.getElementById('status-line');

    // Find the status with the right id
    for (let child of statusLineElement.children) {
        if (child.id === 'stream-' + statusId) {
            // we have it !
            statusLineElement.classList.remove('hide');
            child.classList.remove('hide');

            return;
        }
    }
}

function createPlayerElement(videoUid) {
    let player = document.createElement('iframe');
    player.src = "https://iframe.videodelivery.net/" + videoUid;
    player.classList.add('embed-responsive-item');
    player.classList.add('player');
    player.allowFullscreen = true;
    player.allow = "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen";
    player.id = 'stream-player';
    return player;
}

function insertVideoForPlayInDocument(videoUid) {
    console.log('We are live! for video', videoUid);

    // Clear stuff
    removePlayer();
    removeStatus();

    // Create player
    let player = createPlayerElement(videoUid);

    // Insert the player
    let rootElement = document.getElementById('player-embed');
    rootElement.appendChild(player);

    // Set that we're currently playing that
    currentVideoUid = videoUid;

    // add the stream management
    playerObj = Stream(player);
    playerObj.addEventListener('play', () => {
        removeStatus();
    });
    playerObj.addEventListener('error', () => {
        showStatus('playback-failed');
        player.muted = true;
    });

    playerObj.play().catch(() => {
        showStatus('playback-failed');
        player.muted = true
        // TODO: restart the stream
    });
}

function handleNotLive() {
    removePlayer();
    showStatus('status-not-started');
}

function handleError(err) {
    // reset!
    liveInputUid = '';

    removePlayer();
    removeStatus();
    hideAskUserForLiveInputUid();
    showStatus('playback-failed');

    console.error('error', err);
}

function handleNoLiveInputUid() {
    removePlayer();
    removeStatus();

    let element = document.getElementById('live-input-uid-container');
    element.classList.remove('hide');

    document.getElementById('stream-live-uid-userinput').value = '';
}

function handleGoUidButtonClicked() {
    console.log('GO CLICKED');
    let inputUid = document.getElementById('stream-live-uid-userinput');
    if (inputUid.value === '') {
        // we need text
    } else {
        liveInputUid = inputUid.value;
        checkStream();
    }
}

function handleLifecycleJson(lifecycleObj) {
    if (!lifecycleObj.hasOwnProperty('isInput') || !lifecycleObj.isInput) {
        // BAIL
        liveInputUid = '';
        return;
    }

    hideAskUserForLiveInputUid();

    if (lifecycleObj.hasOwnProperty('live')
        && lifecycleObj.hasOwnProperty('videoUID')
        && lifecycleObj.live) {
        // Are we currently playing this video ?
        if (currentVideoUid !== lifecycleObj.videoUID) {
            // We are not playing the right video! fix this
            insertVideoForPlayInDocument(lifecycleObj.videoUID);
        } else {
            // We are currently playing the same video UID - maybe just make sure it's actually playing ?
        }
    } else {
        // Input isn't live...
        handleNotLive();
    }
}

function checkStream() {
    if (liveInputUid && liveInputUid !== '') {
        fetch("https://videodelivery.net/" + liveInputUid + "/lifecycle")
            .then(res => res.json())
            .then(out => handleLifecycleJson(out))
            .then(_ => setTimeout(checkStream, checkStreamInterval))
            .catch(err => handleError(err));
    } else {
        // no live input uid
        handleNoLiveInputUid();
    }
}

// Check if we have liveInputUid in the query param
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

if (params && params.hasOwnProperty('liveInputUid')) {
    // We might have something!
    let liveInputUidQueryParam = params.liveInputUid;
    if (liveInputUidQueryParam) {
        console.log('Using live input uid from the query parameters', liveInputUidQueryParam);
        liveInputUid = liveInputUidQueryParam;
    }
}

// Hook events to button
document.getElementById('stream-live-uid-go').addEventListener('click', handleGoUidButtonClicked);

setTimeout(checkStream, 100);