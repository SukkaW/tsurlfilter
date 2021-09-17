/* eslint-disable no-eval */
/* eslint-disable no-undef */

const messageType = 'runPayload';

const messageHandler = document.addEventListener(messageType, (event) => {
    eval(event.detail);
    document.removeEventListener(messageType, messageHandler);
});
