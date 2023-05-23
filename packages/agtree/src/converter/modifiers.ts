import { Modifier } from '../parser/common';

export interface ModifierCompatibilityData {
    name: string;

    aliases: string[];

    docs: string;

    deprecated: boolean;

    deprecationMessage: string | null;

    conflicts: string[];

    inverseConflicts: string[];

    assignable: boolean;

    negatable: boolean;

    blockOnly: boolean;

    exceptionOnly: boolean;
}

export interface ModifierConverter {
    isModifierExist(modifier: string | Modifier): boolean;

    getCompatibilityData(modifier: string | Modifier): ModifierCompatibilityData;
}
