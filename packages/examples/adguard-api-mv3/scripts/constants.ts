import path from "path";

export const BUILD_PATH = path.join(__dirname, "../build");

export const WEB_ACCESSIBLE_RESOURCES_PATH = path.join(__dirname, "../build/adguard");

export const BACKGROUND_PATH = path.join(__dirname, "../extension/pages/background");

export const CONTENT_SCRIPT = path.join(__dirname, "../extension/pages/content-script");

export const POPUP_PATH = path.join(__dirname, "../extension/pages/popup");

export const FILTERS_DIR = path.join(__dirname, "../extension/filters");
