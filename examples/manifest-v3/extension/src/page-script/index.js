/* eslint-disable no-eval */
/* eslint-disable no-undef */

const messageType = 'runPayload';

/* async load of script src by listening custom event */
const messageHandler = document.addEventListener(messageType, (event) => {
    eval(event.detail);
    document.removeEventListener(messageType, messageHandler);
});

/* sync load of script src by reading injected div content */

const div = document.getElementById('page-script');
const data = div.getAttribute('data-payload');
eval(data);
