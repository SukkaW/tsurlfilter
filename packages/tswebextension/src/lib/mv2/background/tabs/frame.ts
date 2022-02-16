import { RequestContextStorage } from '../request';

export interface Injection {
    jsScriptText?: string;
    cssText?: string;
    extCssText?: string;
}

export interface FrameData {
    url: string;
    injection?: Injection;
}

export class Frame {
    url: string;

    injection: Injection | undefined;

    requests = new RequestContextStorage();

    constructor(data: FrameData) {
        this.url = data.url;
        this.injection = data.injection;
    }
}
