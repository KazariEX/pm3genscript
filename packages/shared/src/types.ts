export type ParamType = "byte" | "word" | "dword" | "pointer" | "number" | "string" | "symbol" | "command";

export interface MacroInfo {
    alias?: string[];
    description?: Partial<Record<"en" | "zh", string>>;
    example?: {
        content: string;
        description?: string;
    };
    hoisting?: boolean;
    redirect?: string;
    arguments: MacroArgumentInfo[];
}

export interface MacroArgumentInfo {
    name: string;
    enum?: any[];
    type?: ParamType | ParamType[];
    can?: {
        dynamic?: boolean;
        symbol?: boolean;
    };
}

export interface CommandInfo {
    value?: number;
    description?: Partial<Record<"en" | "zh", string>>;
    ending?: boolean;
    redirect?: string;
    bytes?: number;
    arguments?: CommandArgumentInfo[];
}

export interface CommandArgumentInfo {
    name: string;
    type?: ParamType;
    description?: string;
    when?: (params: any[]) => boolean;
}