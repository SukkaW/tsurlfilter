import { NetworkRule, RequestType, logger } from '@adguard/tsurlfilter';
import browser, { ExtensionTypes, Tabs } from 'webextension-polyfill';
import { TabContext } from './tab-context';
import { Frame } from './frame';

import { EventChannel, EventChannelInterface } from '../../../common';
import { RequestContext } from '../request';

export interface TabsApiInterface {
    start: () => Promise<void>
    stop: () => void

    getTabContext: (tabId: number) => TabContext | undefined

    setTabFrameRule: (tabId: number, frameRule: NetworkRule) => void
    getTabFrameRule: (tabId: number) => NetworkRule | null

    setTabFrame: (tabId: number, frameId: number, frameData: Frame) => void
    getTabFrame: (tabId: number, frameId: number) => Frame | null
    getTabMainFrame: (tabId: number) => Frame | null
    recordFrameRequest: (requestContext: RequestContext) => void

    onCreate: EventChannelInterface<TabContext>
    onUpdate: EventChannelInterface<TabContext>
    onDelete: EventChannelInterface<TabContext>
}

export class TabsApi implements TabsApiInterface {
    // TODO: use global config context
    private verbose = false;

    private context = new Map<number, TabContext>();

    public onCreate = new EventChannel<TabContext>();

    public onUpdate = new EventChannel<TabContext>();

    public onDelete = new EventChannel<TabContext>();

    public onActivated = new EventChannel<TabContext>();

    constructor() {
        this.createTabContext = this.createTabContext.bind(this);
        this.updateTabContextData = this.updateTabContextData.bind(this);
        this.onTabActivated = this.onTabActivated.bind(this);
        this.deleteTabContext = this.deleteTabContext.bind(this);
        this.getTabContext = this.getTabContext.bind(this);
        this.setTabFrameRule = this.setTabFrameRule.bind(this);
        this.getTabFrameRule = this.getTabFrameRule.bind(this);
        this.setTabFrame = this.setTabFrame.bind(this);
        this.getTabFrame = this.getTabFrame.bind(this);
        this.getTabMainFrame = this.getTabMainFrame.bind(this);
        this.recordFrameRequest = this.recordFrameRequest.bind(this);

        this.logError = this.logError.bind(this);
    }

    public setVerbose(value: boolean): void {
        this.verbose = value;
    }

    public async start(): Promise<void> {
        await this.createCurrentTabsContext();

        browser.tabs.onCreated.addListener(this.createTabContext);
        browser.tabs.onRemoved.addListener(this.deleteTabContext);
        browser.tabs.onUpdated.addListener(this.updateTabContextData);
        browser.tabs.onActivated.addListener(this.onTabActivated);
    }

    public stop(): void {
        browser.tabs.onCreated.removeListener(this.createTabContext);
        browser.tabs.onRemoved.removeListener(this.deleteTabContext);
        browser.tabs.onUpdated.removeListener(this.updateTabContextData);
        browser.tabs.onActivated.removeListener(this.onTabActivated);
        this.context.clear();
    }

    public setTabFrameRule(tabId: number, frameRule: NetworkRule): void {
        const tabContext = this.context.get(tabId);

        if (tabContext) {
            tabContext.metadata.mainFrameRule = frameRule;
            this.onUpdate.dispatch(tabContext);
        }
    }

    public getTabFrameRule(tabId: number): NetworkRule | null {
        const tabContext = this.context.get(tabId);

        if (!tabContext) {
            return null;
        }

        const frameRule = tabContext.metadata.mainFrameRule;

        if (!frameRule) {
            return null;
        }

        return frameRule;
    }

    public setTabFrame(tabId: number, frameId: number, frameData: Frame): void {
        const tabContext = this.context.get(tabId);

        if (tabContext) {
            tabContext.frames.set(frameId, frameData);
            this.onUpdate.dispatch(tabContext);
        }
    }

    public getTabFrame(tabId: number, frameId: number): Frame | null {
        const tabContext = this.context.get(tabId);

        if (!tabContext) {
            return null;
        }

        const frame = tabContext.frames.get(frameId);

        if (!frame) {
            return null;
        }

        return frame;
    }

    public getTabMainFrame(tabId: number): Frame | null {
        return this.getTabFrame(tabId, 0);
    }

    public recordFrameRequest(requestContext: RequestContext): void {
        const {
            requestUrl,
            tabId,
            requestType,
            frameId,
        } = requestContext;

        const tabContext = this.context.get(tabId);

        if (!tabContext) {
            return;
        }

        if (requestType === RequestType.Document) {
            tabContext.setMainFrameByRequestContext(requestContext);
        } else {
            tabContext.frames.set(frameId, new Frame(requestUrl, requestContext));
        }
    }

    public getTabContext(tabId: number): TabContext | undefined {
        return this.context.get(tabId);
    }

    public updateTabBlockedRequestCount(tabId: number, increment: number): number | undefined {
        const tabContext = this.context.get(tabId);

        if (!tabContext) {
            return;
        }

        return tabContext.updateBlockedRequestCount(increment);
    }

    public updateTabMainFrameRule(tabId: number): void {
        const tabContext = this.context.get(tabId);

        if (!tabContext) {
            return;
        }

        tabContext.updateMainFrameRule();
    }

    public async updateCurrentTabsMainFrameRules(): Promise<void> {
        const currentTabs = await browser.tabs.query({});

        if (!Array.isArray(currentTabs)) {
            return;
        }

        for (const tab of currentTabs) {
            if (tab.id) {
                this.updateTabMainFrameRule(tab.id);
            }
        }
    }

    public isNewPopupTab(tabId: number): boolean {
        const tab = this.context.get(tabId);

        if (!tab) {
            return false;
        }

        const url = tab.info?.url;

        return url === undefined
            || url === ''
            || url === 'about:blank';
    }

    private createTabContext(tab: Tabs.Tab): void {
        if (typeof tab.id === 'number') {
            const tabContext = new TabContext(tab);
            this.context.set(tab.id, tabContext);
            this.onCreate.dispatch(tabContext);
        }
    }

    private deleteTabContext(tabId: number): void {
        const tabContext = this.context.get(tabId);
        if (tabContext) {
            this.context.delete(tabId);
            this.onDelete.dispatch(tabContext);
        }
    }

    private updateTabContextData(tabId: number, changeInfo: Tabs.OnUpdatedChangeInfoType): void {
        // TODO: we can ignore some events (favicon url update etc.)
        const tabContext = this.context.get(tabId);
        if (tabContext) {
            tabContext.updateTabInfo(changeInfo);
            this.onUpdate.dispatch(tabContext);
        }
    }

    private onTabActivated({ tabId }: Tabs.OnActivatedActiveInfoType): void {
        const tabContext = this.context.get(tabId);

        if (tabContext) {
            this.onActivated.dispatch(tabContext);
        }
    }

    private async createCurrentTabsContext(): Promise<void> {
        const currentTabs = await browser.tabs.query({});

        if (!Array.isArray(currentTabs)) {
            return;
        }

        for (let i = 0; i < currentTabs.length; i += 1) {
            this.createTabContext(currentTabs[i]);
        }
    }

    public injectScript(code: string, tabId: number, frameId?: number): void {
        const injectDetails = {
            code,
            frameId,
            runAt: 'document_start',
            matchAboutBlank: true,
        } as ExtensionTypes.InjectDetails;

        browser.tabs
            .executeScript(tabId, injectDetails)
            .catch(this.logError);
    }

    public injectCss(code: string, tabId: number, frameId?: number): void {
        const injectDetails = {
            code,
            frameId,
            runAt: 'document_start',
            matchAboutBlank: true,
            cssOrigin: 'user',
        } as ExtensionTypes.InjectDetails;

        browser.tabs
            .insertCSS(tabId, injectDetails)
            .catch(this.logError);
    }

    private logError(e: unknown): void {
        if (this.verbose) {
            logger.error(e instanceof Error ? e.message : JSON.stringify(e));
        }
    }
}

export const tabsApi = new TabsApi();
